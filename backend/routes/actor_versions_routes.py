"""
Actor Versions & Builds Routes — Phase 5

Endpoints mirroring Apify's versioning + build API:
  Version management:
    GET    /actors/{id}/versions                      - List all versions
    POST   /actors/{id}/versions                      - Create version
    GET    /actors/{id}/versions/{ver}                - Get version detail
    PUT    /actors/{id}/versions/{ver}                - Update version
    DELETE /actors/{id}/versions/{ver}                - Delete version

  Build management (CI/CD entry points):
    POST   /actors/{id}/builds                        - Trigger build (with ?version=&tag=&wait_for_finish=)
    GET    /actors/{id}/builds                        - List builds
    GET    /actors/{id}/builds/{build_id}             - Get build + live log (with ?wait_for_finish=)
    POST   /actors/{id}/builds/{build_id}/abort       - Abort running build
"""

import asyncio
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth import get_current_user
from database import get_db
from models.actor_version import (
    ActorBuild,
    ActorVersion,
    ActorVersionCreate,
    ActorVersionUpdate,
    BUILD_STATUS_ABORTED,
    BUILD_STATUS_READY,
    TERMINAL_BUILD_STATUSES,
)
from routes.dependencies import get_api_user
from routes.utils import get_workspace_query

logger = logging.getLogger(__name__)

router = APIRouter()

VERSION_RE = re.compile(r"^\d+\.\d+$")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    """Convert datetime objects to ISO strings for JSON serialization."""
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    doc.pop("_id", None)
    return doc


async def _resolve_actor(db, actor_id: str, user: dict, request: Request) -> dict:
    """Fetch actor and verify ownership."""
    from routes.utils import get_workspace_query
    workspace_query = get_workspace_query(user["id"], request)
    actor = await db.actors.find_one({"id": actor_id, **workspace_query}, {"_id": 0})
    if not actor:
        raise HTTPException(404, f"Actor '{actor_id}' not found")
    return actor


async def _poll_build(db, build_id: str, wait_secs: int) -> dict:
    """Poll build until terminal status or timeout."""
    deadline = datetime.now(timezone.utc).timestamp() + wait_secs
    while datetime.now(timezone.utc).timestamp() < deadline:
        build = await db.actor_builds.find_one({"id": build_id}, {"_id": 0})
        if not build:
            break
        if build.get("status") in TERMINAL_BUILD_STATUSES:
            return build
        await asyncio.sleep(1)
    return await db.actor_builds.find_one({"id": build_id}, {"_id": 0}) or {}


