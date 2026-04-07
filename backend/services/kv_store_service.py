"""
Key-Value Store Service
=======================
Handles all CRUD operations for KV stores and their records.
- JSON / text values  → stored directly in `kv_store_items.json_value` (MongoDB)
- Binary values       → stored in MongoDB GridFS (`kv_store_files` bucket)

Scrapi-compatible behaviours:
  - Named stores (name != None) → never expire
  - Unnamed stores              → expires_at = now + 7 days
  - GET /records/{key}          → returns raw bytes / JSON / text
  - PUT /records/{key}          → Content-Type header drives storage path
  - DELETE record               → also removes GridFS object if present
"""

import io
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, AsyncGenerator, Optional, Tuple

from models.kv_store import KVStore, KVStoreItem, KVStoreCreate

logger = logging.getLogger(__name__)

# Content-types that go to GridFS rather than MongoDB json_value
_BINARY_PREFIXES = ("image/", "audio/", "video/", "application/pdf",
                    "application/zip", "application/octet-stream",
                    "application/x-www-form-urlencoded")
_BINARY_EXACT = {"text/html", "text/xml", "application/xml",
                 "application/x-binary"}

UNNAMED_TTL_DAYS = 7


def _is_binary(content_type: str) -> bool:
    base = content_type.split(";")[0].strip().lower()
    if base in _BINARY_EXACT:
        return True
    for prefix in _BINARY_PREFIXES:
        if base.startswith(prefix):
            return True
    return False


def _detect_content_type(value: Any) -> str:
    if isinstance(value, (dict, list)):
        return "application/json"
    if isinstance(value, str):
        return "text/plain; charset=utf-8"
    return "application/octet-stream"


