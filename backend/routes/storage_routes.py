"""
Storage Routes — /api/storage/
==============================
Provides Scrapi-compatible REST endpoints for:
  - Key-Value Stores     (/kv-stores/...)
  - Request Queues       (/request-queues/...)

Design notes:
  - GET /records/{key}  → raw response with correct Content-Type header (NOT JSON-wrapped)
  - PUT /records/{key}  → raw request body; Content-Type header drives storage path
  - All endpoints require JWT or API key via get_api_user dependency
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import Response

from database import get_db
from auth import get_current_user
from routes.dependencies import get_api_user
from models.kv_store import KVStoreCreate, KVStoreUpdate
from models.request_queue import RequestQueueCreate, RQBatchAdd, RQItemAdd, RQMarkHandled, RQReclaim
from services.kv_store_service import KVStoreService
from services.request_queue_service import RequestQueueService
from services.dataset_service import DatasetService
from models.dataset import DatasetCreate

logger = logging.getLogger(__name__)
router = APIRouter()


def _kv_service() -> KVStoreService:
    return KVStoreService(get_db())


def _rq_service() -> RequestQueueService:
    return RequestQueueService(get_db())


def _dataset_service() -> DatasetService:
    return DatasetService(get_db())


# ═══════════════════════════════════════════════════════════════════════════════
# KEY-VALUE STORE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/kv-stores", status_code=201)
async def create_kv_store(
    body: KVStoreCreate,
    current_user: dict = Depends(get_api_user),
):
    """Create a new Key-Value Store (named or unnamed)."""
    svc = _kv_service()
    store = await svc.create_store(
        user_id=current_user["id"],
        name=body.name or None,
        run_id=body.run_id,
    )
    return store.model_dump()


@router.get("/kv-stores")
async def list_kv_stores(
    run_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List all Key-Value Stores for the current user."""
    svc = _kv_service()
    stores = await svc.list_stores(
        user_id=current_user["id"],
        run_id=run_id,
        limit=limit,
        offset=offset,
    )
    return {"stores": stores, "total": len(stores), "offset": offset, "limit": limit}


