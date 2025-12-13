from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class Actor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    api_id: str = Field(default_factory=lambda: f"actor_{uuid.uuid4().hex}")
    user_id: str
    name: str
    description: str
    icon: str = "🕷️"
    category: str = "General"
    type: str = "prebuilt"  # prebuilt or custom
    code: Optional[str] = None  # For custom actors
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    is_public: bool = False
    is_starred: bool = False
    runs_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # New fields for scraper creation
    status: str = "draft"  # draft, published, archived
    tags: List[str] = Field(default_factory=list)
    readme: Optional[str] = None  # Markdown documentation
    pricing_tier: str = "free"  # free or paid
    monetization_enabled: bool = False  # Coming soon feature
    version: str = "1.0.0"
    author_name: Optional[str] = None
    author_id: str = ""  # Same as user_id, kept for clarity
    rating: float = 0.0  # Average rating (0-5)
    rating_count: int = 0  # Number of ratings
    is_featured: bool = False
    is_verified: bool = False
    fork_from: Optional[str] = None  # Parent actor ID if cloned
    template_type: Optional[str] = None  # google_maps, linkedin, ecommerce, generic, api
    visibility: str = "private"  # private, public, team

class ActorCreate(BaseModel):
    name: str
    description: str
    icon: str = "🕷️"
    category: str = "General"
    type: str = "prebuilt"
    code: Optional[str] = None
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    readme: Optional[str] = None
    template_type: Optional[str] = None
    visibility: str = "private"

class ActorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    is_starred: Optional[bool] = None
    tags: Optional[List[str]] = None
    readme: Optional[str] = None
    code: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    version: Optional[str] = None

class ActorPublish(BaseModel):
    readme: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: str = "public"