class KVStoreService:
    def __init__(self, db):
        self.db = db
        self._fs = None   # lazy GridFS bucket

    async def _get_fs(self):
        if self._fs is None:
            from motor.motor_asyncio import AsyncIOMotorGridFSBucket
            self._fs = AsyncIOMotorGridFSBucket(
                self.db, bucket_name="kv_store_files"
            )
        return self._fs

    # ── Store lifecycle ───────────────────────────────────────────────────

    async def create_store(
        self,
        user_id: str,
        name: Optional[str] = None,
        run_id: Optional[str] = None,
        org_id: Optional[str] = None,
    ) -> KVStore:
        is_named = bool(name)
        expires_at = None if is_named else (
            datetime.now(timezone.utc) + timedelta(days=UNNAMED_TTL_DAYS)
        )
        store = KVStore(
            user_id=user_id,
            organization_id=org_id,
            run_id=run_id,
            name=name,
            is_named=is_named,
            expires_at=expires_at,
        )
        doc = store.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["accessed_at"] = doc["accessed_at"].isoformat()
        doc["expires_at"] = doc["expires_at"].isoformat() if expires_at else None
        await self.db.kv_stores.insert_one(doc)
        logger.info(f"KVStore created: {store.id} (named={is_named}, run={run_id})")
        return store

    async def get_store(self, store_id: str, user_id: str) -> Optional[dict]:
        store = await self.db.kv_stores.find_one(
            {"id": store_id, "user_id": user_id}, {"_id": 0}
        )
        if store:
            await self.db.kv_stores.update_one(
                {"id": store_id},
                {"$set": {"accessed_at": datetime.now(timezone.utc).isoformat()}}
            )
        return store

    async def list_stores(
        self,
        user_id: str,
        run_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list:
        query: dict = {"user_id": user_id}
        if run_id:
            query["run_id"] = run_id
        if org_id:
            query["organization_id"] = org_id
        stores = await self.db.kv_stores.find(query, {"_id": 0}).skip(offset).limit(limit).to_list(limit)
        return stores

    async def rename_store(self, store_id: str, user_id: str, name: str) -> bool:
        result = await self.db.kv_stores.update_one(
            {"id": store_id, "user_id": user_id},
            {"$set": {"name": name, "is_named": True, "expires_at": None}}
        )
        return result.modified_count > 0

    async def delete_store(self, store_id: str, user_id: str) -> bool:
        # Delete all GridFS objects first
        items = await self.db.kv_store_items.find(
            {"store_id": store_id, "value_type": "binary"}, {"gridfs_id": 1}
        ).to_list(None)
        if items:
            import bson
            fs = await self._get_fs()
            for item in items:
                if item.get("gridfs_id"):
                    try:
                        await fs.delete(bson.ObjectId(item["gridfs_id"]))
                    except Exception:
                        pass

        await self.db.kv_store_items.delete_many({"store_id": store_id})
        result = await self.db.kv_stores.delete_one({"id": store_id, "user_id": user_id})
        return result.deleted_count > 0

    # ── Record operations ─────────────────────────────────────────────────

    async def set_record(
        self,
        store_id: str,
        key: str,
        value: Any,
        content_type: Optional[str] = None,
    ) -> KVStoreItem:
        if content_type is None:
            content_type = _detect_content_type(value)

        now_iso = datetime.now(timezone.utc).isoformat()
        binary = _is_binary(content_type)

        # Remove old record if exists (to clean up old GridFS entry)
        existing = await self.db.kv_store_items.find_one(
            {"store_id": store_id, "key": key}
        )
        if existing and existing.get("gridfs_id"):
            import bson
            fs = await self._get_fs()
            try:
                await fs.delete(bson.ObjectId(existing["gridfs_id"]))
            except Exception:
                pass

        gridfs_id = None
        json_value = None
        size_bytes = 0

        if binary:
            # value must be bytes
            if isinstance(value, str):
                value = value.encode("utf-8")
            fs = await self._get_fs()
            oid = await fs.upload_from_stream(
                filename=f"{store_id}/{key}",
                source=value,
                metadata={"store_id": store_id, "key": key, "content_type": content_type},
            )
            gridfs_id = str(oid)
            size_bytes = len(value)
            value_type = "binary"
        elif isinstance(value, (dict, list)):
            json_value = value
            serialized = json.dumps(value)
            size_bytes = len(serialized.encode())
            value_type = "json"
        else:
            # text
            json_value = str(value)
            size_bytes = len(str(value).encode())
            value_type = "text"

        item_doc = {
            "id": existing["id"] if existing else None,
            "store_id": store_id,
            "key": key,
            "value_type": value_type,
            "json_value": json_value,
            "gridfs_id": gridfs_id,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "updated_at": now_iso,
        }

        if existing:
            await self.db.kv_store_items.update_one(
                {"store_id": store_id, "key": key},
                {"$set": {k: v for k, v in item_doc.items() if k != "id"}}
            )
        else:
            from models.kv_store import KVStoreItem as KVSItem
            new_item = KVSItem(
                store_id=store_id,
                key=key,
                value_type=value_type,
                json_value=json_value,
                gridfs_id=gridfs_id,
                content_type=content_type,
                size_bytes=size_bytes,
            )
            doc = new_item.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            doc["updated_at"] = doc["updated_at"].isoformat()
            await self.db.kv_store_items.insert_one(doc)
            return new_item

        return KVStoreItem(**{
            **(existing or {}),
            "value_type": value_type,
            "json_value": json_value,
            "gridfs_id": gridfs_id,
            "content_type": content_type,
            "size_bytes": size_bytes,
        })

    async def get_record(
        self, store_id: str, key: str
    ) -> Optional[Tuple[Any, str, str]]:
        """
        Returns (value, content_type, value_type) or None if not found.
        value is:
          - dict/list  for "json"
          - str        for "text"
          - bytes      for "binary"
        """
        item = await self.db.kv_store_items.find_one(
            {"store_id": store_id, "key": key}, {"_id": 0}
        )
        if not item:
            return None

        value_type = item["value_type"]
        content_type = item.get("content_type", "application/json")

        if value_type == "binary":
            import bson
            fs = await self._get_fs()
            buf = io.BytesIO()
            await fs.download_to_stream(bson.ObjectId(item["gridfs_id"]), buf)
            return (buf.getvalue(), content_type, "binary")
        else:
            return (item.get("json_value"), content_type, value_type)

    async def list_records(
        self,
        store_id: str,
        exclusive_start_key: Optional[str] = None,
        limit: int = 100,
    ) -> dict:
        """
        Returns keys metadata only (no values).
        Pagination via exclusive_start_key (cursor, not offset).
        """
        query: dict = {"store_id": store_id}
        if exclusive_start_key:
            query["key"] = {"$gt": exclusive_start_key}

        items = await self.db.kv_store_items.find(
            query, {"_id": 0, "key": 1, "content_type": 1, "size_bytes": 1, "created_at": 1}
        ).sort("key", 1).limit(limit + 1).to_list(limit + 1)

        next_key = None
        if len(items) > limit:
            next_key = items[limit]["key"]
            items = items[:limit]

        return {"items": items, "nextExclusiveStartKey": next_key}

    async def delete_record(self, store_id: str, key: str) -> bool:
        item = await self.db.kv_store_items.find_one({"store_id": store_id, "key": key})
        if not item:
            return False

        if item.get("gridfs_id"):
            import bson
            fs = await self._get_fs()
            try:
                await fs.delete(bson.ObjectId(item["gridfs_id"]))
            except Exception:
                pass

        result = await self.db.kv_store_items.delete_one({"store_id": store_id, "key": key})
        return result.deleted_count > 0

    # ── Indexes ───────────────────────────────────────────────────────────────

    async def ensure_indexes(self):
        await self.db.kv_store_items.create_index(
            [("store_id", 1), ("key", 1)], unique=True, name="kv_items_store_key_unique"
        )
        await self.db.kv_stores.create_index(
            [("user_id", 1), ("name", 1)], name="kv_stores_user_name"
        )
        await self.db.kv_stores.create_index(
            [("run_id", 1)], name="kv_stores_run_id", sparse=True
        )
        # TTL index: auto-delete expired unnamed stores (MongoDB will cascade via app code)
        await self.db.kv_stores.create_index(
            [("expires_at", 1)], name="kv_stores_expires_ttl", sparse=True
        )
        logger.info("KVStore indexes ensured")