# ══════════════════════════════════════════════════════════════════════════════
# VERSION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/actors/{actor_id}/versions")
async def list_versions(
    actor_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """List all versions for an actor, newest first."""
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    versions = await db.actor_versions.find(
        {"actor_id": actor_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Enrich with build count
    for v in versions:
        v["build_count"] = await db.actor_builds.count_documents({"version_id": v["id"]})
        _serialize(v)

    return {"versions": versions, "total": len(versions)}


@router.post("/actors/{actor_id}/versions", status_code=201)
async def create_version(
    actor_id: str,
    data: ActorVersionCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new version for an actor.
    Does NOT trigger a build — use POST /actors/{id}/builds to build.
    """
    db = get_db()
    actor = await _resolve_actor(db, actor_id, current_user, request)

    # Validate version_number format
    if not VERSION_RE.match(data.version_number):
        raise HTTPException(400, "version_number must be MAJOR.MINOR format (e.g. '1.0', '2.1')")

    # Check for duplicate
    existing = await db.actor_versions.find_one({
        "actor_id": actor_id, "version_number": data.version_number
    })
    if existing:
        raise HTTPException(409, f"Version {data.version_number} already exists for this actor")

    # Auto-populate source code from actor.code if not provided (migration helper)
    source_code = data.source_code
    if source_code is None and actor.get("code"):
        source_code = actor["code"]
        logger.info(f"Auto-populated source_code from actor.code for actor {actor_id}")

    # Auto-populate input schema from actor if not provided
    input_schema = data.input_schema
    if not input_schema and actor.get("input_schema"):
        input_schema = actor["input_schema"]

    version = ActorVersion(
        actor_id=actor_id,
        version_number=data.version_number,
        source_code=source_code,
        input_schema=input_schema,
        build_tag=data.build_tag,
        readme=data.readme or actor.get("readme"),
        created_by=current_user["id"],
    )

    doc = version.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.actor_versions.insert_one(doc)

    # Update actor's latest version number
    await db.actors.update_one(
        {"id": actor_id},
        {"$set": {"latest_version_number": data.version_number, "updated_at": doc["updated_at"]}}
    )

    doc.pop("_id", None)
    return doc


@router.get("/actors/{actor_id}/versions/{version_number}")
async def get_version(
    actor_id: str,
    version_number: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific version with its builds."""
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    version = await db.actor_versions.find_one(
        {"actor_id": actor_id, "version_number": version_number}, {"_id": 0}
    )
    if not version:
        raise HTTPException(404, f"Version {version_number} not found")

    # Include recent builds
    builds = await db.actor_builds.find(
        {"version_id": version["id"]}, {"_id": 0, "source_code_snapshot": 0}
    ).sort("created_at", -1).to_list(10)

    _serialize(version)
    return {**version, "recent_builds": [_serialize(b) for b in builds]}


@router.put("/actors/{actor_id}/versions/{version_number}")
async def update_version(
    actor_id: str,
    version_number: str,
    data: ActorVersionUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Update version source code, schema, or readme. Does NOT trigger a new build."""
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    version = await db.actor_versions.find_one({
        "actor_id": actor_id, "version_number": version_number
    })
    if not version:
        raise HTTPException(404, f"Version {version_number} not found")

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.source_code is not None:
        updates["source_code"] = data.source_code
    if data.input_schema is not None:
        updates["input_schema"] = data.input_schema
    if data.readme is not None:
        updates["readme"] = data.readme
    if data.build_tag is not None:
        updates["build_tag"] = data.build_tag

    await db.actor_versions.update_one(
        {"actor_id": actor_id, "version_number": version_number},
        {"$set": updates}
    )

    updated = await db.actor_versions.find_one(
        {"actor_id": actor_id, "version_number": version_number}, {"_id": 0}
    )
    return _serialize(updated)


@router.delete("/actors/{actor_id}/versions/{version_number}", status_code=204)
async def delete_version(
    actor_id: str,
    version_number: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Delete a version. Not allowed if the version has builds."""
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    version = await db.actor_versions.find_one({
        "actor_id": actor_id, "version_number": version_number
    })
    if not version:
        raise HTTPException(404, f"Version {version_number} not found")

    build_count = await db.actor_builds.count_documents({"version_id": version["id"]})
    if build_count > 0:
        raise HTTPException(
            409,
            f"Cannot delete version {version_number}: it has {build_count} build(s). "
            "Delete all builds first."
        )

    await db.actor_versions.delete_one({"id": version["id"]})
    return None


# ══════════════════════════════════════════════════════════════════════════════
# BUILD ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/actors/{actor_id}/builds", status_code=201)
async def trigger_build(
    actor_id: str,
    request: Request,
    version: str = Query(..., description="Version number to build (e.g. '1.0')"),
    tag: str = Query("latest", description="Build tag to apply on success"),
    wait_for_finish: int = Query(
        0, alias="waitForFinish", ge=0, le=60,
        description="Seconds to wait for build completion (0 = async, max 60)"
    ),
    current_user: dict = Depends(get_api_user),  # Accepts JWT AND X-API-Key
):
    """
    Trigger a build for a specific version.
    This is the CI/CD entry point — mirrors Apify's POST /acts/{id}/builds.

    Query params:
      version=1.0        — version number to build
      tag=latest         — build tag to apply (default: latest)
      waitForFinish=0    — seconds to poll before returning (0 = immediate async response)
    """
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    # Resolve version
    version_doc = await db.actor_versions.find_one({
        "actor_id": actor_id, "version_number": version
    })
    if not version_doc:
        raise HTTPException(404, f"Version {version} not found for actor {actor_id}. Create it first with POST /actors/{actor_id}/versions")

    # Update build_tag if different
    if version_doc.get("build_tag") != tag:
        await db.actor_versions.update_one(
            {"id": version_doc["id"]},
            {"$set": {"build_tag": tag, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    # Create the build document (status: READY)
    build = ActorBuild(
        actor_id=actor_id,
        version_id=version_doc["id"],
        version_number=version,
        build_number=f"{version}.0",   # placeholder — worker will assign real number
        patch_number=0,
    )

    build_doc = build.model_dump()
    build_doc["created_at"] = build_doc["created_at"].isoformat()
    await db.actor_builds.insert_one(build_doc)

    # Launch Celery build task
    from workers.build_worker import run_build_task
    run_build_task.apply_async(
        kwargs={
            "build_id": build.id,
            "actor_id": actor_id,
            "version_id": version_doc["id"],
            "user_id": current_user["id"],
        },
        queue="builds",
    )

    logger.info(f"Build triggered: {build.id} for actor {actor_id} v{version} tag={tag}")

    # If wait_for_finish requested, poll up to that many seconds
    if wait_for_finish > 0:
        result = await _poll_build(db, build.id, wait_for_finish)
        result.pop("_id", None)
        return result

    build_doc.pop("_id", None)
    return build_doc


@router.get("/actors/{actor_id}/builds")
async def list_builds(
    actor_id: str,
    request: Request,
    version: Optional[str] = Query(None, description="Filter by version number"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List all builds for an actor, newest first."""
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    query: dict = {"actor_id": actor_id}
    if version:
        query["version_number"] = version
    if status:
        query["status"] = status.upper()

    builds = await db.actor_builds.find(
        query, {"_id": 0, "source_code_snapshot": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    return {
        "builds": [_serialize(b) for b in builds],
        "total": len(builds),
    }


@router.get("/actors/{actor_id}/builds/{build_id}")
async def get_build(
    actor_id: str,
    build_id: str,
    request: Request,
    wait_for_finish: int = Query(
        0, alias="waitForFinish", ge=0, le=60,
        description="Seconds to wait for build completion (for CI polling)"
    ),
    current_user: dict = Depends(get_api_user),
):
    """
    Get build details including live build_log.
    Use ?waitForFinish=30 for CI polling — mirrors Apify's GET /actor-builds/{id}?waitForFinish=60
    """
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    if wait_for_finish > 0:
        build = await _poll_build(db, build_id, wait_for_finish)
    else:
        build = await db.actor_builds.find_one(
            {"id": build_id, "actor_id": actor_id}, {"_id": 0}
        )

    if not build:
        raise HTTPException(404, f"Build {build_id} not found")

    # Don't return the large source snapshot in list views
    build.pop("source_code_snapshot", None)
    return _serialize(build)


@router.post("/actors/{actor_id}/builds/{build_id}/abort")
async def abort_build(
    actor_id: str,
    build_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Abort a running build."""
    db = get_db()
    await _resolve_actor(db, actor_id, current_user, request)

    build = await db.actor_builds.find_one({"id": build_id, "actor_id": actor_id})
    if not build:
        raise HTTPException(404, f"Build {build_id} not found")

    if build.get("status") in TERMINAL_BUILD_STATUSES:
        raise HTTPException(400, f"Build is already in terminal state: {build['status']}")

    now = datetime.now(timezone.utc).isoformat()
    await db.actor_builds.update_one(
        {"id": build_id},
        {
            "$set": {"status": BUILD_STATUS_ABORTED, "finished_at": now},
            "$push": {"build_log": f"[{now}] ⚠️  Build aborted by user {current_user.get('username', current_user['id'])}"}
        }
    )

    # Dispatch abort webhook
    try:
        from services.webhook_service import WebhookService
        aborted_build = await db.actor_builds.find_one({"id": build_id}, {"_id": 0}) or {}
        await WebhookService(db).dispatch_build_event(
            "actor.build.aborted", build_id, actor_id, current_user["id"], aborted_build
        )
    except Exception as e:
        logger.warning(f"Webhook dispatch failed on build abort: {e}")

    return {"message": f"Build {build_id} aborted", "status": "ABORTED"}
