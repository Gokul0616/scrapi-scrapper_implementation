from fastapi import APIRouter, Depends, HTTPException, Request, Response, Body, UploadFile, File
from typing import Dict, Any, Optional
from database import get_db
from routes.dependencies import get_api_user
from services.key_value_store import KeyValueStore

router = APIRouter(prefix="/key-value-stores", tags=["Storage"])

@router.post("/", response_model=Dict[str, Any])
async def create_store(
    name: str = Body(..., embed=True),
    current_user: dict = Depends(get_api_user)
):
    """Create a new key-value store."""
    db = get_db()
    import uuid
    store_id = str(uuid.uuid4())
    
    doc = {
        "id": store_id,
        "name": name,
        "user_id": current_user['id'],
        "metrics": {
            "reads": 0,
            "writes": 0,
            "total_bytes": 0
        },
        "created_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
    }
    
    await db.key_value_stores.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/{store_id}", response_model=Dict[str, Any])
async def get_store(
    store_id: str,
    current_user: dict = Depends(get_api_user)
):
    """Retrieve metadata about a key-value store."""
    db = get_db()
    store = await db.key_value_stores.find_one({
        "id": store_id,
        "user_id": current_user['id']
    })
    
    if not store:
        raise HTTPException(status_code=404, detail="Key-value store not found")
        
    store.pop("_id", None)
    return store

@router.put("/{store_id}/records/{key}")
async def put_record(
    store_id: str,
    key: str,
    request: Request,
    current_user: dict = Depends(get_api_user)
):
    """Put a custom key-value pair (JSON, Text, or Binary)."""
    db = get_db()
    # Verify ownership
    store = await db.key_value_stores.find_one({
        "id": store_id,
        "user_id": current_user['id']
    })
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    content_type = request.headers.get("content-type", "application/octet-stream")
    body = await request.body()
    
    kv = KeyValueStore(store_id=store_id, db=db, workspace_id=current_user['id'])
    result = await kv.set_record(key=key, value=body, content_type=content_type)
    return result

@router.get("/{store_id}/records/{key}")
async def get_record(
    store_id: str,
    key: str,
    current_user: dict = Depends(get_api_user)
):
    """Retrieve a custom key-value pair."""
    db = get_db()
    store = await db.key_value_stores.find_one({
        "id": store_id,
        "user_id": current_user['id']
    })
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    kv = KeyValueStore(store_id=store_id, db=db, workspace_id=current_user['id'])
    record = await kv.get_record(key=key)
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
        
    return Response(content=record["body"], media_type=record["content_type"])

@router.get("/{store_id}/records")
async def list_records(
    store_id: str,
    current_user: dict = Depends(get_api_user)
):
    """Retrieve all dataset keys belonging sequentially to a key-value store."""
    db = get_db()
    store = await db.key_value_stores.find_one({
        "id": store_id,
        "user_id": current_user['id']
    })
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    kv = KeyValueStore(store_id=store_id, db=db, workspace_id=current_user['id'])
    keys = await kv.list_keys()
    
    return {"data": keys, "total": len(keys)}

@router.delete("/{store_id}/records/{key}")
async def delete_record(
    store_id: str,
    key: str,
    current_user: dict = Depends(get_api_user)
):
    """Delete a key-value pair."""
    db = get_db()
    store = await db.key_value_stores.find_one({
        "id": store_id,
        "user_id": current_user['id']
    })
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    kv = KeyValueStore(store_id=store_id, db=db, workspace_id=current_user['id'])
    success = await kv.delete_record(key=key)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "deleted"}
