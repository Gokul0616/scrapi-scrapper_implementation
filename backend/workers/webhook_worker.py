"""
Webhook Worker — Celery task for dispatching webhook events.

Handles:
- Async HTTP delivery of webhook payloads (via httpx)
- HMAC-SHA256 request signing (X-Scrapi-Signature header)
- Exponential backoff retry (max 3 attempts)
- Failure count tracking in MongoDB
"""

import hashlib
import hmac
import json
import logging
import os
import sys
from datetime import datetime, timezone

# Ensure backend root is in sys.path for Celery child processes
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery_app import celery_app

logger = logging.getLogger(__name__)


def _build_signature(secret: str, payload: str) -> str:
    """Generate HMAC-SHA256 hex signature for the payload."""
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@celery_app.task(
    bind=True,
    name="workers.webhook_worker.dispatch_webhook",
    max_retries=3,
    default_retry_delay=30,  # seconds (doubled on each retry via countdown)
    queue="default",
)
def dispatch_webhook(self, webhook_id: str, event: str, payload: dict):
    """
    Celery task: deliver a single webhook event to its target URL.

    Args:
        webhook_id: MongoDB document ID of the webhook config.
        event:      Event name, e.g. "run.succeeded".
        payload:    JSON-serialisable dict sent as the request body.
    """
    import asyncio

    try:
        asyncio.run(_async_dispatch(self, webhook_id, event, payload))
    except Exception as exc:
        retry_count = self.request.retries
        countdown = 30 * (2 ** retry_count)  # 30s, 60s, 120s
        logger.warning(
            f"Webhook {webhook_id} delivery failed (attempt {retry_count + 1}/4). "
            f"Retrying in {countdown}s. Error: {exc}"
        )
        raise self.retry(exc=exc, countdown=countdown)


async def _async_dispatch(task, webhook_id: str, event: str, payload: dict):
    """Inner async function that performs the actual HTTP POST."""
    import httpx
    from motor.motor_asyncio import AsyncIOMotorClient

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "scrapi")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    try:
        webhook = await db.webhooks.find_one({"id": webhook_id})
        if not webhook:
            logger.warning(f"Webhook {webhook_id} not found — skipping delivery.")
            return

        if not webhook.get("is_enabled", True):
            logger.info(f"Webhook {webhook_id} is disabled — skipping.")
            return

        # Only deliver if this event type is subscribed
        subscribed_events = webhook.get("events", [])
        if subscribed_events and event not in subscribed_events:
            logger.info(f"Webhook {webhook_id} not subscribed to event '{event}' — skipping.")
            return

        target_url: str = webhook["url"]
        secret: str = webhook.get("secret", "")

        body = json.dumps(
            {
                "event": event,
                "webhook_id": webhook_id,
                "delivered_at": datetime.now(timezone.utc).isoformat(),
                "data": payload,
            },
            default=str,
        )

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Scrapi-Webhook/1.0",
            "X-Scrapi-Event": event,
            "X-Scrapi-Webhook-Id": webhook_id,
        }

        if secret:
            headers["X-Scrapi-Signature"] = f"sha256={_build_signature(secret, body)}"

        async with httpx.AsyncClient(timeout=15.0) as http:
            response = await http.post(target_url, content=body, headers=headers)

        status_code = response.status_code
        success = 200 <= status_code < 300

        # Persist delivery result
        now_iso = datetime.now(timezone.utc).isoformat()
        if success:
            await db.webhooks.update_one(
                {"id": webhook_id},
                {"$set": {"last_status": status_code, "last_triggered_at": now_iso, "failure_count": 0}},
            )
        else:
            await db.webhooks.update_one(
                {"id": webhook_id},
                {
                    "$set": {"last_status": status_code, "last_triggered_at": now_iso},
                    "$inc": {"failure_count": 1},
                },
            )

        if not success:
            raise RuntimeError(
                f"Webhook delivery returned non-2xx status {status_code} for {target_url}"
            )

        logger.info(f"✅ Webhook {webhook_id} delivered event '{event}' → {target_url} [{status_code}]")

    finally:
        client.close()
