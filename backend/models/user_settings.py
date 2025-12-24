"""User settings model for extended profile information."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

class UserSettings(BaseModel):
    """Extended user settings and profile information."""
    user_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    readme: Optional[str] = None
    homepage_url: Optional[str] = None
    github: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    discord: Optional[str] = None
    is_public: bool = False
    show_email: bool = False
    profile_picture: Optional[str] = None
    theme_preference: str = "light"  # "light", "dark", or "system"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
