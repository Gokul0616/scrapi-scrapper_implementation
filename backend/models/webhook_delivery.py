"""
WebhookDelivery Model — stores per-attempt delivery history.

Every time a webhook fires (including retries), one document is written.
A TTL index auto-deletes records older than 30 days (like Apify).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WebhookDelivery(BaseModel):
    """One delivery attempt for a webhook event."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_id: str
    event: str                          # e.g. "run.succeeded"
    run_id: str
    attempt: int                        # 1 = first try, 2-4 = retries
    status_code: Optional[int] = None  # None if network error
    success: bool
    response_body: Optional[str] = None  # first 500 chars of response
    error_message: Optional[str] = None  # set if exception occurred
    delivered_at: datetime = Field(default_factory=datetime.utcnow)
