"""
API Keys Routes — Full CRUD with scopes, expiry, multiple keys per user.

Endpoints:
  POST   /api/auth/api-keys           Create key → returns raw key ONCE
  GET    /api/auth/api-keys           List keys (never returns full key)
  GET    /api/auth/api-keys/scopes    List all valid scopes
  PATCH  /api/auth/api-keys/{id}      Update name / scopes / is_active
  DELETE /api/auth/api-keys/{id}      Revoke key
  POST   /api/auth/api-keys/{id}/rotate  Rotate (invalidate old, issue new)
  GET    /api/auth/api-keys/{id}/verify  Verify a key is valid (for external tools)
  WebSocket /ws/api-keys/{id}/timer   30-second reveal countdown
"""

import asyncio
import hashlib
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models.api_key import ApiKey, ApiKeyCreate, ApiKeyDisplay, ApiKeyUpdate, VALID_SCOPES

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Rotate request body ───────────────────────────────────────────────────────
class RotateRequest(BaseModel):
    keep_active_for_hours: int = 0  # 0 = deactivate immediately, 24 = keep old key for 24h

# ── Local dual-auth dependency (avoids circular import with dependencies.py) ───
# Accepts both JWT tokens and scrapi_api_* API keys as Bearer tokens.
async def _get_user(credentials = Depends(__import__('fastapi.security', fromlist=['HTTPBearer']).HTTPBearer())):
    from auth import get_current_user
    token = credentials.credentials
    if token.startswith("scrapi_api_"):
        # API key path
        db = get_db()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        key_doc = await db.api_keys.find_one({"key_hash": token_hash})
        if not key_doc or not key_doc.get("is_active", True):
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid or revoked API key.")
        user = await db.users.find_one({"id": key_doc["user_id"]})
        if not user:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="User not found.")
        return {"id": user["id"], "username": user.get("username"), "role": user.get("role", "user")}
    else:
        return await get_current_user(credentials)

# ── In-process temp store for 30-second key reveal (single-instance safe) ─────

MAX_KEYS_PER_USER = 10


# ── Helpers ────────────────────────────────────────────────────────────────────

def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _is_expired(key_doc: dict) -> bool:
    exp = key_doc.get("expires_at")
    if not exp:
        return False
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > exp


