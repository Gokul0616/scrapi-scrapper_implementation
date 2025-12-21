from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DocSection(BaseModel):
    """Model for a searchable documentation section (e.g., Academy, Platform components)."""
    id: str = Field(..., description="Unique identifier for the doc section")
    title: str = Field(..., description="Title of the documentation card/section")
    content: str = Field(..., description="Description or content for search indexing")
    category: str = Field(..., description="Category (Acamedy, Platform, SDK, etc.)")
    url_path: str = Field(..., description="URL to navigate to")
    icon: Optional[str] = Field(None, description="Icon name or unicode")
    tags: List[str] = Field(default_factory=list, description="Searchable tags")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
