"""
Webhook Models — Pydantic schemas for webhook CRUD and delivery logging.

Run events:
  run.created             - Run was created and queued
  run.started             - Run transitioned to running
  run.succeeded           - Run completed with results
  run.failed              - Run failed with error
  run.aborted             - Run was manually aborted
  run.timed_out           - Run exceeded time limit

Build events (Phase 5 — mirrors Apify ACTOR.BUILD.*):
  actor.build.succeeded   - Build pipeline completed successfully
  actor.build.failed      - Build pipeline failed (syntax/security/schema error)
  actor.build.aborted     - Build was manually aborted
"""

import uuid
import secrets
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Supported events ──────────────────────────────────────────────────────────

WEBHOOK_EVENTS = [
    # Run lifecycle events
    "run.created",
    "run.started",
    "run.succeeded",
    "run.failed",
    "run.aborted",
    "run.timed_out",
    # Build lifecycle events (Phase 5 — CI/CD)
    "actor.build.succeeded",
    "actor.build.failed",
    "actor.build.aborted",
]


# ── Request / Response models ─────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    """Body for POST /api/webhooks"""
    url: str
    events: List[str]                    # must be subset of WEBHOOK_EVENTS
    actor_id: Optional[str] = None       # None = fires for ALL actors
    is_enabled: bool = True


class WebhookUpdate(BaseModel):
    """Body for PATCH /api/webhooks/{id}"""
    url: Optional[str] = None
    events: Optional[List[str]] = None
    actor_id: Optional[str] = None
    is_enabled: Optional[bool] = None


class Webhook(BaseModel):
    """Full webhook document (stored in MongoDB `webhooks` collection)."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: Optional[str] = None
    actor_id: Optional[str] = None       # None = global (all actors)
    url: str
    events: List[str]
    secret: str = Field(
        default_factory=lambda: secrets.token_hex(32)
    )                                    # HMAC-SHA256 signing secret
    is_enabled: bool = True
    failure_count: int = 0
    last_status: Optional[int] = None   # last HTTP response code
    last_triggered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    modified_at: datetime = Field(default_factory=datetime.utcnow)


class WebhookPublic(BaseModel):
    """Public view — secret is never returned after creation."""
    id: str
    user_id: str
    organization_id: Optional[str] = None
    actor_id: Optional[str] = None
    url: str
    events: List[str]
    is_enabled: bool
    failure_count: int
    last_status: Optional[int] = None
    last_triggered_at: Optional[datetime] = None
    created_at: datetime
    modified_at: datetime
