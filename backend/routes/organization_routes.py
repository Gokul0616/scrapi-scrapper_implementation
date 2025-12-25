from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from models.organization import (
    Organization, OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrganizationMembership, MembershipInvite, MembershipUpdate, MemberResponse,
    WorkspaceContext, WorkspaceResponse
)
from auth import get_current_user
import logging
import re

logger = logging.getLogger(__name__)

# This will be set by server.py
db = None

def set_db(database):
    global db
    db = database

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

# ============= Helper Functions =============

def validate_organization_name(name: str) -> tuple[bool, str]:
    """Validate organization name format."""
    if not name:
        return False, "Organization name is required"
    if len(name) < 3:
        return False, "Organization name must be at least 3 characters"
    if len(name) > 50:
        return False, "Organization name must be less than 50 characters"
    if not re.match(r'^[a-z0-9-]+$', name):
        return False, "Organization name can only contain lowercase letters, numbers, and hyphens"
    if name.startswith('-') or name.endswith('-'):
        return False, "Organization name cannot start or end with a hyphen"
    return True, ""

async def get_user_organizations(user_id: str) -> List[dict]:
    """Get all organizations where user is a member."""
    memberships = await db.organization_memberships.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(1000)
    
    organizations = []
    for membership in memberships:
        org = await db.organizations.find_one(
            {"id": membership['organization_id'], "is_active": True},
            {"_id": 0}
        )
        if org:
            org['user_role'] = membership['role']
            organizations.append(org)
    
    return organizations

async def get_user_role_in_org(user_id: str, org_id: str) -> Optional[str]:
    """Get user's role in an organization."""
    membership = await db.organization_memberships.find_one({
        "user_id": user_id,
        "organization_id": org_id,
        "is_active": True
    })
    return membership['role'] if membership else None

async def count_owned_organizations(user_id: str) -> int:
    """Count how many organizations a user owns."""
    return await db.organizations.count_documents({
        "owner_id": user_id,
        "is_active": True
    })

# ============= Workspace Routes =============

@router.get("/workspaces", response_model=WorkspaceResponse)
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    """Get all available workspaces for the current user (personal + organizations)."""
    workspaces = []
    
    # Add personal workspace
    user_doc = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    if user_doc:
        workspaces.append(WorkspaceContext(
            workspace_type="personal",
            workspace_id=user_doc['id'],
            workspace_name=user_doc['username'],
            role=None
        ))
    
    # Add organization workspaces
    orgs = await get_user_organizations(current_user['id'])
    for org in orgs:
        workspaces.append(WorkspaceContext(
            workspace_type="organization",
            workspace_id=org['id'],
            workspace_name=org['display_name'],
            role=org.get('user_role')
        ))
    
    # Get current workspace from session/header (default to personal)
    # For now, default to personal workspace
    current_workspace = workspaces[0] if workspaces else WorkspaceContext(
        workspace_type="personal",
        workspace_id=current_user['id'],
        workspace_name=current_user.get('username', 'Personal'),
        role=None
    )
    
    return WorkspaceResponse(
        workspaces=workspaces,
        current_workspace=current_workspace
    )

# ============= Organization CRUD Routes =============

