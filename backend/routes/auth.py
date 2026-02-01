
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional
from datetime import datetime, timezone

from database import db
from routes.utils import parse_datetime_safe, generate_random_profile_color
from models import (
    UserCreate, UserLogin, UserResponse, 
    AdminUserCreate, AdminUserLogin, AdminUserResponse
)
from models.notification import Notification
from auth import create_access_token, get_current_user, hash_password, verify_password

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ============= Authentication Routes =============
@router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register a new user from scraper website - always creates 'user' role."""
    from services.email_validator import validate_email_comprehensive
    from utils.username_generator import generate_unique_username
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    # Validate email (format, disposable check)
    is_valid, error_message = await validate_email_comprehensive(user_data.email, check_mx=False, check_smtp=False)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Check if email is associated with a deleted account
    deleted_account = await db.deleted_accounts_legal_retention.find_one({"email": user_data.email})
    if deleted_account:
        raise HTTPException(
            status_code=400, 
            detail="This email is associated with a deleted account and cannot be used for registration. Please contact support if you need assistance."
        )
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Auto-generate a unique username
    existing_usernames = set()
    async for user in db.users.find({}, {"username": 1}):
        existing_usernames.add(user.get("username"))
    
    generated_username = generate_unique_username(existing_usernames)
    
    # Use provided first_name and last_name directly
    first_name = user_data.first_name
    last_name = user_data.last_name

    # Create user with 'user' role (normal user from scraper website)
    from models import User
    user = User(
        username=generated_username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        first_name=first_name,
        last_name=last_name,
        role="user",  # Always 'user' for scraper website signups
        profile_color=generate_random_profile_color()  # Generate random profile color
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_login_at'):
        doc['last_login_at'] = doc['last_login_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create welcome notification
    welcome_notification = Notification(
        user_id=user.id,
        title="Welcome to Scrapi! 👋",
        message="Get started by creating your first actor and exploring our marketplace.",
        type="welcome",
        icon="👋",
        link="/actors"
    )
    await db.notifications.insert_one(welcome_notification.model_dump())
    
    # Create token
    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "needs_role_selection": False,  # No role selection for normal users
        "user": UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=f"{user.first_name or ''} {user.last_name or ''}".strip() if user.first_name or user.last_name else None,
            plan=user.plan,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
            profile_color=user.profile_color,
            profile_picture=None,
            theme_preference=user.theme_preference
        )
    }

@router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login user with username or email."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    # Search by username or email
    user_doc = await db.users.find_one({
        "$or": [
            {"username": credentials.username},
            {"email": credentials.username}
        ]
    }, {"_id": 0})
    
    if not user_doc or not verify_password(credentials.password, user_doc['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate profile color if not exists (for existing users)
    profile_color = user_doc.get('profile_color')
    if not profile_color:
        profile_color = generate_random_profile_color()
        await db.users.update_one(
            {"id": user_doc['id']},
            {"$set": {"profile_color": profile_color}}
        )
    
    # Get profile picture from user_settings if exists
    profile_picture = None
    user_settings = await db.user_settings.find_one({"user_id": user_doc['id']}, {"_id": 0, "profile_picture": 1})
    if user_settings:
        profile_picture = user_settings.get('profile_picture')
    
    # Update last login
    await db.users.update_one(
        {"id": user_doc['id']},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create access token
    token = create_access_token({
        "sub": user_doc['id'], 
        "username": user_doc['username'],
        "role": user_doc.get('role', 'user')
    })
    
    # Check if account is pending deletion
    account_status = user_doc.get("account_status", "active")
    if account_status == "pending_deletion":
        deletion_scheduled_at = user_doc.get("deletion_scheduled_at")
        permanent_deletion_at = user_doc.get("permanent_deletion_at")
        
        # Calculate days remaining
        if permanent_deletion_at:
            # Parse and ensure timezone-aware datetime
            permanent_deletion_at = parse_datetime_safe(permanent_deletion_at)
            
            days_remaining = (permanent_deletion_at - datetime.now(timezone.utc)).days
            
            return {
                "access_token": token,
                "token_type": "bearer",
                "account_status": "pending_deletion",
                "deletion_scheduled_at": deletion_scheduled_at,
                "permanent_deletion_at": permanent_deletion_at.isoformat() if permanent_deletion_at else None,
                "days_remaining": max(0, days_remaining),
                "user_id": user_doc['id'],
                "username": user_doc['username'],
                "message": f"Your account is scheduled for deletion. You have {max(0, days_remaining)} days to reactivate."
            }
    
    # Normal users don't need role selection
    needs_role_selection = False
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "needs_role_selection": needs_role_selection,
        "user": UserResponse(
            id=user_doc['id'],
            username=user_doc['username'],
            email=user_doc['email'],
            first_name=user_doc.get('first_name'),
            last_name=user_doc.get('last_name'),
            full_name=f"{user_doc.get('first_name') or ''} {user_doc.get('last_name') or ''}".strip() or None,
            plan=user_doc.get('plan', 'Free'),
            role=user_doc.get('role', 'user'),
            is_active=user_doc.get('is_active', True),
            created_at=user_doc.get('created_at', datetime.now(timezone.utc).isoformat()),
            last_login_at=user_doc.get('last_login_at'),
            profile_color=profile_color,
            profile_picture=profile_picture,
            theme_preference=user_doc.get('theme_preference', 'light')
        )
    }

# ============= Admin Console Authentication Routes =============
@router.post("/auth/admin/register", response_model=dict)
async def admin_register(user_data: AdminUserCreate):
    """Register a new admin user for admin console."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    # Check if admin user already exists
    existing_user = await db.admin_users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.admin_users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Check if owner exists in admin_users collection
    owner_exists = await db.admin_users.find_one({"role": "owner"})
    
    # Determine role and flow
    if not owner_exists:
        # No owner exists - need role selection
        role = None  # Will be set during role selection
        needs_role_selection = True
    else:
        # Owner exists - auto-assign admin role
        role = "admin"
        needs_role_selection = False
    
    # Create admin user
    from models import AdminUser
    admin_user = AdminUser(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        organization_name=user_data.organization_name,
        role=role if role else "admin"  # Temp role until selection
    )
    
    doc = admin_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_login_at'):
        doc['last_login_at'] = doc['last_login_at'].isoformat()
    await db.admin_users.insert_one(doc)
    
    # Create token
    token = create_access_token({"sub": admin_user.id, "username": admin_user.username, "role": admin_user.role})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "needs_role_selection": needs_role_selection,
        "user": AdminUserResponse(
            id=admin_user.id,
            username=admin_user.username,
            email=admin_user.email,
            organization_name=admin_user.organization_name,
            plan=admin_user.plan,
            role=admin_user.role,
            is_active=admin_user.is_active,
            created_at=admin_user.created_at.isoformat(),
            last_login_at=admin_user.last_login_at.isoformat() if admin_user.last_login_at else None
        )
    }