@router.get("/kv-stores/{store_id}")
async def get_kv_store(
    store_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get Key-Value Store metadata."""
    svc = _kv_service()
    store = await svc.get_store(store_id, current_user["id"])
    if not store:
        raise HTTPException(status_code=404, detail="Key-value store not found")
    return store


@router.put("/kv-stores/{store_id}")
async def rename_kv_store(
    store_id: str,
    body: KVStoreUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Rename a Key-Value Store (making it a named / permanent store)."""
    svc = _kv_service()
    ok = await svc.rename_store(store_id, current_user["id"], body.name)
    if not ok:
        raise HTTPException(status_code=404, detail="Key-value store not found")
    return {"success": True, "name": body.name}


@router.delete("/kv-stores/{store_id}")
async def delete_kv_store(
    store_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a Key-Value Store and all its records (including GridFS binaries)."""
    svc = _kv_service()
    ok = await svc.delete_store(store_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Key-value store not found")
    return {"success": True}


# ── Record endpoints ───────────────────────────────────────────────────────────

@router.get("/kv-stores/{store_id}/records")
async def list_kv_records(
    store_id: str,
    exclusiveStartKey: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
):
    """List record keys (metadata only, no values) — supports cursor pagination."""
    # Verify ownership
    svc = _kv_service()
    store = await svc.get_store(store_id, current_user["id"])
    if not store:
        raise HTTPException(status_code=404, detail="Key-value store not found")

    result = await svc.list_records(store_id, exclusiveStartKey, limit)
    return result


@router.get("/kv-stores/{store_id}/records/{key:path}")
async def get_kv_record(
    store_id: str,
    key: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a record value — returns RAW response with correct Content-Type header.
    This is the Scrapi-compatible behaviour: not JSON-wrapped.
    """
    svc = _kv_service()
    result = await svc.get_record(store_id, key)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Record '{key}' not found")

    value, content_type, value_type = result

    if value_type == "binary":
        return Response(content=value, media_type=content_type)
    elif value_type == "text":
        text = value if isinstance(value, str) else str(value)
        return Response(content=text.encode("utf-8"), media_type=content_type)
    else:
        # JSON — serialize and return with application/json
        return Response(
            content=json.dumps(value).encode("utf-8"),
            media_type="application/json",
        )


@router.put("/kv-stores/{store_id}/records/{key:path}")
async def put_kv_record(
    store_id: str,
    key: str,
    request: Request,
    current_user: dict = Depends(get_api_user),
):
    """
    Upsert a record — body IS the value (not JSON-wrapped).
    Content-Type header drives storage backend:
      - application/json → json_value in MongoDB
      - text/*           → json_value (as string) in MongoDB
      - image/*, binary  → GridFS
    """
    # Enforce key length limit (Scrapi limit: 63 chars)
    if len(key) > 63:
        raise HTTPException(status_code=400, detail="Key must be 63 characters or fewer")

    content_type = request.headers.get("content-type", "application/json")
    body = await request.body()

    # Parse value depending on content type
    base_ct = content_type.split(";")[0].strip().lower()
    if base_ct == "application/json":
        try:
            value = json.loads(body)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")
    elif base_ct.startswith("text/"):
        encoding = "utf-8"
        for part in content_type.split(";"):
            part = part.strip()
            if part.lower().startswith("charset="):
                encoding = part.split("=", 1)[1].strip()
        value = body.decode(encoding)
    else:
        value = body   # raw bytes → GridFS

    svc = _kv_service()
    await svc.set_record(store_id, key, value, content_type)
    return {"success": True}


@router.delete("/kv-stores/{store_id}/records/{key:path}")
async def delete_kv_record(
    store_id: str,
    key: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a single record (also removes GridFS object for binary records)."""
    svc = _kv_service()
    ok = await svc.delete_record(store_id, key)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Record '{key}' not found")
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST QUEUE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/request-queues", status_code=201)
async def create_request_queue(
    body: RequestQueueCreate,
    current_user: dict = Depends(get_api_user),
):
    """Create a new Request Queue (named or unnamed)."""
    svc = _rq_service()
    queue = await svc.create_queue(
        user_id=current_user["id"],
        name=body.name or None,
        run_id=body.run_id,
    )
    return queue.model_dump()


@router.get("/request-queues")
async def list_request_queues(
    run_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List all Request Queues for the current user."""
    svc = _rq_service()
    queues = await svc.list_queues(
        user_id=current_user["id"],
        run_id=run_id,
        limit=limit,
        offset=offset,
    )
    return {"queues": queues, "total": len(queues)}


@router.get("/request-queues/{queue_id}")
async def get_request_queue(
    queue_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get Request Queue metadata and stats."""
    svc = _rq_service()
    queue = await svc.get_queue(queue_id, current_user["id"])
    if not queue:
        raise HTTPException(status_code=404, detail="Request queue not found")
    return queue


@router.delete("/request-queues/{queue_id}")
async def delete_request_queue(
    queue_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a Request Queue and all its items."""
    svc = _rq_service()
    ok = await svc.delete_queue(queue_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Request queue not found")
    return {"success": True}


# ── Request (URL) endpoints ────────────────────────────────────────────────────

@router.post("/request-queues/{queue_id}/requests")
async def add_requests(
    queue_id: str,
    body: RQBatchAdd,
    current_user: dict = Depends(get_api_user),
):
    """
    Batch-add URLs to a queue.
    Duplicate URLs (same unique_key) are silently skipped.
    Returns {processed, added, duplicate}.
    """
    svc = _rq_service()
    # Verify queue ownership
    queue = await svc.get_queue(queue_id, current_user["id"])
    if not queue:
        raise HTTPException(status_code=404, detail="Request queue not found")

    result = await svc.add_requests(queue_id, body.requests, current_user["id"])
    return result


@router.get("/request-queues/{queue_id}/requests")
async def list_requests(
    queue_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List all requests in a queue (paginated)."""
    svc = _rq_service()
    queue = await svc.get_queue(queue_id, current_user["id"])
    if not queue:
        raise HTTPException(status_code=404, detail="Request queue not found")

    return await svc.list_requests(queue_id, status=status, limit=limit, offset=offset)


@router.get("/request-queues/{queue_id}/head")
async def get_queue_head(
    queue_id: str,
    limit: int = Query(1, ge=1, le=25),
    lockSecs: int = Query(60, ge=0, le=3600),
    clientKey: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch and atomically lock the next N pending requests.
    Uses find_one_and_update — prevents two workers from picking the same URL.
    lockSecs=0 → no locking (peek only).
    """
    svc = _rq_service()
    queue = await svc.get_queue(queue_id, current_user["id"])
    if not queue:
        raise HTTPException(status_code=404, detail="Request queue not found")

    items = await svc.get_head(
        queue_id,
        limit=limit,
        lock_secs=lockSecs,
        client_key=clientKey,
    )
    return {
        "limit": limit,
        "hadMultipleClients": queue.get("had_multiple_clients", False),
        "items": items,
    }


@router.post("/request-queues/{queue_id}/requests/{unique_key:path}/mark-handled")
async def mark_request_handled(
    queue_id: str,
    unique_key: str,
    body: RQMarkHandled = RQMarkHandled(),
    current_user: dict = Depends(get_api_user),
):
    """Mark a request as successfully processed."""
    svc = _rq_service()
    item = await svc.mark_handled(queue_id, unique_key, loaded_url=body.loaded_url)
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True, "request": item}


@router.post("/request-queues/{queue_id}/requests/{unique_key:path}/reclaim")
async def reclaim_request(
    queue_id: str,
    unique_key: str,
    body: RQReclaim = RQReclaim(),
    current_user: dict = Depends(get_api_user),
):
    """Return a failed/locked request back to pending for retry."""
    svc = _rq_service()
    item = await svc.reclaim_request(queue_id, unique_key, forefront=body.forefront)
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True, "request": item}


@router.delete("/request-queues/{queue_id}/requests/{unique_key:path}")
async def delete_request(
    queue_id: str,
    unique_key: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a specific URL from the queue."""
    svc = _rq_service()
    ok = await svc.delete_request(queue_id, unique_key)
    if not ok:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True}


@router.get("/request-queues/{queue_id}/is-finished")
async def is_queue_finished(
    queue_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Check if all requests in the queue have been handled."""
    svc = _rq_service()
    finished = await svc.is_finished(queue_id)
    return {"isFinished": finished}


# ═══════════════════════════════════════════════════════════════════════════════
# DATASET ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/datasets", status_code=201)
async def create_dataset(
    body: DatasetCreate,
    current_user: dict = Depends(get_api_user),
):
    """Create a new Dataset (named or unnamed)."""
    svc = _dataset_service()
    dataset = await svc.create_dataset(
        user_id=current_user["id"],
        name=body.name or None,
        run_id=body.run_id,
    )
    return dataset.model_dump()


@router.get("/datasets/{dataset_id}")
async def get_dataset(
    dataset_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get dataset metadata and item counts."""
    svc = _dataset_service()
    dataset = await svc.get_dataset(dataset_id, current_user["id"])
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/datasets/{dataset_id}/items")
async def push_data(
    dataset_id: str,
    request: Request,
    current_user: dict = Depends(get_api_user),
):
    """Append items to a dataset. Body should be a JSON object or array of objects."""
    svc = _dataset_service()
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    await svc.push_data(dataset_id, data)
    return {"success": True}


@router.get("/datasets/{dataset_id}/items")
async def get_data(
    dataset_id: str,
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve items from a dataset (paginated)."""
    svc = _dataset_service()
    return await svc.get_data(dataset_id, limit=limit, offset=offset)


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a dataset and all its items."""
    svc = _dataset_service()
    ok = await svc.delete_dataset(dataset_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"success": True}
