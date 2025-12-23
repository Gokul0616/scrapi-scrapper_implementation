from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    organization_name: Optional[str] = None
    role: Optional[str] = None  # owner or admin - only allowed when no owner exists

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    organization_name: Optional[str] = None
    plan: str = "Free"
    role: str = "user"  # Normal user from scraper website - default is user
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    last_path: Optional[str] = None  # Store last visited path for redirect after login
    profile_color: Optional[str] = None  # Store user's profile avatar color
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    organization_name: Optional[str] = None
    plan: str
    role: str = "user"
    is_active: bool = True
    created_at: str
    last_login_at: Optional[str] = None
    profile_color: Optional[str] = None
