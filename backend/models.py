from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# User Models
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
    last_path: Optional[str] = None  # Store last visited path for redirect after login
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    organization_name: Optional[str] = None
    plan: str

# Actor Models
class Actor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# Run Models
class RunInput(BaseModel):
    search_terms: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    location: Optional[str] = None
    max_results: int = 100
    extract_reviews: bool = False
    extract_images: bool = False
    custom_input: Optional[Dict[str, Any]] = None

class Run(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    actor_id: str
    actor_name: str
    actor_icon: Optional[str] = None
    status: str = "queued"  # queued, running, succeeded, failed, aborted
    input_data: Dict[str, Any] = Field(default_factory=dict)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    results_count: int = 0
    dataset_id: Optional[str] = None
    error_message: Optional[str] = None
    logs: List[str] = Field(default_factory=list)
    cost: float = 0.0
    build_number: Optional[str] = None
    origin: str = "Web"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RunCreate(BaseModel):
    actor_id: str
    input_data: Dict[str, Any]

# Dataset Models
class DatasetItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str
    data: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Dataset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str
    user_id: str
    item_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Proxy Models
class Proxy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: str = "http"  # http, https, socks5
    is_active: bool = True
    success_count: int = 0
    failure_count: int = 0
    last_used: Optional[datetime] = None
    last_check: Optional[datetime] = None
    response_time: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProxyCreate(BaseModel):
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: str = "http"

# Lead Chat Models
class LeadChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str  # Dataset item ID
    user_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadChatRequest(BaseModel):
    message: str
    lead_data: Dict[str, Any]  # Business/lead information for context

# Global Chat Models
class GlobalChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: str  # 'user' or 'assistant' or 'system'
    content: str
    function_call: Optional[Dict[str, Any]] = None  # For storing function calls
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GlobalChatRequest(BaseModel):
    message: str

# Visual Scraper Builder Models - REMOVED
# ScraperField, PaginationConfig, ScraperConfig, ScraperConfigCreate, 
# ScraperConfigUpdate, ScraperTestRequest models have been removed
