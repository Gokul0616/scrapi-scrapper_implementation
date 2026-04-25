"""
WebhookService — CRUD + event dispatch for webhooks.

Responsibilities:
  - Create / list / update / delete webhook configurations
  - dispatch_event(): called from run lifecycle, fans out to all matching webhooks
  - test_webhook(): sends a synthetic ping for UI "test" button
  - ensure_indexes(): called on server startup
"""

import hashlib
import hmac
import json
import logging
import uuid
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.webhook import Webhook, WebhookCreate, WebhookPublic, WebhookUpdate, WEBHOOK_EVENTS

logger = logging.getLogger(__name__)


class WebhookService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    # ── Indexes ───────────────────────────────────────────────────────────────

    async def ensure_indexes(self):
        """Create MongoDB indexes. Called once on server startup."""
        await self.db.webhooks.create_index([("user_id", 1)])
        await self.db.webhooks.create_index([("actor_id", 1)])
        await self.db.webhooks.create_index([("is_enabled", 1)])
        await self.db.webhooks.create_index([("user_id", 1), ("actor_id", 1)])
        # TTL index: auto-delete delivery logs after 30 days
        await self.db.webhook_deliveries.create_index(
            [("delivered_at", 1)], expireAfterSeconds=2_592_000
        )
        await self.db.webhook_deliveries.create_index([("webhook_id", 1)])
        await self.db.webhook_deliveries.create_index([("run_id", 1)])
        logger.info("✅ Webhook indexes ensured")

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def create_webhook(
        self,
        user_id: str,
        data: WebhookCreate,
        organization_id: Optional[str] = None,
    ) -> Webhook:
        """Validate events and create a new webhook."""
        invalid_events = [e for e in data.events if e not in WEBHOOK_EVENTS]
        if invalid_events:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=f"Invalid event types: {invalid_events}. "
                       f"Valid events: {WEBHOOK_EVENTS}",
            )

        webhook = Webhook(
            user_id=user_id,
            organization_id=organization_id,
            actor_id=data.actor_id,
            url=str(data.url),
            events=data.events,
            is_enabled=data.is_enabled,
        )
        doc = webhook.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["modified_at"] = doc["modified_at"].isoformat()
        await self.db.webhooks.insert_one(doc)
        logger.info(f"Webhook created: {webhook.id} for user {user_id}")
        return webhook

    async def list_webhooks(
        self,
        user_id: str,
        actor_id: Optional[str] = None,
        organization_id: Optional[str] = None,
    ) -> List[dict]:
        query: dict = {}
        if organization_id:
            query["organization_id"] = organization_id
        else:
            query["user_id"] = user_id
        if actor_id:
            query["actor_id"] = actor_id

        docs = await self.db.webhooks.find(query, {"_id": 0}).to_list(None)
        return docs

    async def get_webhook(self, webhook_id: str, user_id: str) -> Optional[dict]:
        return await self.db.webhooks.find_one(
            {"id": webhook_id, "user_id": user_id}, {"_id": 0}
        )

    async def update_webhook(
        self, webhook_id: str, user_id: str, data: WebhookUpdate
    ) -> Optional[dict]:
        # Validate events if provided
        if data.events is not None:
            invalid = [e for e in data.events if e not in WEBHOOK_EVENTS]
            if invalid:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid event types: {invalid}",
                )

        updates: dict = {"modified_at": datetime.utcnow().isoformat()}
        if data.url is not None:
            updates["url"] = str(data.url)
        if data.events is not None:
            updates["events"] = data.events
        if data.actor_id is not None:
            updates["actor_id"] = data.actor_id
        if data.is_enabled is not None:
            updates["is_enabled"] = data.is_enabled

        result = await self.db.webhooks.find_one_and_update(
            {"id": webhook_id, "user_id": user_id},
            {"$set": updates},
            return_document=True,
        )
        if result:
            result.pop("_id", None)
        return result

    async def delete_webhook(self, webhook_id: str, user_id: str) -> bool:
        result = await self.db.webhooks.delete_one(
            {"id": webhook_id, "user_id": user_id}
        )
        if result.deleted_count > 0:
            # Clean up delivery history too
            await self.db.webhook_deliveries.delete_many({"webhook_id": webhook_id})
            logger.info(f"Webhook deleted: {webhook_id}")
            return True
        return False

    # ── Event Dispatch ────────────────────────────────────────────────────────

    async def dispatch_event(
        self,
        event: str,
        run_id: str,
        actor_id: str,
        user_id: str,
        organization_id: Optional[str] = None,
    ) -> int:
        """
        Fan out a lifecycle event to all matching webhooks.
        Returns the number of Celery tasks queued.
        """
        if event not in WEBHOOK_EVENTS:
            logger.warning(f"Unknown webhook event: {event}")
            return 0

        # Find all enabled webhooks that subscribe to this event
        # Match: correct user, event subscribed, (global OR actor-specific)
        query = {
            "user_id": user_id,
            "is_enabled": True,
            "events": event,
            "$or": [
                {"actor_id": None},
                {"actor_id": actor_id},
            ],
        }
        webhooks = await self.db.webhooks.find(query, {"_id": 0}).to_list(None)

        if not webhooks:
            return 0

        # Build the payload once — same for all webhooks for this event
        run = await self.db.runs.find_one({"id": run_id}, {"_id": 0}) or {}
        payload: Dict[str, Any] = {
            "event": event,
            "run": {
                "id": run_id,
                "actor_id": actor_id,
                "status": run.get("status"),
                "started_at": run.get("started_at"),
                "finished_at": run.get("finished_at"),
                "results_count": run.get("results_count", 0),
                "duration_seconds": run.get("duration_seconds"),
                "error_message": run.get("error_message"),
                "dataset_id": run.get("dataset_id"),
            },
        }

        # Queue one Celery task per matching webhook
        from workers.webhook_worker import dispatch_webhook
        queued = 0
        for wh in webhooks:
            try:
                dispatch_webhook.apply_async(
                    kwargs={
                        "webhook_id": wh["id"],
                        "event": event,
                        "payload": payload,
                    },
                    queue="webhooks",
                )
                queued += 1
            except Exception as exc:
                logger.error(
                    f"Failed to queue webhook {wh['id']} for event {event}: {exc}"
                )

        logger.info(
            f"Dispatched event '{event}' for run {run_id} → {queued} webhook(s) queued"
        )
        return queued

    # ── Delivery History ──────────────────────────────────────────────────────

    async def list_deliveries(
        self,
        webhook_id: str,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        # Verify ownership first
        wh = await self.get_webhook(webhook_id, user_id)
        if not wh:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Webhook not found")

        total = await self.db.webhook_deliveries.count_documents(
            {"webhook_id": webhook_id}
        )
        docs = (
            await self.db.webhook_deliveries.find(
                {"webhook_id": webhook_id}, {"_id": 0}
            )
            .sort("delivered_at", -1)
            .skip(offset)
            .limit(limit)
            .to_list(limit)
        )
        return {"deliveries": docs, "total": total, "offset": offset, "limit": limit}

    async def get_delivery(self, delivery_id: str, user_id: str) -> Optional[dict]:
        delivery = await self.db.webhook_deliveries.find_one(
            {"id": delivery_id}, {"_id": 0}
        )
        if not delivery:
            return None
        # Verify ownership via webhook
        wh = await self.get_webhook(delivery["webhook_id"], user_id)
        return delivery if wh else None

    # ── Test Ping ─────────────────────────────────────────────────────────────

    async def test_webhook(self, webhook_id: str, user_id: str) -> dict:
        """
        Send a synthetic 'test' ping to the webhook URL.
        Returns {success, status_code, error}.
        """
        import httpx

        wh = await self.get_webhook(webhook_id, user_id)
        if not wh:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Webhook not found")

        body = json.dumps(
            {
                "event": "test",
                "webhook_id": webhook_id,
                "delivered_at": datetime.now(timezone.utc).isoformat(),
                "data": {"message": "This is a test ping from Scrapi."},
            }
        )

        secret = wh.get("secret", "")
        signature = hmac.new(
            secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest() if secret else ""

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Scrapi-Webhook/1.0",
            "X-Scrapi-Event": "test",
            "X-Scrapi-Webhook-Id": webhook_id,
        }
        if signature:
            headers["X-Scrapi-Signature"] = f"sha256={signature}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                response = await http.post(wh["url"], content=body, headers=headers)
            success = 200 <= response.status_code < 300

            # Record this test delivery
            delivery_doc = {
                "id": str(uuid.uuid4()),
                "webhook_id": webhook_id,
                "event": "test",
                "run_id": "test",
                "attempt": 1,
                "status_code": response.status_code,
                "success": success,
                "response_body": response.text[:500],
                "error_message": None,
                "delivered_at": datetime.now(timezone.utc).isoformat(),
            }
            await self.db.webhook_deliveries.insert_one(delivery_doc)

            return {
                "success": success,
                "status_code": response.status_code,
                "error": None,
            }
        except Exception as exc:
            error_msg = str(exc)
            delivery_doc = {
                "id": str(uuid.uuid4()),
                "webhook_id": webhook_id,
                "event": "test",
                "run_id": "test",
                "attempt": 1,
                "status_code": None,
                "success": False,
                "response_body": None,
                "error_message": error_msg,
                "delivered_at": datetime.now(timezone.utc).isoformat(),
            }
            await self.db.webhook_deliveries.insert_one(delivery_doc)
            return {"success": False, "status_code": None, "error": error_msg}
