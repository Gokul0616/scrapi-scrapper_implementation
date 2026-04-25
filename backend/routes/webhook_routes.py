"""
Webhook Routes — REST API for managing webhooks.

Endpoints:
  POST   /api/webhooks                         Create webhook
  GET    /api/webhooks                         List webhooks
  GET    /api/webhooks/{id}                    Get single webhook
  PATCH  /api/webhooks/{id}                    Update webhook
  DELETE /api/webhooks/{id}                    Delete webhook
  POST   /api/webhooks/{id}/test               Send test ping
  GET    /api/webhooks/{id}/deliveries         Delivery history
  GET    /api/webhooks/{id}/deliveries/{did}   Single delivery detail
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth import get_current_user
from database import get_db
from models.webhook import WebhookCreate, WebhookUpdate, WEBHOOK_EVENTS
from routes.dependencies import get_api_user
from services.webhook_service import WebhookService

logger = logging.getLogger(__name__)
router = APIRouter()


def _svc() -> WebhookService:
    return WebhookService(get_db())


# ── Create ─────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_webhook(
    body: WebhookCreate,
    request: Request,
    current_user: dict = Depends(get_api_user),
):
    """Create a new webhook subscription."""
    workspace_type = getattr(request.state, "workspace_type", "personal")
    workspace_id = getattr(request.state, "workspace_id", "")
    org_id = workspace_id if workspace_type == "organization" else None

    webhook = await _svc().create_webhook(
        user_id=current_user["id"],
        data=body,
        organization_id=org_id,
    )

    # Return full webhook including secret ONLY on creation (like GitHub / Apify)
    doc = webhook.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["modified_at"] = doc["modified_at"].isoformat()
    return doc


# ── List ───────────────────────────────────────────────────────────────────────

@router.get("")
async def list_webhooks(
    actor_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List all webhooks for the current user (or organization workspace)."""
    webhooks = await _svc().list_webhooks(
        user_id=current_user["id"],
        actor_id=actor_id,
    )
    # Strip the secret from list responses
    for wh in webhooks:
        wh.pop("secret", None)
    return {"webhooks": webhooks, "total": len(webhooks)}


# ── Get single ─────────────────────────────────────────────────────────────────

@router.get("/events")
async def list_supported_events():
    """Return all supported webhook event types."""
    return {"events": WEBHOOK_EVENTS}


@router.get("/{webhook_id}")
async def get_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single webhook (secret not returned)."""
    wh = await _svc().get_webhook(webhook_id, current_user["id"])
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    wh.pop("secret", None)
    return wh


# ── Update ─────────────────────────────────────────────────────────────────────

@router.patch("/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    body: WebhookUpdate,
    current_user: dict = Depends(get_api_user),
):
    """Partially update a webhook (PATCH semantics)."""
    updated = await _svc().update_webhook(webhook_id, current_user["id"], body)
    if not updated:
        raise HTTPException(status_code=404, detail="Webhook not found")
    updated.pop("secret", None)
    return updated


# ── Delete ─────────────────────────────────────────────────────────────────────

@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a webhook and its delivery history."""
    ok = await _svc().delete_webhook(webhook_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"success": True}


# ── Test Ping ──────────────────────────────────────────────────────────────────

@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_api_user),
):
    """
    Send a synthetic test ping to the webhook URL.
    Returns {success, status_code, error}.
    """
    result = await _svc().test_webhook(webhook_id, current_user["id"])
    return result


# ── Delivery History ───────────────────────────────────────────────────────────

@router.get("/{webhook_id}/deliveries")
async def list_deliveries(
    webhook_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List delivery attempts for a webhook (newest first)."""
    return await _svc().list_deliveries(
        webhook_id=webhook_id,
        user_id=current_user["id"],
        limit=limit,
        offset=offset,
    )


@router.get("/{webhook_id}/deliveries/{delivery_id}")
async def get_delivery(
    webhook_id: str,
    delivery_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single webhook delivery record."""
    delivery = await _svc().get_delivery(delivery_id, current_user["id"])
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery record not found")
    return delivery
