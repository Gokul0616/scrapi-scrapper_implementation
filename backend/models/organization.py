from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Organization(BaseModel):
    """Organization model - represents a workspace that multiple users can belong to."""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Organization name
    display_name: str  # Display name shown in UI
    description: Optional[str] = None
    owner_id: str  # User ID of the owner
    plan: str = "Free"  # Billing plan for this organization
    is_active: bool = True
    settings: dict = Field(default_factory=dict)  # Organization-wide settings
    billing_email: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrganizationCreate(BaseModel):
    """Request model for creating an organization."""
    name: str  # Organization identifier (lowercase, no spaces)
    display_name: str  # Display name
    description: Optional[str] = None
    billing_email: Optional[str] = None

class OrganizationUpdate(BaseModel):
    """Request model for updating an organization."""
    display_name: Optional[str] = None
    description: Optional[str] = None
    billing_email: Optional[str] = None
    settings: Optional[dict] = None

class OrganizationResponse(BaseModel):
    """Response model for organization data."""
    id: str
    name: str
    display_name: str
    description: Optional[str] = None
    owner_id: str
    plan: str
    is_active: bool
    member_count: int = 0
    billing_email: Optional[str] = None
    created_at: str
    updated_at: str
    user_role: Optional[str] = None  # Current user's role in this org

class OrganizationMembership(BaseModel):
    """Membership model - links users to organizations with roles."""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    user_id: str
    role: str = "member"  # "owner", "admin", "member"
    invited_by: Optional[str] = None  # User ID who invited this member
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class MembershipInvite(BaseModel):
    """Request model for inviting a member to organization."""
    email: str
    role: str = "member"  # "admin" or "member" (owner cannot be invited)

class MembershipUpdate(BaseModel):
    """Request model for updating a member's role."""
    role: str  # "admin" or "member"

class MemberResponse(BaseModel):
    """Response model for organization member data."""
    id: str
    user_id: str
    username: str
    email: str
    role: str
    joined_at: str
    is_active: bool

class WorkspaceContext(BaseModel):
    """Workspace context - represents which account the user is currently using."""
    workspace_type: str  # "personal" or "organization"
    workspace_id: str  # user_id for personal, organization_id for organization
    workspace_name: str  # Display name
    role: Optional[str] = None  # Role in organization (if applicable)

class WorkspaceResponse(BaseModel):
    """Response model for available workspaces."""
    workspaces: List[WorkspaceContext]
    current_workspace: WorkspaceContext
