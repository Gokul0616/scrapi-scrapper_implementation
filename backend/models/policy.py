from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class PolicySubsection(BaseModel):
    """Subsection within a policy section."""
    id: str
    title: str
    content: str


class PolicyTableRow(BaseModel):
    """Row in a policy table."""
    name: str
    description: str
    type: str
    expiration: Optional[str] = None
    location: Optional[str] = None


class PolicySection(BaseModel):
    """Main content section of a policy."""
    id: str
    title: str
    content: str
    subsections: Optional[List[PolicySubsection]] = []
    table: Optional[List[Dict[str, Any]]] = []


class SidebarItem(BaseModel):
    """Navigation item for left sidebar."""
    id: str
    title: str
    icon: Optional[str] = None  # emoji or icon name
    link: Optional[str] = None  # internal link to section


class Policy(BaseModel):
    """Legal/Policy document model with dynamic structure."""
    doc_id: str = Field(..., description="Unique identifier (e.g., 'cookie-policy')")
    title: str
    label: Optional[str] = Field(None, description="Display label for sidebar (defaults to title if not provided)")
    category: str = Field(default="Legal Documents", description="Category: 'Legal Documents' or 'Compliance'")
    is_public: bool = Field(default=True, description="Whether this policy is visible on public landing site")
    last_updated: str
    intro: str
    sidebar_items: List[SidebarItem] = Field(default_factory=list, description="Left sidebar navigation")
    sections: List[PolicySection] = Field(..., description="Main content sections")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "doc_id": "cookie-policy",
                "title": "Cookie Policy",
                "last_updated": "August 15, 2025",
                "intro": "This Cookie Policy describes how we use cookies...",
                "sidebar_items": [
                    {"id": "cookies", "title": "What are Cookies?", "icon": "🍪"},
                    {"id": "types", "title": "Types of Cookies", "icon": "📋"}
                ],
                "sections": [
                    {
                        "id": "cookies",
                        "title": "What are Cookies?",
                        "content": "Cookies are small text files...",
                        "subsections": [],
                        "table": []
                    }
                ]
            }
        }


class PolicyCreate(BaseModel):
    """Schema for creating a new policy."""
    doc_id: str
    title: str
    label: Optional[str] = None
    category: str = "Legal Documents"
    is_public: bool = True
    last_updated: str
    intro: str
    sidebar_items: List[SidebarItem] = Field(default_factory=list)
    sections: List[PolicySection]


class PolicyUpdate(BaseModel):
    """Schema for updating an existing policy."""
    title: Optional[str] = None
    last_updated: Optional[str] = None
    intro: Optional[str] = None
    sidebar_items: Optional[List[SidebarItem]] = None
    sections: Optional[List[PolicySection]] = None
