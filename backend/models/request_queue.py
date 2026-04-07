from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import uuid


class RequestQueue(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: Optional[str] = None
    run_id: Optional[str] = None
    name: Optional[str] = None          # None = unnamed
    is_named: bool = False
    total_request_count: int = 0
    handled_request_count: int = 0
    pending_request_count: int = 0
    had_multiple_clients: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accessed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None  # set for unnamed queues


class RequestQueueCreate(BaseModel):
    name: Optional[str] = None
    run_id: Optional[str] = None


class RQItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    queue_id: str
    unique_key: str                 # SHA-256 of URL by default; dedup key
    url: str
    method: str = "GET"
    headers: Dict[str, str] = Field(default_factory=dict)
    payload: Optional[Dict[str, Any]] = None   # POST body
    retry_count: int = 0
    no_retry: bool = False
    user_data: Dict[str, Any] = Field(default_factory=dict)
    loaded_url: Optional[str] = None           # actual URL after redirects
    status: str = "pending"         # pending | locked | handled | failed
    lock_by_client: Optional[str] = None       # clientKey of locker
    lock_expires_at: Optional[str] = None      # ISO datetime
    forefront: bool = False         # True = high priority (processed first)
    order: int = 0                  # sequence number; lower = earlier in FIFO
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    handled_at: Optional[str] = None


class RQItemAdd(BaseModel):
    """A single URL request to enqueue."""
    url: str
    unique_key: Optional[str] = None   # if None → SHA-256(url)
    method: str = "GET"
    headers: Dict[str, str] = Field(default_factory=dict)
    payload: Optional[Dict[str, Any]] = None
    no_retry: bool = False
    user_data: Dict[str, Any] = Field(default_factory=dict)


class RQBatchAdd(BaseModel):
    requests: List[RQItemAdd]


class RQMarkHandled(BaseModel):
    loaded_url: Optional[str] = None


class RQReclaim(BaseModel):
    forefront: bool = False
