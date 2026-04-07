"""
Request Queue Service
=====================
Handles URL queuing with Scrapi-compatible semantics:

  - SHA-256 of URL is the dedup key (unique_key)
  - Atomic HEAD via find_one_and_update — prevents two workers getting same URL
  - Lock TTL: when lockSecs > 0, sets lock_expires_at; expired locks auto-unlock
  - forefront=True → URL inserted at head (processed first)
  - reclaim_request → return a URL to pending (increments retry_count)
  - Named queues never expire; unnamed queues expire after 7 days
"""

import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from models.request_queue import (
    RequestQueue, RQItem, RQItemAdd, RQMarkHandled,
)

logger = logging.getLogger(__name__)

UNNAMED_TTL_DAYS = 7
DEFAULT_LOCK_SECS = 60


class RequestQueueService:
    def __init__(self, db):
        self.db = db

    # ── Queue lifecycle ───────────────────────────────────────────────────

    async def create_queue(
        self,
        user_id: str,
        name: Optional[str] = None,
        run_id: Optional[str] = None,
        org_id: Optional[str] = None,
    ) -> RequestQueue:
        is_named = bool(name)
        expires_at = None if is_named else (
            datetime.now(timezone.utc) + timedelta(days=UNNAMED_TTL_DAYS)
        )
        queue = RequestQueue(
            user_id=user_id,
            organization_id=org_id,
            run_id=run_id,
            name=name,
            is_named=is_named,
            expires_at=expires_at,
        )
        doc = queue.model_dump()
        for field in ("created_at", "modified_at", "accessed_at"):
            if doc[field]:
                doc[field] = doc[field].isoformat()
        doc["expires_at"] = expires_at.isoformat() if expires_at else None
        await self.db.request_queues.insert_one(doc)
        logger.info(f"RequestQueue created: {queue.id} (named={is_named}, run={run_id})")
        return queue

    async def get_queue(self, queue_id: str, user_id: str) -> Optional[dict]:
        q = await self.db.request_queues.find_one(
            {"id": queue_id, "user_id": user_id}, {"_id": 0}
        )
        if q:
            await self.db.request_queues.update_one(
                {"id": queue_id},
                {"$set": {"accessed_at": datetime.now(timezone.utc).isoformat()}}
            )
        return q

    async def list_queues(
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
        return await self.db.request_queues.find(
            query, {"_id": 0}
        ).skip(offset).limit(limit).to_list(limit)

    async def delete_queue(self, queue_id: str, user_id: str) -> bool:
        await self.db.rq_items.delete_many({"queue_id": queue_id})
        result = await self.db.request_queues.delete_one(
            {"id": queue_id, "user_id": user_id}
        )
        return result.deleted_count > 0

    # ── Request operations ────────────────────────────────────────────────

    async def add_requests(
        self,
        queue_id: str,
        requests: List[RQItemAdd],
        user_id: str,
    ) -> dict:
        """
        Batch-add URLs. Returns {processed, added, duplicate}.
        Dedup by unique_key (SHA-256 of URL by default).
        """
        added = 0
        duplicate = 0
        now_iso = datetime.now(timezone.utc).isoformat()

        # Get current max order for FIFO sequencing
        last = await self.db.rq_items.find_one(
            {"queue_id": queue_id}, sort=[("order", -1)]
        )
        order_counter = (last["order"] + 1) if last else 0

        for req in requests:
            uk = req.unique_key if req.unique_key else hashlib.sha256(req.url.encode()).hexdigest()

            # Check dedup
            exists = await self.db.rq_items.find_one(
                {"queue_id": queue_id, "unique_key": uk}, {"_id": 0, "id": 1}
            )
            if exists:
                duplicate += 1
                continue

            item = RQItem(
                queue_id=queue_id,
                unique_key=uk,
                url=req.url,
                method=req.method,
                headers=req.headers,
                payload=req.payload,
                no_retry=req.no_retry,
                user_data=req.user_data,
                order=order_counter,
            )
            doc = item.model_dump()
            doc["added_at"] = doc["added_at"].isoformat()
            await self.db.rq_items.insert_one(doc)
            order_counter += 1
            added += 1

        if added > 0:
            # Update queue stats
            await self.db.request_queues.update_one(
                {"id": queue_id},
                {
                    "$inc": {
                        "total_request_count": added,
                        "pending_request_count": added,
                    },
                    "$set": {"modified_at": now_iso},
                }
            )

        return {"processed": len(requests), "added": added, "duplicate": duplicate}

    async def get_head(
        self,
        queue_id: str,
        limit: int = 1,
        lock_secs: int = DEFAULT_LOCK_SECS,
        client_key: Optional[str] = None,
    ) -> List[dict]:
        """
        Atomically fetch next `limit` pending requests and lock them.
        Expired locks are also picked up automatically.
        Returns list of rq_item dicts.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        limit = min(limit, 25)
        results = []

        lock_expires = (
            datetime.now(timezone.utc) + timedelta(seconds=lock_secs)
        ).isoformat() if lock_secs > 0 else None

        for _ in range(limit):
            query = {
                "queue_id": queue_id,
                "$or": [
                    {"status": "pending"},
                    # Also unlock items whose lock has expired
                    {
                        "status": "locked",
                        "lock_expires_at": {"$lt": now_iso},
                    }
                ]
            }
            update = {
                "$set": {
                    "status": "locked",
                    "lock_by_client": client_key,
                    "lock_expires_at": lock_expires,
                }
            }
            item = await self.db.rq_items.find_one_and_update(
                query,
                update,
                sort=[("forefront", -1), ("order", 1)],  # forefront first, then FIFO
                return_document=True,
                projection={"_id": 0},
            )
            if item:
                results.append(item)
            else:
                break

        # Track multiple clients
        if client_key and results:
            existing_clients = await self.db.rq_items.distinct(
                "lock_by_client",
                {"queue_id": queue_id, "lock_by_client": {"$ne": None}}
            )
            if len(existing_clients) > 1:
                await self.db.request_queues.update_one(
                    {"id": queue_id}, {"$set": {"had_multiple_clients": True}}
                )

        await self.db.request_queues.update_one(
            {"id": queue_id},
            {"$set": {"accessed_at": now_iso}}
        )

        return results

    async def get_request(self, queue_id: str, unique_key: str) -> Optional[dict]:
        return await self.db.rq_items.find_one(
            {"queue_id": queue_id, "unique_key": unique_key}, {"_id": 0}
        )

    async def list_requests(
        self,
        queue_id: str,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        query: dict = {"queue_id": queue_id}
        if status:
            query["status"] = status
        total = await self.db.rq_items.count_documents(query)
        items = await self.db.rq_items.find(
            query, {"_id": 0}
        ).sort("order", 1).skip(offset).limit(limit).to_list(limit)
        return {"items": items, "total": total, "offset": offset, "limit": limit}

    async def mark_handled(
        self,
        queue_id: str,
        unique_key: str,
        loaded_url: Optional[str] = None,
    ) -> Optional[dict]:
        now_iso = datetime.now(timezone.utc).isoformat()
        item = await self.db.rq_items.find_one_and_update(
            {"queue_id": queue_id, "unique_key": unique_key},
            {
                "$set": {
                    "status": "handled",
                    "handled_at": now_iso,
                    "lock_by_client": None,
                    "lock_expires_at": None,
                    **({"loaded_url": loaded_url} if loaded_url else {}),
                }
            },
            return_document=True,
            projection={"_id": 0},
        )
        if item:
            await self.db.request_queues.update_one(
                {"id": queue_id},
                {
                    "$inc": {"handled_request_count": 1, "pending_request_count": -1},
                    "$set": {"modified_at": now_iso},
                }
            )
        return item

    async def reclaim_request(
        self,
        queue_id: str,
        unique_key: str,
        forefront: bool = False,
    ) -> Optional[dict]:
        """Return a locked/failed request back to pending for retry."""
        now_iso = datetime.now(timezone.utc).isoformat()

        # Check no_retry flag
        existing = await self.db.rq_items.find_one(
            {"queue_id": queue_id, "unique_key": unique_key}
        )
        if not existing:
            return None

        if existing.get("no_retry") and existing.get("retry_count", 0) > 0:
            # Mark as failed instead
            return await self._mark_failed(queue_id, unique_key)

        # Compute new order for forefront
        update_fields: Dict[str, Any] = {
            "status": "pending",
            "lock_by_client": None,
            "lock_expires_at": None,
            "forefront": forefront,
        }

        item = await self.db.rq_items.find_one_and_update(
            {"queue_id": queue_id, "unique_key": unique_key},
            {
                "$set": update_fields,
                "$inc": {"retry_count": 1},
            },
            return_document=True,
            projection={"_id": 0},
        )
        return item

    async def _mark_failed(self, queue_id: str, unique_key: str) -> Optional[dict]:
        now_iso = datetime.now(timezone.utc).isoformat()
        item = await self.db.rq_items.find_one_and_update(
            {"queue_id": queue_id, "unique_key": unique_key},
            {"$set": {"status": "failed", "handled_at": now_iso,
                      "lock_by_client": None, "lock_expires_at": None}},
            return_document=True, projection={"_id": 0},
        )
        if item:
            await self.db.request_queues.update_one(
                {"id": queue_id},
                {"$inc": {"handled_request_count": 1, "pending_request_count": -1}}
            )
        return item

    async def delete_request(self, queue_id: str, unique_key: str) -> bool:
        item = await self.db.rq_items.find_one(
            {"queue_id": queue_id, "unique_key": unique_key}
        )
        if not item:
            return False
        result = await self.db.rq_items.delete_one(
            {"queue_id": queue_id, "unique_key": unique_key}
        )
        if result.deleted_count > 0:
            dec = {"total_request_count": -1}
            if item["status"] == "pending":
                dec["pending_request_count"] = -1
            elif item["status"] == "handled":
                dec["handled_request_count"] = -1
            await self.db.request_queues.update_one(
                {"id": queue_id}, {"$inc": dec}
            )
        return result.deleted_count > 0

    async def is_finished(self, queue_id: str) -> bool:
        q = await self.db.request_queues.find_one({"id": queue_id})
        if not q:
            return False
        pending = await self.db.rq_items.count_documents(
            {"queue_id": queue_id, "status": {"$in": ["pending", "locked"]}}
        )
        return pending == 0

    # ── Indexes ───────────────────────────────────────────────────────────

    async def ensure_indexes(self):
        # Dedup index
        await self.db.rq_items.create_index(
            [("queue_id", 1), ("unique_key", 1)],
            unique=True, name="rq_items_dedup"
        )
        # HEAD query index: pending first, forefront priority, then FIFO order
        await self.db.rq_items.create_index(
            [("queue_id", 1), ("status", 1), ("forefront", -1), ("order", 1)],
            name="rq_items_head_query"
        )
        await self.db.request_queues.create_index(
            [("user_id", 1), ("name", 1)], name="rq_user_name"
        )
        await self.db.request_queues.create_index(
            [("run_id", 1)], name="rq_run_id", sparse=True
        )
        logger.info("RequestQueue indexes ensured")
