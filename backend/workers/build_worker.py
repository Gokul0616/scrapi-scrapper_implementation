"""
Build Worker — Phase 5: Actor Build Pipeline

Celery task that executes the actor build pipeline:
  1. Syntax check (ast.parse)
  2. Security scan (banned patterns)
  3. Input schema validation (jsonschema)
  4. Snapshot locking
  5. Build number assignment
  6. Tag auto-apply
  7. Webhook event dispatch (actor.build.succeeded / actor.build.failed)

Mirrors Apify's build system without Docker — Docker integration planned for Phase 11.
"""

import ast
import asyncio
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from typing import Optional

# Ensure backend root is in sys.path for Celery child processes
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery_app import celery_app

logger = logging.getLogger(__name__)

# ── Security scan — banned patterns ──────────────────────────────────────────
BANNED_PATTERNS = [
    r"\bos\.system\s*\(",
    r"\bsubprocess\.(?:call|run|Popen|check_output|check_call)\s*\(",
    r"\beval\s*\(",
    r"\bexec\s*\(",
    r"\b__import__\s*\(",
    r"\bopen\s*\(.*['\"]w['\"]",   # file write attempts
    r"\bshutil\.rmtree\s*\(",
]

COMPILED_BANS = [re.compile(p) for p in BANNED_PATTERNS]


# ── Live log helper ───────────────────────────────────────────────────────────

async def _log(db, build_id: str, message: str):
    """Append a timestamped log line to the build document in real time."""
    line = f"[{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]}Z] {message}"
    await db.actor_builds.update_one(
        {"id": build_id},
        {"$push": {"build_log": line}}
    )
    logger.info(f"Build {build_id}: {message}")


async def _set_status(db, build_id: str, status: str, extra: Optional[dict] = None):
    """Update build status in MongoDB."""
    update = {"status": status}
    if extra:
        update.update(extra)
    await db.actor_builds.update_one({"id": build_id}, {"$set": update})


# ── Core build pipeline ───────────────────────────────────────────────────────

