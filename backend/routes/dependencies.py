
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import hashlib
import logging

from database import get_db
from auth import get_current_user

logger = logging.getLogger(__name__)

api_key_security = HTTPBearer(auto_error=False)


def _check_key_expired(key_doc: dict) -> bool:
    """Return True if the key has an expiry and it has passed."""
    exp = key_doc.get("expires_at")
    if not exp:
        return False
    if isinstance(exp, str):
        try:
            exp = datetime.fromisoformat(exp)
        except Exception:
            return False
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > exp


async def _resolve_api_key_token(token: str, db, request: Request) -> dict:
    """
    Shared logic: given a raw scrapi_api_* token string, verify and
    return the authenticated user dict (with _api_key_scopes attached).
    """
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    key_doc = await db.api_keys.find_one({"key_hash": token_hash})

    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid API key.")
    if not key_doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="API key has been revoked.")
    if _check_key_expired(key_doc):
        raise HTTPException(status_code=401, detail="API key has expired.")

    # Fire-and-forget usage tracking
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.api_keys.update_one(
            {"id": key_doc["id"]},
            {"$set": {"last_used_at": now_iso}, "$inc": {"usage_count": 1}},
        )
    except Exception as e:
        logger.warning(f"Failed to update API key usage stats: {e}")

    user = await db.users.find_one({"id": key_doc["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User associated with API key not found.")

    # ── Populate request state with workspace context (Phase 4.3) ─────────────
    org_id = key_doc.get("organization_id")
    if org_id:
        request.state.workspace_type = "organization"
        request.state.workspace_id = org_id
    else:
        request.state.workspace_type = "personal"
        request.state.workspace_id = user["id"]

    return {
        "id": user["id"],
        "username": user.get("username"),
        "role": user.get("role", "user"),
        "plan": user.get("plan", "Free"),
        "_api_key_scopes": key_doc.get("scopes", []),
        "_api_key_id": key_doc["id"],
    }


async def get_api_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(api_key_security),
):
    """
    Authenticate via:
      1. X-API-Key: scrapi_api_xxx  header  (per Phase 4 plan — external tools / CLIs)
      2. Authorization: Bearer scrapi_api_xxx  (API key as Bearer token)
      3. Authorization: Bearer <jwt>  (session auth)
    """
    db = get_db()

    # ── 1. X-API-Key header (plan-specified external tool auth) ───────────────
    x_api_key = request.headers.get("X-API-Key")
    if x_api_key:
        if not x_api_key.startswith("scrapi_api_"):
            raise HTTPException(status_code=401, detail="X-API-Key must be a valid scrapi_api_* token.")
        return await _resolve_api_key_token(x_api_key, db, request)

    # ── 2 & 3. Bearer token (API key or JWT) ──────────────────────────────────
    if credentials:
        token = credentials.credentials
        if token.startswith("scrapi_api_"):
            return await _resolve_api_key_token(token, db, request)

        # ── JWT ───────────────────────────────────────────────────────────────
        return await get_current_user(credentials)

    # ── No credentials found ──────────────────────────────────────────────────
    raise HTTPException(status_code=401, detail="Authentication required.")


def require_scope(scope: str):
    """
    FastAPI dependency factory — enforce that the API key has a specific scope.
    Usage:  Depends(require_scope("runs:write"))

    If the request uses JWT (no _api_key_scopes), the check is skipped
    (JWT = full access, like Apify's own session tokens).
    """
    async def _check(current_user: dict = Depends(get_api_user)):
        api_key_scopes = current_user.get("_api_key_scopes")
        if api_key_scopes is not None and scope not in api_key_scopes:
            raise HTTPException(
                status_code=403,
                detail=f"API key missing required scope: '{scope}'.",
            )
        return current_user
    return _check


async def check_owner_role(credentials: HTTPAuthorizationCredentials = Depends(api_key_security)):
    """Check if user has owner role."""
    user = await get_api_user(credentials)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can perform this action")
    return user


async def check_admin_or_owner_role(credentials: HTTPAuthorizationCredentials = Depends(api_key_security)):
    """Check if user has admin or owner role."""
    user = await get_api_user(credentials)
    if user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin or owner access required")
    return user
