from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    website_check: Optional[str] = None  # Honeypot
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None
    shield_nonce: Optional[str] = None
    shield_solution: Optional[int] = None
    fingerprint: Optional[Dict[str, Any]] = None

class UserLogin(BaseModel):
    username: str
    password: str
    website_check: Optional[str] = None  # Honeypot
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None
    shield_nonce: Optional[str] = None
    shield_solution: Optional[int] = None
    fingerprint: Optional[Dict[str, Any]] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    plan: str = "Free"
    subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    platform_credits: float = 5.0
    limits: dict = Field(default_factory=dict)
    spending_limit: Optional[float] = None
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
    auth_provider: str = "email"  # "email", "google", "github" etc.
    google_id: Optional[str] = None # Google's unique subject ID
    github_id: Optional[str] = None # GitHub's unique user ID
    github_username: Optional[str] = None # GitHub's login/username
    github_access_token: Optional[str] = None # Store to access repos later
    expires_at: Optional[datetime] = None # Subscription expiration date
    billing_period: str = "monthly" # "monthly" or "yearly"
    expiry_reminder_sent: dict = Field(default_factory=dict) # Track sent reminders: {"5d": bool, "2d": bool, "0d": bool}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    plan: str
    role: str = "user"
    is_active: bool = True
    account_status: str = "active"
    deletion_scheduled_at: Optional[datetime] = None
    permanent_deletion_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None
    profile_color: Optional[str] = None
    profile_picture: Optional[str] = None
    theme_preference: str = "light"
    auth_provider: str = "email"
