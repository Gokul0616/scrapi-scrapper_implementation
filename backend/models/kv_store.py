from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Optional
from datetime import datetime, timezone
import uuid


class KVStore(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: Optional[str] = None
    run_id: Optional[str] = None        # None = global/named store
    name: Optional[str] = None          # None = unnamed (expires in 7 days)
    is_named: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accessed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None  # set for unnamed stores


class KVStoreCreate(BaseModel):
    name: Optional[str] = None
    run_id: Optional[str] = None


class KVStoreUpdate(BaseModel):
    name: str


class KVStoreItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_id: str
    key: str                             # max 63 chars (Scrapi limit)
    value_type: str = "json"            # "json" | "text" | "binary"
    json_value: Optional[Any] = None    # for json/text types
    gridfs_id: Optional[str] = None     # ObjectId string — for binary types (GridFS)
    content_type: str = "application/json"
    content_encoding: Optional[str] = None  # e.g. "gzip"
    size_bytes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class KVStoreKeyInfo(BaseModel):
    """Returned when listing keys (never includes value)."""
    key: str
    content_type: str
    size_bytes: int
    created_at: str
