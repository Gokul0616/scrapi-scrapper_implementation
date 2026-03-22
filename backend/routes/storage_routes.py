import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from database import get_db, get_redis
from routes.dependencies import get_api_user
from auth import get_current_user
from services.request_queue import RequestQueue

logger = logging.getLogger(__name__)

router = APIRouter()

# Schema
class QueueRequestTemplate(BaseModel):
    url: str
    method: str = "GET"
    unique_key: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class BatchEnqueueInput(BaseModel):
    requests: List[QueueRequestTemplate]

# Database access helper
store_db = None
def set_storage_db(database):
    global store_db
    store_db = database

@router.post("/request-queues", response_model=Dict[str, Any])
async def create_request_queue(
    request: Request,
    run_id: str,
    current_user: dict = Depends(get_api_user)
):
    """Initialize a persistent request queue for a specific run."""
    redis_client = await get_redis()
    
    # Check if run exists and user has access
    run = await store_db.runs.find_one({
        "id": run_id, 
        "user_id": current_user['id']
    })
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found or access denied")
        
    queue_id = run_id
    
    # Ensure queue metadata exists in Mongo
    await store_db.request_queues.update_one(
        {"id": queue_id},
        {"$set": {
            "id": queue_id,
            "run_id": run_id,
            "user_id": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Initialize the redis stream structures
    workspace_id = current_user.get("organization_id", current_user["id"])
    rq = RequestQueue(redis_client, queue_id, db=store_db, workspace_id=workspace_id)
    await rq.initialize()
    
    return {
        "id": queue_id,
        "run_id": run_id,
        "status": "ready"
    }

@router.post("/request-queues/{queue_id}/requests", response_model=Dict[str, int])
async def enqueue_requests(
    queue_id: str,
    batch: BatchEnqueueInput,
    current_user: dict = Depends(get_api_user)
):
    """Add a batch of raw URLs to the request queue."""
    redis_client = await get_redis()
    
    # Authenticate queue ownership
    queue_meta = await store_db.request_queues.find_one({"id": queue_id, "user_id": current_user["id"]})
    if not queue_meta:
        raise HTTPException(status_code=404, detail="Request queue not found or access denied")
        
    workspace_id = queue_meta.get("organization_id", queue_meta.get("user_id", current_user["id"]))
    rq = RequestQueue(redis_client, queue_id, db=store_db, workspace_id=workspace_id)
    
    # Convert Pydantic models to dicts
    requests_list = [req.model_dump(exclude_unset=True) for req in batch.requests]
    
    # Enqueue safely deduplicated items
    result = await rq.add_requests(requests_list)
    return result

@router.get("/request-queues/{queue_id}")
async def get_queue_status(
    queue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get metrics (total, pending, handled) about a specific request queue."""
    redis_client = await get_redis()
    
    # Check ownership
    queue_meta = await store_db.request_queues.find_one({"id": queue_id, "user_id": current_user["id"]})
    if not queue_meta:
        raise HTTPException(status_code=404, detail="Request queue not found")
        
    workspace_id = queue_meta.get("organization_id", queue_meta.get("user_id", current_user["id"]))
    rq = RequestQueue(redis_client, queue_id, db=store_db, workspace_id=workspace_id)
    metrics = await rq.get_state()
    
    return {
        "id": queue_id,
        "metrics": metrics
    }

@router.delete("/request-queues/{queue_id}")
async def delete_request_queue(
    queue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Purge and destroy a request queue entirely."""
    redis_client = await get_redis()
    
    queue_meta = await store_db.request_queues.find_one({"id": queue_id, "user_id": current_user["id"]})
    if not queue_meta:
        raise HTTPException(status_code=404, detail="Request queue not found")
        
    workspace_id = queue_meta.get("organization_id", queue_meta.get("user_id", current_user["id"]))
    rq = RequestQueue(redis_client, queue_id, db=store_db, workspace_id=workspace_id)
    await rq.clear()
    
    # Delete metadata from MongoDB
    await store_db.request_queues.delete_one({"id": queue_id})
    return {"success": True, "message": "Request queue purged"}
