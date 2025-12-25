from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    plan: str = "Free"
    role: str = "user"  # Normal user from scraper website - default is user
    is_active: bool = True
    account_status: str = "active"  # "active", "pending_deletion", "deleted"
    deletion_scheduled_at: Optional[datetime] = None
    permanent_deletion_at: Optional[datetime] = None
    deletion_password_hash: Optional[str] = None  # Store for re-auth during grace period
    deletion_reminder_sent: bool = False
    last_login_at: Optional[datetime] = None
    last_path: Optional[str] = None  # Store last visited path for redirect after login
    profile_color: Optional[str] = None  # Store user's profile avatar color
    theme_preference: str = "light"  # Theme preference: "light", "dark", or "system"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    plan: str
    role: str = "user"
    is_active: bool = True
    created_at: str
    last_login_at: Optional[str] = None
    profile_color: Optional[str] = None
    profile_picture: Optional[str] = None
    theme_preference: str = "light"