def _to_display(k: dict) -> ApiKeyDisplay:
    for field in ("created_at", "last_used_at", "expires_at"):
        if isinstance(k.get(field), str):
            try:
                k[field] = datetime.fromisoformat(k[field])
            except Exception:
                k[field] = None


    return ApiKeyDisplay(
        id=k["id"],
        name=k["name"],
        organization_id=k.get("organization_id"),
        prefix=k["prefix"],
        full_key=k.get("raw_key"),           # always returned — user can view/copy anytime
        scopes=k.get("scopes", VALID_SCOPES),
        expires_at=k.get("expires_at"),
        last_used_at=k.get("last_used_at"),
        usage_count=k.get("usage_count", 0),
        is_active=k.get("is_active", True),
        created_at=k["created_at"],
        has_active_timer=False,              # no longer needed — key always visible
        is_expired=_is_expired(k),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/scopes")
async def list_scopes():
    """Return all supported API key scopes."""
    return {
        "scopes": VALID_SCOPES,
        "descriptions": {
            "runs:read":       "View runs and their status",
            "runs:write":      "Create and abort runs",
            "actors:read":     "View actors",
            "actors:write":    "Create, edit, and delete actors",
            "datasets:read":   "Read dataset results",
            "datasets:write":  "Write to datasets",
            "storage:read":    "Read KV Store and Request Queue data",
            "storage:write":   "Write to KV Store and Request Queue",
            "webhooks:read":   "View webhook configurations",
            "webhooks:write":  "Create and manage webhooks",
            "pipelines:read":  "View pipelines",
            "pipelines:write": "Create and manage pipelines",
        }
    }


@router.post("", status_code=201)
async def create_api_key(
    request: Request,
    body: ApiKeyCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new API key.
    Returns the raw key ONCE — it cannot be retrieved again.
    Each user can have up to 10 active keys.
    """
    db = get_db()

    # ── Validate scopes ───────────────────────────────────────────────────────
    invalid = [s for s in body.scopes if s not in VALID_SCOPES]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scopes: {invalid}. Valid scopes: {VALID_SCOPES}",
        )

    # ── Enforce per-user/workspace key limit ──────────────────────────────────
    workspace_type = getattr(request.state, "workspace_type", "personal")
    workspace_id = getattr(request.state, "workspace_id", "")
    organization_id = workspace_id if workspace_type == "organization" else None

    # Limit check based on current workspace
    query = {"user_id": current_user["id"], "is_active": True}
    if organization_id:
        query["organization_id"] = organization_id
    else:
        query["organization_id"] = None

    count = await db.api_keys.count_documents(query)
    if count >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_KEYS_PER_USER} active API keys per workspace. Please revoke an existing key first.",
        )

    # ── Generate key ──────────────────────────────────────────────────────────
    raw_key = f"scrapi_api_{secrets.token_urlsafe(32)}"
    key_hash = _hash_key(raw_key)
    prefix = raw_key[:20] + "..."

    # ── Compute expiry ────────────────────────────────────────────────────────
    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)

    api_key = ApiKey(
        user_id=current_user["id"],
        organization_id=organization_id,     # Added organization context
        name=body.name,
        key_hash=key_hash,
        raw_key=raw_key,                     # stored so user can always view/copy
        prefix=prefix,
        scopes=body.scopes,
        expires_at=expires_at,
    )

    doc = api_key.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    if doc.get("expires_at"):
        doc["expires_at"] = doc["expires_at"].isoformat()

    await db.api_keys.insert_one(doc)

    logger.info(f"API key created: {api_key.id} for user {current_user['id']} scopes={body.scopes}")

    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,
        "prefix": prefix,
        "scopes": body.scopes,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "created_at": doc["created_at"],
    }


@router.get("", response_model=List[ApiKeyDisplay])
async def list_api_keys(
    request: Request,
    include_expired: bool = Query(False),
    current_user: dict = Depends(_get_user),
):
    """List all API keys for the current user in the active workspace."""
    db = get_db()
    from routes.utils import get_workspace_query

    # Isolate keys by workspace (Personal vs Organization)
    query = get_workspace_query(current_user["id"], request)
    if not include_expired:
        query["is_active"] = True

    keys = await db.api_keys.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [_to_display(k) for k in keys]


@router.patch("/{key_id}")
async def update_api_key(
    request: Request,
    key_id: str,
    body: ApiKeyUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update API key name, scopes, or active status."""
    db = get_db()

    if body.scopes is not None:
        invalid = [s for s in body.scopes if s not in VALID_SCOPES]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid scopes: {invalid}")

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.scopes is not None:
        updates["scopes"] = body.scopes
    if body.is_active is not None:
        updates["is_active"] = body.is_active

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    from routes.utils import get_workspace_query
    query = get_workspace_query(current_user["id"], request)
    query["id"] = key_id

    result = await db.api_keys.find_one_and_update(
        query,
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="API key not found.")
    result.pop("_id", None)
    result.pop("key_hash", None)
    return _to_display(result)


@router.delete("/{key_id}")
async def delete_api_key(
    request: Request,
    key_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Permanently revoke an API key."""
    db = get_db()
    from routes.utils import get_workspace_query
    query = get_workspace_query(current_user["id"], request)
    query["id"] = key_id

    result = await db.api_keys.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found.")
    return {"success": True, "message": "API key revoked."}


@router.post("/{key_id}/rotate", status_code=201)
async def rotate_api_key(
    request: Request,
    key_id: str,
    body: RotateRequest = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Rotate an API key: issue a new one with the same name, scopes, and expiry.
    If keep_active_for_hours > 0, the old key remains valid for that many hours
    (useful for zero-downtime secret rotation).
    """
    if body is None:
        body = RotateRequest()
    db = get_db()
    from routes.utils import get_workspace_query
    query = get_workspace_query(current_user["id"], request)
    query["id"] = key_id

    old = await db.api_keys.find_one(query)
    if not old:
        raise HTTPException(status_code=404, detail="API key not found.")

    # Deactivate or schedule expiry of old key
    if body.keep_active_for_hours and body.keep_active_for_hours > 0:
        grace_expires = (datetime.now(timezone.utc) + timedelta(hours=body.keep_active_for_hours)).isoformat()
        await db.api_keys.update_one(
            {"id": key_id},
            {"$set": {"expires_at": grace_expires, "name": old.get("name", "Key") + " (rotating)"}}
        )
        logger.info(f"Old API key {key_id} kept active for {body.keep_active_for_hours}h grace period")
    else:
        await db.api_keys.update_one({"id": key_id}, {"$set": {"is_active": False}})


    # Issue new key with same metadata
    raw_key = f"scrapi_api_{secrets.token_urlsafe(32)}"
    key_hash = _hash_key(raw_key)
    prefix = raw_key[:20] + "..."

    new_key = ApiKey(
        user_id=current_user["id"],
        name=old.get("name", "Rotated Key").replace(" (rotating)", ""),
        key_hash=key_hash,
        raw_key=raw_key,                         # stored so user can always view/copy
        prefix=prefix,
        scopes=old.get("scopes", VALID_SCOPES),
        expires_at=old.get("expires_at"),
    )
    doc = new_key.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    if doc.get("expires_at"):
        doc["expires_at"] = doc["expires_at"].isoformat() if not isinstance(doc["expires_at"], str) else doc["expires_at"]

    await db.api_keys.insert_one(doc)

    logger.info(f"API key rotated: {key_id} → {new_key.id} (keep_active={body.keep_active_for_hours}h)")
    return {
        "id": new_key.id,
        "name": new_key.name,
        "key": raw_key,
        "prefix": prefix,
        "scopes": new_key.scopes,
        "expires_at": doc.get("expires_at"),
        "created_at": doc["created_at"],
        "rotated_from": key_id,
    }


@router.get("/{key_id}/verify")
async def verify_key_status(
    key_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Check if an API key is valid (not revoked or expired)."""
    db = get_db()
    key = await db.api_keys.find_one(
        {"id": key_id, "user_id": current_user["id"]}, {"_id": 0, "key_hash": 0}
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found.")

    expired = _is_expired(key)
    return {
        "id": key["id"],
        "name": key["name"],
        "is_active": key.get("is_active", True),
        "is_expired": expired,
        "is_valid": key.get("is_active", True) and not expired,
        "scopes": key.get("scopes", []),
        "usage_count": key.get("usage_count", 0),
        "last_used_at": key.get("last_used_at"),
        "expires_at": key.get("expires_at"),
    }


