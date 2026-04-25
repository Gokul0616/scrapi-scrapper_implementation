"""
API Key Models — Enhanced with scopes, expiry, usage tracking.
Matches Apify-level developer access model.
"""

import uuid
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Supported Scopes ──────────────────────────────────────────────────────────
VALID_SCOPES = [
    "runs:read",
    "runs:write",
    "actors:read",
    "actors:write",
    "datasets:read",
    "datasets:write",
    "storage:read",
    "storage:write",
    "webhooks:read",
    "webhooks:write",
    "pipelines:read",
    "pipelines:write",
]


# ── Request / Response Models ─────────────────────────────────────────────────

class ApiKeyCreate(BaseModel):
    name: str
    scopes: List[str] = VALID_SCOPES   # default: full access
    expires_in_days: Optional[int] = None  # None = never expires


class ApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    scopes: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ApiKey(BaseModel):
    """Full API key document stored in MongoDB `api_keys` collection."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: Optional[str] = None
    name: str
    key_hash: str                           # SHA-256 for authentication
    raw_key: str                            # stored so user can always view it
    prefix: str                             # First 20 chars for display
    scopes: List[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None  # None = never
    last_used_at: Optional[datetime] = None
    usage_count: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ApiKeyDisplay(BaseModel):
    """Public view — key_hash never returned."""
    id: str
    name: str
    organization_id: Optional[str] = None
    prefix: str
    full_key: Optional[str] = None          # always returned so user can view/copy
    scopes: List[str]
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    usage_count: int = 0
    is_active: bool
    created_at: datetime
    has_active_timer: bool = False
    is_expired: bool = False
