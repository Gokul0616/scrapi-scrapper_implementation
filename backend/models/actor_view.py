from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid

class ActorView(BaseModel):
    """Model for tracking when users view actors."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    actor_id: str
    viewed_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user123",
                "actor_id": "actor456",
                "viewed_at": "2024-01-01T12:00:00"
            }
        }
