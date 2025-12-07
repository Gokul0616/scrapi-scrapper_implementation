from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

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