async def _run_build(build_id: str, actor_id: str, version_id: str, user_id: str):
    """
    Full async build pipeline. Runs inside Celery worker via asyncio.run().
    """
    from motor.motor_asyncio import AsyncIOMotorClient

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "scrapi")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    started_at = datetime.now(timezone.utc)
    success = False

    try:
        # ── Step 0: Set RUNNING ───────────────────────────────────────────────
        await _set_status(db, build_id, "RUNNING", {"started_at": started_at.isoformat()})

        # Fetch build and version documents
        build = await db.actor_builds.find_one({"id": build_id})
        version = await db.actor_versions.find_one({"id": version_id})

        if not build or not version:
            raise RuntimeError(f"Build {build_id} or version {version_id} not found")

        version_number = version.get("version_number", "0.1")
        source_code = version.get("source_code") or ""

        await _log(db, build_id, f"🔨 Build started for actor version {version_number}")
        await _log(db, build_id, f"   Source type: {version.get('source_type', 'SOURCE_FILES')}")
        await _log(db, build_id, f"   Source lines: {len(source_code.splitlines())}")

        # ── Step 1: Abort check ───────────────────────────────────────────────
        current = await db.actor_builds.find_one({"id": build_id}, {"status": 1})
        if current and current.get("status") == "ABORTED":
            await _log(db, build_id, "⚠️  Build aborted before starting")
            return

        # ── Step 2: Syntax Check ──────────────────────────────────────────────
        await _log(db, build_id, "")
        await _log(db, build_id, "📋 Step 1/4 — Syntax check")

        if source_code.strip():
            try:
                ast.parse(source_code)
                await _log(db, build_id, "   ✅ Syntax check passed")
            except SyntaxError as e:
                await _log(db, build_id, f"   ❌ SyntaxError at line {e.lineno}: {e.msg}")
                await _log(db, build_id, f"      >>> {e.text or ''}")
                await _set_status(db, build_id, "FAILED", {
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "stats": {"error": "syntax_error", "error_line": e.lineno}
                })
                return
        else:
            await _log(db, build_id, "   ⏭️  No source code — skipping syntax check (prebuilt actor)")

        # ── Step 3: Security Scan ─────────────────────────────────────────────
        await _log(db, build_id, "")
        await _log(db, build_id, "🛡️  Step 2/4 — Security scan")

        security_failed = False
        for pattern in COMPILED_BANS:
            match = pattern.search(source_code)
            if match:
                await _log(db, build_id, f"   ❌ Banned pattern detected: '{match.group()}'")
                await _log(db, build_id, "      Security policy prohibits dangerous system calls.")
                security_failed = True
                break

        if security_failed:
            await _set_status(db, build_id, "FAILED", {
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "stats": {"error": "security_violation"}
            })
            return

        await _log(db, build_id, "   ✅ Security scan passed")

        # ── Step 4: Input Schema Validation ───────────────────────────────────
        await _log(db, build_id, "")
        await _log(db, build_id, "📦 Step 3/4 — Input schema validation")

        input_schema = version.get("input_schema", {})
        if input_schema:
            try:
                # Minimal structural validation — must be a dict with optional "properties"
                if not isinstance(input_schema, dict):
                    raise ValueError("input_schema must be a JSON object")
                if "properties" in input_schema and not isinstance(input_schema["properties"], dict):
                    raise ValueError("input_schema.properties must be a JSON object")
                await _log(db, build_id, f"   ✅ Input schema valid ({len(input_schema.get('properties', {}))} fields)")
            except (ValueError, Exception) as e:
                await _log(db, build_id, f"   ❌ Schema error: {e}")
                await _set_status(db, build_id, "FAILED", {
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "stats": {"error": "schema_invalid"}
                })
                return
        else:
            await _log(db, build_id, "   ⏭️  No input schema defined")

        # ── Step 5: Lock Snapshot + Assign Build Number ───────────────────────
        await _log(db, build_id, "")
        await _log(db, build_id, "🔢 Step 4/4 — Locking snapshot & assigning build number")

        # Auto-increment patch number for this version
        last_build = await db.actor_builds.find_one(
            {"actor_id": actor_id, "version_number": version_number, "id": {"$ne": build_id}},
            sort=[("patch_number", -1)]
        )
        patch_number = (last_build.get("patch_number", 0) + 1) if last_build else 1
        build_number = f"{version_number}.{patch_number}"

        await _log(db, build_id, f"   ✅ Build number assigned: {build_number}")
        await _log(db, build_id, f"   ✅ Source snapshot locked ({len(source_code)} bytes)")
        await _log(db, build_id, f"   ✅ Schema snapshot locked")

        # ── Step 6: Finalize Build ────────────────────────────────────────────
        finished_at = datetime.now(timezone.utc)
        duration = int((finished_at - started_at).total_seconds())

        await db.actor_builds.update_one(
            {"id": build_id},
            {
                "$set": {
                    "status": "SUCCEEDED",
                    "build_number": build_number,
                    "patch_number": patch_number,
                    "source_code_snapshot": source_code,
                    "input_schema_snapshot": input_schema,
                    "finished_at": finished_at.isoformat(),
                    "stats": {
                        "build_duration_secs": duration,
                        "source_bytes": len(source_code),
                        "schema_fields": len(input_schema.get("properties", {})),
                        "steps_passed": 4,
                    }
                }
            }
        )

        await _log(db, build_id, "")
        await _log(db, build_id, f"✅ Build SUCCEEDED in {duration}s — build number: {build_number}")

        # ── Step 7: Auto-apply Tag ────────────────────────────────────────────
        build_tag = version.get("build_tag", "latest")
        await _log(db, build_id, f"🏷️  Applying tag '{build_tag}' to build {build_number}")

        # Update version's default build
        await db.actor_versions.update_one(
            {"id": version_id},
            {"$set": {"default_build_id": build_id, "updated_at": finished_at.isoformat()}}
        )

        # Update actor's default build if this is the "latest" tag
        if build_tag == "latest":
            await db.actors.update_one(
                {"id": actor_id},
                {
                    "$set": {
                        "default_build_id": build_id,
                        "latest_version_number": version_number,
                        "updated_at": finished_at.isoformat(),
                    }
                }
            )
            await _log(db, build_id, f"   ✅ Actor default build updated to {build_number}")

        success = True

    except Exception as e:
        logger.error(f"Build {build_id} crashed unexpectedly: {e}", exc_info=True)
        finished_at = datetime.now(timezone.utc)
        try:
            await _log(db, build_id, f"")
            await _log(db, build_id, f"💥 Build FAILED — unexpected error: {str(e)[:300]}")
            await _set_status(db, build_id, "FAILED", {
                "finished_at": finished_at.isoformat(),
                "stats": {"error": "internal_error", "message": str(e)[:300]}
            })
        except Exception:
            pass

    finally:
        # ── Step 8: Dispatch Webhook ──────────────────────────────────────────
        try:
            from services.webhook_service import WebhookService
            event = "actor.build.succeeded" if success else "actor.build.failed"
            final_build = await db.actor_builds.find_one({"id": build_id}, {"_id": 0})
            await WebhookService(db).dispatch_build_event(
                event=event,
                build_id=build_id,
                actor_id=actor_id,
                user_id=user_id,
                build_doc=final_build or {},
            )
        except Exception as wh_err:
            logger.warning(f"Webhook dispatch failed for build {build_id}: {wh_err}")

        client.close()


# ── Celery Task Definition ────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="workers.build_worker.run_build_task",
    queue="builds",
    max_retries=0,        # builds don't auto-retry on failure
    time_limit=1800,      # 30-min hard limit (matches Apify default)
    soft_time_limit=1740,
)
def run_build_task(self, build_id: str, actor_id: str, version_id: str, user_id: str):
    """
    Sync Celery task wrapper — runs the async build pipeline.
    """
    logger.info(f"Build worker picked up build_id={build_id}, actor_id={actor_id}")
    asyncio.run(_run_build(build_id, actor_id, version_id, user_id))
    logger.info(f"Build worker finished build_id={build_id}")
