from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid

class Notification(BaseModel):
    notification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: Literal['welcome', 'info', 'success', 'warning', 'error'] = 'info'
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    link: Optional[str] = None
    icon: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "notification_id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "user123",
                "title": "Welcome to Scrapi!",
                "message": "Get started by creating your first actor.",
                "type": "welcome",
                "read": False,
                "created_at": "2025-01-01T00:00:00",
                "link": "/actors",
                "icon": "👋"
            }
        }

class NotificationResponse(BaseModel):
    notification_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime
    link: Optional[str] = None
    icon: Optional[str] = None

class MarkAsReadRequest(BaseModel):
    notification_ids: list[str]