@router.post("", response_model=OrganizationResponse)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new organization. Users can own up to 5 organizations."""
    
    # Validate organization name
    is_valid, error_msg = validate_organization_name(org_data.name)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check if name already exists
    existing = await db.organizations.find_one({"name": org_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Organization name already exists")
    
    # Check ownership limit (5 organizations per user)
    owned_count = await count_owned_organizations(current_user['id'])
    if owned_count >= 5:
        raise HTTPException(
            status_code=400,
            detail="You have reached the maximum limit of 5 organizations. Please delete an existing organization to create a new one."
        )
    
    # Get user email for billing
    user_doc = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    billing_email = org_data.billing_email or user_doc.get('email')
    
    # Create organization
    organization = Organization(
        name=org_data.name,
        display_name=org_data.display_name,
        description=org_data.description,
        owner_id=current_user['id'],
        billing_email=billing_email
    )
    
    doc = organization.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.organizations.insert_one(doc)
    
    # Create owner membership
    membership = OrganizationMembership(
        organization_id=organization.id,
        user_id=current_user['id'],
        role="owner"
    )
    
    membership_doc = membership.model_dump()
    membership_doc['joined_at'] = membership_doc['joined_at'].isoformat()
    await db.organization_memberships.insert_one(membership_doc)
    
    return OrganizationResponse(
        id=organization.id,
        name=organization.name,
        display_name=organization.display_name,
        description=organization.description,
        owner_id=organization.owner_id,
        plan=organization.plan,
        is_active=organization.is_active,
        member_count=1,
        billing_email=organization.billing_email,
        created_at=doc['created_at'],
        updated_at=doc['updated_at'],
        user_role="owner"
    )

@router.get("", response_model=List[OrganizationResponse])
async def list_organizations(current_user: dict = Depends(get_current_user)):
    """List all organizations the user is a member of."""
    orgs = await get_user_organizations(current_user['id'])
    
    result = []
    for org in orgs:
        # Count members
        member_count = await db.organization_memberships.count_documents({
            "organization_id": org['id'],
            "is_active": True
        })
        
        result.append(OrganizationResponse(
            id=org['id'],
            name=org['name'],
            display_name=org['display_name'],
            description=org.get('description'),
            owner_id=org['owner_id'],
            plan=org.get('plan', 'Free'),
            is_active=org.get('is_active', True),
            member_count=member_count,
            billing_email=org.get('billing_email'),
            created_at=org.get('created_at', datetime.now(timezone.utc).isoformat()),
            updated_at=org.get('updated_at', datetime.now(timezone.utc).isoformat()),
            user_role=org.get('user_role')
        ))
    
    return result

@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get organization details."""
    # Check if user is a member
    role = await get_user_role_in_org(current_user['id'], org_id)
    if not role:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")
    
    org = await db.organizations.find_one({"id": org_id, "is_active": True}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Count members
    member_count = await db.organization_memberships.count_documents({
        "organization_id": org_id,
        "is_active": True
    })
    
    return OrganizationResponse(
        id=org['id'],
        name=org['name'],
        display_name=org['display_name'],
        description=org.get('description'),
        owner_id=org['owner_id'],
        plan=org.get('plan', 'Free'),
        is_active=org.get('is_active', True),
        member_count=member_count,
        billing_email=org.get('billing_email'),
        created_at=org.get('created_at', datetime.now(timezone.utc).isoformat()),
        updated_at=org.get('updated_at', datetime.now(timezone.utc).isoformat()),
        user_role=role
    )

@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    updates: OrganizationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update organization details. Only owner and admin can update."""
    # Check if user is owner or admin
    role = await get_user_role_in_org(current_user['id'], org_id)
    if role not in ['owner', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only organization owner and admins can update organization details"
        )
    
    org = await db.organizations.find_one({"id": org_id, "is_active": True}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Prepare update data
    update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.organizations.update_one(
        {"id": org_id},
        {"$set": update_data}
    )
    
    # Get updated organization
    updated_org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    member_count = await db.organization_memberships.count_documents({
        "organization_id": org_id,
        "is_active": True
    })
    
    return OrganizationResponse(
        id=updated_org['id'],
        name=updated_org['name'],
        display_name=updated_org['display_name'],
        description=updated_org.get('description'),
        owner_id=updated_org['owner_id'],
        plan=updated_org.get('plan', 'Free'),
        is_active=updated_org.get('is_active', True),
        member_count=member_count,
        billing_email=updated_org.get('billing_email'),
        created_at=updated_org.get('created_at', datetime.now(timezone.utc).isoformat()),
        updated_at=updated_org.get('updated_at', datetime.now(timezone.utc).isoformat()),
        user_role=role
    )

@router.delete("/{org_id}")
async def delete_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an organization. Only owner can delete."""
    # Check if user is owner
    role = await get_user_role_in_org(current_user['id'], org_id)
    if role != 'owner':
        raise HTTPException(
            status_code=403,
            detail="Only organization owner can delete the organization"
        )
    
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Soft delete - mark as inactive
    await db.organizations.update_one(
        {"id": org_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Deactivate all memberships
    await db.organization_memberships.update_many(
        {"organization_id": org_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Organization deleted successfully"}

# ============= Membership Management Routes =============

@router.get("/{org_id}/members", response_model=List[MemberResponse])
async def list_members(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all members of an organization."""
    # Check if user is a member
    role = await get_user_role_in_org(current_user['id'], org_id)
    if not role:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")
    
    memberships = await db.organization_memberships.find(
        {"organization_id": org_id, "is_active": True},
        {"_id": 0}
    ).to_list(1000)
    
    members = []
    for membership in memberships:
        user = await db.users.find_one({"id": membership['user_id']}, {"_id": 0})
        if user:
            members.append(MemberResponse(
                id=membership['id'],
                user_id=user['id'],
                username=user['username'],
                email=user['email'],
                role=membership['role'],
                joined_at=membership.get('joined_at', datetime.now(timezone.utc).isoformat()),
                is_active=membership.get('is_active', True)
            ))
    
    return members

@router.post("/{org_id}/members")
async def invite_member(
    org_id: str,
    invite_data: MembershipInvite,
    current_user: dict = Depends(get_current_user)
):
    """Invite a user to organization. Only owner and admin can invite."""
    # Check if user is owner or admin
    role = await get_user_role_in_org(current_user['id'], org_id)
    if role not in ['owner', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only organization owner and admins can invite members"
        )
    
    # Validate role
    if invite_data.role not in ['admin', 'member']:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")
    
    # Find user by email
    user = await db.users.find_one({"email": invite_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    # Check if already a member
    existing = await db.organization_memberships.find_one({
        "organization_id": org_id,
        "user_id": user['id'],
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this organization")
    
    # Create membership
    membership = OrganizationMembership(
        organization_id=org_id,
        user_id=user['id'],
        role=invite_data.role,
        invited_by=current_user['id']
    )
    
    doc = membership.model_dump()
    doc['joined_at'] = doc['joined_at'].isoformat()
    await db.organization_memberships.insert_one(doc)
    
    return {"message": f"User {user['username']} added to organization successfully"}

@router.patch("/{org_id}/members/{member_id}")
async def update_member_role(
    org_id: str,
    member_id: str,
    update_data: MembershipUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a member's role. Only owner and admin can update roles."""
    # Check if user is owner or admin
    role = await get_user_role_in_org(current_user['id'], org_id)
    if role not in ['owner', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only organization owner and admins can update member roles"
        )
    
    # Validate new role
    if update_data.role not in ['admin', 'member']:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")
    
    # Get membership
    membership = await db.organization_memberships.find_one({
        "id": member_id,
        "organization_id": org_id,
        "is_active": True
    })
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Cannot change owner role
    if membership['role'] == 'owner':
        raise HTTPException(status_code=400, detail="Cannot change owner role")
    
    # Update role
    await db.organization_memberships.update_one(
        {"id": member_id},
        {"$set": {"role": update_data.role}}
    )
    
    return {"message": "Member role updated successfully"}

@router.delete("/{org_id}/members/{member_id}")
async def remove_member(
    org_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a member from organization. Owner and admin can remove members."""
    # Check if user is owner or admin
    role = await get_user_role_in_org(current_user['id'], org_id)
    if role not in ['owner', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only organization owner and admins can remove members"
        )
    
    # Get membership
    membership = await db.organization_memberships.find_one({
        "id": member_id,
        "organization_id": org_id,
        "is_active": True
    })
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Cannot remove owner
    if membership['role'] == 'owner':
        raise HTTPException(status_code=400, detail="Cannot remove organization owner")
    
    # Remove membership (soft delete)
    await db.organization_memberships.update_one(
        {"id": member_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Member removed successfully"}

@router.post("/{org_id}/leave")
async def leave_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Leave an organization. Owner must transfer ownership first."""
    # Get user's membership
    membership = await db.organization_memberships.find_one({
        "organization_id": org_id,
        "user_id": current_user['id'],
        "is_active": True
    })
    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of this organization")
    
    # Owner cannot leave without transferring ownership
    if membership['role'] == 'owner':
        raise HTTPException(
            status_code=400,
            detail="Organization owner cannot leave. Please transfer ownership or delete the organization first."
        )
    
    # Remove membership
    await db.organization_memberships.update_one(
        {"id": membership['id']},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Successfully left the organization"}

@router.post("/{org_id}/transfer-ownership")
async def transfer_ownership(
    org_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Transfer organization ownership to another member. Only owner can do this."""
    new_owner_id = data.get('new_owner_id')
    if not new_owner_id:
        raise HTTPException(status_code=400, detail="new_owner_id is required")
    
    # Check if current user is owner
    role = await get_user_role_in_org(current_user['id'], org_id)
    if role != 'owner':
        raise HTTPException(
            status_code=403,
            detail="Only organization owner can transfer ownership"
        )
    
    # Check if new owner is a member
    new_owner_membership = await db.organization_memberships.find_one({
        "organization_id": org_id,
        "user_id": new_owner_id,
        "is_active": True
    })
    if not new_owner_membership:
        raise HTTPException(status_code=404, detail="New owner must be a member of the organization")
    
    # Update current owner to admin
    await db.organization_memberships.update_one(
        {"organization_id": org_id, "user_id": current_user['id']},
        {"$set": {"role": "admin"}}
    )
    
    # Update new owner
    await db.organization_memberships.update_one(
        {"id": new_owner_membership['id']},
        {"$set": {"role": "owner"}}
    )
    
    # Update organization owner_id
    await db.organizations.update_one(
        {"id": org_id},
        {"$set": {"owner_id": new_owner_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Ownership transferred successfully"}
