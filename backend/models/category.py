"""Category model for policy document categories."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid

class CategoryBase(BaseModel):
    name: str = Field(..., description="Category name (e.g., 'Legal Documents', 'Compliance')")
    description: Optional[str] = Field(None, description="Optional description of the category")
    display_order: int = Field(0, description="Order in which to display (lower numbers first)")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None

class Category(CategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = "system"
    updated_by: str = "system"

    class Config:
        json_schema_extra = {
            "example": {
                "id": "cat-123",
                "name": "Legal Documents",
                "description": "Legal policies and documents",
                "display_order": 0,
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
                "created_by": "admin",
                "updated_by": "admin"
            }
        }
