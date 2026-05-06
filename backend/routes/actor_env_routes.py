"""
Actor Environment Variables Routes — Phase 5

Manages encrypted environment variables scoped per actor version.
Mirrors Apify's API: /acts/{id}/versions/{ver}/env-vars

Values are ALWAYS encrypted at rest.
Secret values are NEVER returned via API responses.

Endpoints:
  GET    /actors/{id}/versions/{ver}/env-vars           - List (no values for secrets)
  POST   /actors/{id}/versions/{ver}/env-vars           - Create or update
  GET    /actors/{id}/versions/{ver}/env-vars/{name}    - Get single (value shown if not secret)
  PUT    /actors/{id}/versions/{ver}/env-vars/{name}    - Update value
  DELETE /actors/{id}/versions/{ver}/env-vars/{name}    - Delete
"""

import logging
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from services.secrets_service import SecretsService

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request Models ────────────────────────────────────────────────────────────

class EnvVarCreate(BaseModel):
    name: str
    value: str
    is_secret: bool = False


class EnvVarUpdate(BaseModel):
    value: str
    is_secret: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _resolve_actor_and_version(db, actor_id: str, version_number: str, user: dict, request: Request):
    """Verify actor ownership and version existence."""
    from routes.utils import get_workspace_query
    workspace_query = get_workspace_query(user["id"], request)
    actor = await db.actors.find_one({"id": actor_id, **workspace_query}, {"_id": 0})
    if not actor:
        raise HTTPException(404, f"Actor '{actor_id}' not found")

    version = await db.actor_versions.find_one({
        "actor_id": actor_id, "version_number": version_number
    })
    if not version:
        raise HTTPException(404, f"Version {version_number} not found for actor {actor_id}")

    return actor, version


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/actors/{actor_id}/versions/{version_number}/env-vars")
async def list_env_vars(
    actor_id: str,
    version_number: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    List all environment variables for a specific actor version.
    Secret values are NEVER returned — only name, is_secret, and timestamps.
    """
    db = get_db()
    await _resolve_actor_and_version(db, actor_id, version_number, current_user, request)

    secrets = SecretsService(db)
    vars_list = await secrets.list_env_vars(actor_id, version_number)
    return {"env_vars": vars_list, "total": len(vars_list)}


@router.post("/actors/{actor_id}/versions/{version_number}/env-vars", status_code=201)
async def create_env_var(
    actor_id: str,
    version_number: str,
    data: EnvVarCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Create or update an environment variable for a specific actor version.
    The value is encrypted with AES-256 (Fernet) before storage.
    If is_secret=True, the value will NEVER be returned by the API.
    """
    db = get_db()
    await _resolve_actor_and_version(db, actor_id, version_number, current_user, request)

    if not data.name or not data.name.strip():
        raise HTTPException(400, "name cannot be empty")
    if not data.value:
        raise HTTPException(400, "value cannot be empty")

    secrets = SecretsService(db)
    result = await secrets.set_env_var(
        actor_id=actor_id,
        version_number=version_number,
        name=data.name,
        value=data.value,
        is_secret=data.is_secret,
    )
    return result


@router.get("/actors/{actor_id}/versions/{version_number}/env-vars/{name}")
async def get_env_var(
    actor_id: str,
    version_number: str,
    name: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a single environment variable.
    If is_secret=True, the value is masked — only metadata is returned.
    """
    db = get_db()
    await _resolve_actor_and_version(db, actor_id, version_number, current_user, request)

    secrets = SecretsService(db)
    var = await secrets.get_env_var_meta(actor_id, version_number, name)
    if not var:
        raise HTTPException(404, f"Env var '{name.upper()}' not found")
    return var


@router.put("/actors/{actor_id}/versions/{version_number}/env-vars/{name}")
async def update_env_var(
    actor_id: str,
    version_number: str,
    name: str,
    data: EnvVarUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Update the value (and optionally is_secret flag) of an existing env var."""
    db = get_db()
    await _resolve_actor_and_version(db, actor_id, version_number, current_user, request)

    secrets = SecretsService(db)

    # Get current metadata to preserve is_secret if not provided
    current = await secrets.get_env_var_meta(actor_id, version_number, name)
    if not current:
        raise HTTPException(404, f"Env var '{name.upper()}' not found")

    is_secret = data.is_secret if data.is_secret is not None else current.get("is_secret", False)

    result = await secrets.set_env_var(
        actor_id=actor_id,
        version_number=version_number,
        name=name,
        value=data.value,
        is_secret=is_secret,
    )
    return result


@router.delete("/actors/{actor_id}/versions/{version_number}/env-vars/{name}", status_code=204)
async def delete_env_var(
    actor_id: str,
    version_number: str,
    name: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Delete an environment variable."""
    db = get_db()
    await _resolve_actor_and_version(db, actor_id, version_number, current_user, request)

    secrets = SecretsService(db)
    deleted = await secrets.delete_env_var(actor_id, version_number, name)
    if not deleted:
        raise HTTPException(404, f"Env var '{name.upper()}' not found")
    return None
