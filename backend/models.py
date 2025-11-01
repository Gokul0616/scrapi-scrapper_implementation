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

# Visual Scraper Builder Models
class ScraperField(BaseModel):
    """Field extraction configuration"""
    name: str  # Field name (e.g., 'title', 'price')
    selector: str  # CSS or XPath selector
    selector_type: str = "css"  # css or xpath
    extract_type: str = "text"  # text, attribute, html, link, image
    attribute: Optional[str] = None  # For extract_type='attribute'
    multiple: bool = False  # Extract multiple elements
    transform: Optional[str] = None  # regex, clean, number, etc.
    required: bool = False
    default_value: Optional[str] = None

class PaginationConfig(BaseModel):
    """Pagination configuration"""
    enabled: bool = False
    type: str = "next_button"  # next_button, load_more, infinite_scroll, url_pattern
    next_selector: Optional[str] = None  # CSS selector for next button
    max_pages: int = 10
    wait_after_load: int = 2000  # milliseconds
    stop_if_no_new_items: bool = True

class ScraperConfig(BaseModel):
    """Complete scraper configuration (Apify-like Actor)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    icon: str = "🕷️"
    
    # Scraper configuration
    start_urls: List[str] = Field(default_factory=list)
    fields: List[ScraperField] = Field(default_factory=list)
    pagination: PaginationConfig = Field(default_factory=PaginationConfig)
    
    # Browser & execution settings
    use_browser: bool = True  # Use Playwright vs requests
    wait_for_selector: Optional[str] = None  # Wait for element before scraping
    wait_timeout: int = 30000  # milliseconds
    delay_between_pages: int = 2000  # milliseconds
    
    # Proxy & anti-detection
    use_proxy: bool = False
    proxy_type: str = "datacenter"  # datacenter, residential
    stealth_mode: bool = True
    user_agent: Optional[str] = None
    
    # Limits & error handling
    max_pages: int = 50
    max_items: Optional[int] = None
    retry_failed: bool = True
    max_retries: int = 3
    
    # Advanced
    custom_code: Optional[str] = None  # Python code for custom logic
    pre_navigation_code: Optional[str] = None  # Run before page load
    post_scrape_code: Optional[str] = None  # Run after scraping
    
    # Metadata
    category: str = "General"
    tags: List[str] = Field(default_factory=list)
    status: str = "draft"  # draft, active, archived
    is_public: bool = False
    template_type: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScraperConfigCreate(BaseModel):
    """Create scraper configuration"""
    name: str
    description: str
    icon: str = "🕷️"
    start_urls: List[str]
    fields: List[ScraperField] = Field(default_factory=list)
    pagination: Optional[PaginationConfig] = None
    use_browser: bool = True
    category: str = "General"
    tags: List[str] = Field(default_factory=list)

class ScraperConfigUpdate(BaseModel):
    """Update scraper configuration"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    start_urls: Optional[List[str]] = None
    fields: Optional[List[ScraperField]] = None
    pagination: Optional[PaginationConfig] = None
    use_browser: Optional[bool] = None
    wait_for_selector: Optional[str] = None
    delay_between_pages: Optional[int] = None
    use_proxy: Optional[bool] = None
    max_pages: Optional[int] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

class ScraperTestRequest(BaseModel):
    """Test scraper on a single URL"""
    url: str
    fields: List[ScraperField]
    use_browser: bool = True
    wait_for_selector: Optional[str] = None
