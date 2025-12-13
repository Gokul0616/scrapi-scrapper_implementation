from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid
import secrets

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyDisplay(BaseModel):
    id: str
    name: str
    prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    has_active_timer: bool = False

class ApiKey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    key_hash: str
    prefix: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used_at: Optional[datetime] = None
    is_active: bool = True
