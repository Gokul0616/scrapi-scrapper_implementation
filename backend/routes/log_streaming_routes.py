from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sse_starlette.sse import EventSourceResponse
import redis.asyncio as redis
import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional

from database import get_db
from routes.dependencies import _resolve_api_key_token, get_current_user

router = APIRouter(tags=["Logs"])
logger = logging.getLogger(__name__)

async def get_user_from_query_token(
    request: Request,
    token: Optional[str] = Query(None)
):
    """
    Authenticate via ?token=... query parameter for EventSource compatibility.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    db = get_db()
    if token.startswith("scrapi_api_"):
        return await _resolve_api_key_token(token, db, request)
    
    # Fake HTTPAuthorizationCredentials for get_current_user
    class DummyCredentials:
        credentials = token
    return await get_current_user(DummyCredentials())

@router.get("/runs/{run_id}/logs/stream")
async def stream_run_logs(
    run_id: str,
    request: Request,
    current_user: dict = Depends(get_user_from_query_token)
):
    """
    Stream logs for a specific run via Server-Sent Events (SSE).
    """
    db = get_db()
    
    # Verify run exists and user has access
    run = await db.runs.find_one({"id": run_id})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    # Check access (same as normal routes)
    user_id = current_user.get("id")
    if current_user.get("role") != "admin" and run.get("user_id") != user_id:
        if run.get("organization_id") and request.state.workspace_id == run.get("organization_id"):
            pass # Orgs have access
        else:
            raise HTTPException(status_code=403, detail="Not authorized to view this run")

    async def event_generator():
        # 1. Yield existing logs from MongoDB first
        current_run = await db.runs.find_one({"id": run_id})
        existing_logs = current_run.get("logs", [])
        for log_line in existing_logs:
            if await request.is_disconnected():
                break
            yield {"data": log_line}

        # 2. Connect to Redis Pub/Sub for live updates
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        r = redis.from_url(redis_url, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe(f"run_logs:{run_id}")

        try:
            while True:
                if await request.is_disconnected():
                    break

                # Poll for messages with a timeout
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    yield {"data": message["data"]}

                # Check if run has finished to close stream cleanly
                # Check periodically (every 5 seconds) to avoid database hammering
                # But wait, we can just rely on the frontend closing the connection, or check it here
                run_status = await db.runs.find_one({"id": run_id}, projection={"status": 1})
                if run_status and run_status.get("status") in ["succeeded", "failed", "aborted"]:
                    # Wait slightly longer to ensure final logs arrive
                    await asyncio.sleep(2)
                    # Yield a completion signal that the frontend can listen to
                    yield {"event": "end", "data": "Run completed"}
                    break
                    
        finally:
            await pubsub.unsubscribe(f"run_logs:{run_id}")
            await pubsub.close()
            await r.close()

    return EventSourceResponse(event_generator())
