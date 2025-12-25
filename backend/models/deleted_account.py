from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class DeletedAccountLegalRetention(BaseModel):
    """Legal retention data for deleted accounts (7-year retention for compliance)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    email: str
    organization_name: Optional[str] = None
    account_created_at: datetime
    account_deleted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletion_reason: Optional[str] = None
    last_login_at: Optional[datetime] = None
    retention_expires_at: datetime  # 7 years from deletion
    
class DeletionFeedback(BaseModel):
    """User feedback for account deletion"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    email: str
    reason: str  # 'too_expensive', 'lack_features', 'found_alternative', 'privacy_concerns', 'other'
    feedback_text: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
