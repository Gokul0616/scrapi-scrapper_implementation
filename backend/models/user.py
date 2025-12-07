from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    organization_name: Optional[str] = None

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
    last_path: Optional[str] = None  # Store last visited path for redirect after login
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    organization_name: Optional[str] = None
    plan: str