@router.post("/auth/admin/login", response_model=dict)
async def admin_login(credentials: AdminUserLogin):
    """Login admin user with username or email."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    # Search by username or email in admin_users collection
    user_doc = await db.admin_users.find_one({
        "$or": [
            {"username": credentials.username},
            {"email": credentials.username}
        ]
    }, {"_id": 0})
    
    if not user_doc or not verify_password(credentials.password, user_doc['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Update last login
    await db.admin_users.update_one(
        {"id": user_doc['id']},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Check if user needs role selection (no role set or no owner exists)
    owner_exists = await db.admin_users.find_one({"role": "owner"})
    needs_role_selection = (not user_doc.get('role') or user_doc.get('role') == "") or not owner_exists
    
    token = create_access_token({
        "sub": user_doc['id'], 
        "username": user_doc['username'],
        "role": user_doc.get('role', 'admin')
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "needs_role_selection": needs_role_selection,
        "user": AdminUserResponse(
            id=user_doc['id'],
            username=user_doc['username'],
            email=user_doc['email'],
            organization_name=user_doc.get('organization_name'),
            plan=user_doc.get('plan', 'Free'),
            role=user_doc.get('role', 'admin'),
            is_active=user_doc.get('is_active', True),
            created_at=user_doc.get('created_at', datetime.now(timezone.utc).isoformat()),
            last_login_at=user_doc.get('last_login_at')
        )
    }

@router.post("/auth/admin/select-role", response_model=dict)
async def admin_select_role(role_data: dict, current_user: dict = Depends(get_current_user)):
    """Select role for admin user (owner or admin) - only for first-time setup."""
    role = role_data.get('role')
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    if role not in ['owner', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'owner' or 'admin'")
    
    # Check if owner already exists (only if trying to select owner)
    if role == 'owner':
        existing_owner = await db.admin_users.find_one({"role": "owner"})
        if existing_owner and existing_owner['id'] != current_user['id']:
            raise HTTPException(status_code=400, detail="Owner already exists")
    
    # Update admin user role
    await db.admin_users.update_one(
        {"id": current_user['id']},
        {"$set": {"role": role}}
    )
    
    # Get updated user
    user_doc = await db.admin_users.find_one({"id": current_user['id']}, {"_id": 0})
    
    # Create new token with role
    token = create_access_token({
        "sub": user_doc['id'], 
        "username": user_doc['username'],
        "role": role
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": AdminUserResponse(
            id=user_doc['id'],
            username=user_doc['username'],
            email=user_doc['email'],
            organization_name=user_doc.get('organization_name'),
            plan=user_doc.get('plan', 'Free'),
            role=role,
            is_active=user_doc.get('is_active', True),
            created_at=user_doc.get('created_at', datetime.now(timezone.utc).isoformat()),
            last_login_at=user_doc.get('last_login_at')
        )
    }

@router.get("/auth/admin/me", response_model=AdminUserResponse)
async def get_admin_me(current_user: dict = Depends(get_current_user)):
    """Get current admin user info."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    user_doc = await db.admin_users.find_one({"id": current_user['id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    return AdminUserResponse(
        id=user_doc['id'],
        username=user_doc['username'],
        email=user_doc['email'],
        organization_name=user_doc.get('organization_name'),
        plan=user_doc.get('plan', 'Free'),
        role=user_doc.get('role', 'admin'),
        is_active=user_doc.get('is_active', True),
        created_at=user_doc.get('created_at', datetime.now(timezone.utc).isoformat()),
        last_login_at=user_doc.get('last_login_at')
    )
