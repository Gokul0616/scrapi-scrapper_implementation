
# removed incorrect insertion

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Security, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError
from models import (
    UserCreate, UserLogin, UserResponse, 
    AdminUserCreate, AdminUserLogin, AdminUserResponse,
    Actor, ActorCreate, ActorUpdate, ActorPublish,
    Run, RunCreate, Dataset, DatasetItem, Proxy, ProxyCreate,
    LeadChatMessage, LeadChatRequest, Schedule, ScheduleCreate, ScheduleUpdate,
    OTP, SendOTPRequest, VerifyOTPRequest, OTPResponse,
    ApiKey, ApiKeyCreate, ApiKeyDisplay
)
from models.policy import Policy, PolicyCreate, PolicyUpdate
from auth import create_access_token, get_current_user, hash_password, verify_password
from services import get_proxy_manager, get_task_manager, LeadChatService, EnhancedGlobalChatService
from scrapers import ScraperEngine, get_scraper_registry
import logging
import os
import asyncio
import secrets
import hashlib
import time
import random

logger = logging.getLogger(__name__)

# Profile color palette - works well in both light and dark modes
PROFILE_COLORS = [
    "#8B5CF6",  # Purple
    "#EC4899",  # Pink
    "#F59E0B",  # Amber
    "#10B981",  # Emerald
    "#3B82F6",  # Blue
    "#EF4444",  # Red
    "#14B8A6",  # Teal
    "#F97316",  # Orange
    "#8B5CF6",  # Violet
    "#06B6D4",  # Cyan
]

def generate_random_profile_color():
    """Generate a random color from the profile color palette."""
    return random.choice(PROFILE_COLORS)

# This will be set by server.py
db = None
proxy_manager = None
task_manager = None

def set_db(database):
    global db, proxy_manager, task_manager
    db = database
    proxy_manager = get_proxy_manager(db)
    task_manager = get_task_manager()

api_key_security = HTTPBearer()

async def get_api_user(credentials: HTTPAuthorizationCredentials = Depends(api_key_security)):
    """Authenticate user via API Key or JWT."""
    token = credentials.credentials
    
    if token.startswith("sk_"):
        # API Key Authentication
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        key_doc = await db.api_keys.find_one({"key_hash": token_hash})
        
        if not key_doc:
            raise HTTPException(status_code=401, detail="Invalid API Key")
            
        if not key_doc.get("is_active", True):
            raise HTTPException(status_code=401, detail="API Key is inactive")
            
        # Update last used
        await db.api_keys.update_one(
            {"id": key_doc['id']},
            {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Get user
        user = await db.users.find_one({"id": key_doc['user_id']})
        if not user:
             # Try admin user? Assuming API keys are for regular users mostly, but let's check.
             # Current ApiKey model links to generic user_id.
             raise HTTPException(status_code=401, detail="User associated with API key not found")
             
        return {
            "id": user['id'],
            "username": user['username'],
            "role": user.get('role', 'user')
        }
    else:
        # JWT Authentication - delegate to existing auth logic
        # We need to call the logic of get_current_user but passing credentials
        # auth.get_current_user is a dependency, so it's an async function taking credentials
        return await get_current_user(credentials)

router = APIRouter()

# Include email validation routes
from routes.email_validation_routes import router as email_validation_router
router.include_router(email_validation_router)

# ============= Authentication Routes =============
@router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register a new user from scraper website - always creates 'user' role."""
    from services.email_validator import validate_email_comprehensive
    
    # Validate email (format, disposable check)
    is_valid, error_message = await validate_email_comprehensive(user_data.email, check_mx=False, check_smtp=False)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Check if user already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user with 'user' role (normal user from scraper website)
    from models import User
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        organization_name=user_data.organization_name,
        role="user",  # Always 'user' for scraper website signups
        profile_color=generate_random_profile_color()  # Generate random profile color
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_login_at'):
        doc['last_login_at'] = doc['last_login_at'].isoformat()
    await db.users.insert_one(doc)
    
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
            organization_name=user.organization_name,
            first_name=user.first_name,
            last_name=user.last_name,
            plan=user.plan,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
            profile_color=user.profile_color,
            theme_preference=user.theme_preference
        )
    }

@router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login user with username or email."""
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
    
    # Update last login
    await db.users.update_one(
        {"id": user_doc['id']},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Normal users don't need role selection
    needs_role_selection = False
    
    token = create_access_token({
        "sub": user_doc['id'], 
        "username": user_doc['username'],
        "role": user_doc.get('role', 'user')
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "needs_role_selection": needs_role_selection,
        "user": UserResponse(
            id=user_doc['id'],
            username=user_doc['username'],
            email=user_doc['email'],
            organization_name=user_doc.get('organization_name'),
            plan=user_doc.get('plan', 'Free'),
            role=user_doc.get('role', 'user'),
            is_active=user_doc.get('is_active', True),
            created_at=user_doc.get('created_at', datetime.now(timezone.utc).isoformat()),
            last_login_at=user_doc.get('last_login_at'),
            profile_color=profile_color
        )
    }

# ============= Admin Console Authentication Routes =============
@router.post("/auth/admin/register", response_model=dict)
async def admin_register(user_data: AdminUserCreate):
    """Register a new admin user for admin console."""
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

# ============= Admin Routes =============
@router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin dashboard statistics."""
    from audit_service import log_admin_action
    
    # Check if user is admin or owner from admin_users collection
    user_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not user_doc or user_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # 1. User stats (regular users, not admin users)
    total_users = await db.users.count_documents({})
    # Active users in last 7 days
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    active_users = await db.users.count_documents({
        "$or": [
            {"last_login_at": {"$gte": seven_days_ago}},
            {"created_at": {"$gte": seven_days_ago}}  # Consider new users as active
        ]
    })
    
    # 2. Run stats
    total_runs = await db.runs.count_documents({})
    succeeded_runs = await db.runs.count_documents({"status": "succeeded"})
    
    success_rate = 0
    if total_runs > 0:
        success_rate = (succeeded_runs / total_runs) * 100
        
    # 3. Recent activity
    recent_runs = await db.runs.find(
        {}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Format recent runs
    formatted_runs = []
    for run in recent_runs:
        if isinstance(run.get('created_at'), str):
            created_at = datetime.fromisoformat(run['created_at'])
        else:
            created_at = run.get('created_at')
            
        # Calculate time ago roughly
        now = datetime.now(timezone.utc)
        diff = now - created_at
        hours_ago = int(diff.total_seconds() / 3600)
        
        formatted_runs.append({
            "id": run['id'],
            "type": "run",
            "status": run['status'],
            "actor_name": run['actor_name'],
            "hours_ago": hours_ago
        })
        
    return {
        "total_users": total_users,
        "active_users_7d": active_users,
        "total_runs": total_runs,
        "success_rate": round(success_rate, 1),
        "recent_activity": formatted_runs
    }

@router.get("/admin/users", response_model=dict)
async def get_admin_users(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 100,
    search: Optional[str] = None
):
    """Get all users - both normal users and admin users. Owner can see everyone, Admin can see everyone but can only act on normal users."""
    admin_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not admin_doc or admin_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    query = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"organization_name": {"$regex": search, "$options": "i"}}
        ]
        
    # Fetch ALL matching users from both collections (projection only needed fields)
    # Note: For large datasets, this approach is not efficient. 
    # But for < 1000 users as per requirements, it allows correct sorting and pagination across two collections.
    
    normal_users = await db.users.find(query, {"_id": 0}).to_list(10000)
    admin_users = await db.admin_users.find(query, {"_id": 0}).to_list(10000)
    
    # Combine and normalize
    all_users = []
    
    # Add normal users
    for user in normal_users:
        all_users.append({
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "organization_name": user.get('organization_name'),
            "plan": user.get('plan', 'Free'),
            "role": user.get('role', 'user'),
            "is_active": user.get('is_active', True),
            "created_at": user.get('created_at', datetime.now(timezone.utc).isoformat()),
            "last_login_at": user.get('last_login_at')
        })
    
    # Add admin users
    for user in admin_users:
        all_users.append({
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "organization_name": user.get('organization_name'),
            "plan": user.get('plan', 'Free'),
            "role": user.get('role', 'admin'),
            "is_active": user.get('is_active', True),
            "created_at": user.get('created_at', datetime.now(timezone.utc).isoformat()),
            "last_login_at": user.get('last_login_at')
        })
        
    # Sort by created_at desc (newest first)
    # Handle potential None or invalid dates gracefully
    def get_sort_key(u):
        try:
            return datetime.fromisoformat(u['created_at'])
        except:
            return datetime.min.replace(tzinfo=timezone.utc)
            
    all_users.sort(key=get_sort_key, reverse=True)
    
    # Pagination
    total = len(all_users)
    start = (page - 1) * limit
    end = start + limit
    paginated_users = all_users[start:end]
        
    return {
        "users": paginated_users,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if limit > 0 else 0
    }

@router.post("/admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    request_data: dict = {},
    current_user: dict = Depends(get_current_user)
):
    """Suspend a user account (normal users only). Admin can only suspend normal users, Owner can suspend anyone except owner."""
    from audit_service import log_admin_action
    from fastapi import Request
    
    # Get current admin user's role
    admin_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not admin_doc or admin_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    current_admin_role = admin_doc.get('role')
        
    # Check if target is in users collection (normal user)
    user = await db.users.find_one({"id": user_id})
    if user:
        # Target is a normal user - both admin and owner can suspend
        pass
    else:
        # Check if target is in admin_users collection
        admin_user = await db.admin_users.find_one({"id": user_id})
        if admin_user:
            # Target is an admin user
            if current_admin_role == 'admin':
                # Regular admin cannot suspend other admin users
                raise HTTPException(
                    status_code=403, 
                    detail="You do not have permission to suspend admin users. Only owner can perform this action."
                )
            elif admin_user.get('role') == 'owner':
                # Even owner cannot suspend another owner
                raise HTTPException(status_code=403, detail="Cannot suspend owner")
        else:
            raise HTTPException(status_code=404, detail="User not found")

    # Abort running jobs
    running_runs = await db.runs.find({"user_id": user_id, "status": {"$in": ["running", "queued"]}}).to_list(None)
    for run in running_runs:
        await task_manager.cancel_task(run['id'])
        await db.runs.update_one(
            {"id": run['id']}, 
            {"$set": {"status": "aborted", "finished_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Update the appropriate collection
    if user:
        # Normal user
        await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
        target_username = user['username']
        target_type = "user"
    else:
        # Admin user
        await db.admin_users.update_one({"id": user_id}, {"$set": {"is_active": False}})
        target_username = admin_user['username']
        target_type = "admin_user"
    
    await log_admin_action(
        db, 
        current_user, 
        "user_suspended", 
        target_type, 
        user_id, 
        target_username, 
        details=request_data.get('reason', "Suspended by admin")
    )
    
    return {"message": "User suspended successfully"}

@router.post("/admin/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Activate a user account (normal users only). Admin can only activate normal users, Owner can activate anyone except owner."""
    from audit_service import log_admin_action
    
    # Get current admin user's role
    admin_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not admin_doc or admin_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    current_admin_role = admin_doc.get('role')
        
    # Check if target is in users collection (normal user)
    user = await db.users.find_one({"id": user_id})
    if user:
        # Target is a normal user - both admin and owner can activate
        pass
    else:
        # Check if target is in admin_users collection
        admin_user = await db.admin_users.find_one({"id": user_id})
        if admin_user:
            # Target is an admin user
            if current_admin_role == 'admin':
                # Regular admin cannot activate other admin users
                raise HTTPException(
                    status_code=403, 
                    detail="You do not have permission to activate admin users. Only owner can perform this action."
                )
            elif admin_user.get('role') == 'owner':
                # Even owner cannot activate another owner
                raise HTTPException(status_code=403, detail="Cannot activate owner")
        else:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Update the appropriate collection
    if user:
        # Normal user
        await db.users.update_one({"id": user_id}, {"$set": {"is_active": True}})
        target_username = user['username']
        target_type = "user"
    else:
        # Admin user
        await db.admin_users.update_one({"id": user_id}, {"$set": {"is_active": True}})
        target_username = admin_user['username']
        target_type = "admin_user"
    
    await log_admin_action(
        db, 
        current_user, 
        "user_activated", 
        target_type, 
        user_id, 
        target_username
    )
    
    return {"message": "User activated successfully"}

@router.get("/admin/audit-logs")
async def get_audit_logs(
    page: int = 1,
    limit: int = 50,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    admin_username: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get audit logs."""
    user_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not user_doc or user_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = {}
    if action:
        query['action'] = action
    if target_type:
        query['target_type'] = target_type
    if admin_username:
        query['admin_username'] = {"$regex": admin_username, "$options": "i"}

    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * limit
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Convert datetimes
    for log in logs:
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
            
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/admin/actors", response_model=List[Actor])
async def get_admin_actors(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None
):
    """Get all actors for admin moderation."""
    user_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not user_doc or user_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category and category != "All":
        query["category"] = category
        
    actors = await db.actors.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Convert datetimes
    for actor in actors:
        if isinstance(actor.get('created_at'), str):
            actor['created_at'] = datetime.fromisoformat(actor['created_at'])
        if isinstance(actor.get('updated_at'), str):
            actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
            
    return actors

@router.post("/admin/actors/{actor_id}/verify")
async def verify_actor(
    actor_id: str,
    verified: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Toggle actor verification status."""
    from audit_service import log_admin_action
    
    user_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not user_doc or user_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    result = await db.actors.update_one(
        {"id": actor_id},
        {"$set": {"is_verified": verified, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Actor not found")
        
    await log_admin_action(
        db, 
        current_user, 
        "actor_verified" if verified else "actor_unverified", 
        "actor", 
        actor_id,
        details=f"Verification set to {verified}"
    )
    
    return {"message": f"Actor {'verified' if verified else 'unverified'} successfully"}

@router.post("/admin/actors/{actor_id}/feature")
async def feature_actor(
    actor_id: str,
    featured: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Toggle actor featured status."""
    from audit_service import log_admin_action
    
    user_doc = await db.admin_users.find_one({"id": current_user['id']})
    if not user_doc or user_doc.get('role') not in ['admin', 'owner']:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    # Check limit if enabling
    if featured:
        count = await db.actors.count_documents({"is_featured": True})
        if count >= 10:
            raise HTTPException(status_code=400, detail="Maximum number of featured actors (10) reached")
            
    result = await db.actors.update_one(
        {"id": actor_id},
        {"$set": {"is_featured": featured, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Actor not found")
        
    await log_admin_action(
        db, 
        current_user, 
        "actor_featured" if featured else "actor_unfeatured", 
        "actor", 
        actor_id,
        details=f"Featured set to {featured}"
    )
    
    return {"message": f"Actor {'featured' if featured else 'unfeatured'} successfully"}

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    user_doc = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate profile color if not exists (for existing users)
    profile_color = user_doc.get('profile_color')
    if not profile_color:
        profile_color = generate_random_profile_color()
        await db.users.update_one(
            {"id": user_doc['id']},
            {"$set": {"profile_color": profile_color}}
        )
    
    return UserResponse(
        id=user_doc['id'],
        username=user_doc['username'],
        email=user_doc['email'],
        organization_name=user_doc.get('organization_name'),
        first_name=user_doc.get('first_name'),
        last_name=user_doc.get('last_name'),
        plan=user_doc.get('plan', 'Free'),
        role=user_doc.get('role', 'user'),
        is_active=user_doc.get('is_active', True),
        created_at=user_doc.get('created_at', datetime.now(timezone.utc).isoformat()),
        last_login_at=user_doc.get('last_login_at'),
        profile_color=profile_color,
        theme_preference=user_doc.get('theme_preference', 'light')
    )

@router.patch("/auth/last-path")
async def update_last_path(
    path_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's last visited path."""
    last_path = path_data.get('last_path')
    if not last_path:
        raise HTTPException(status_code=400, detail="last_path is required")
    
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"last_path": last_path}}
    )
    
    return {"message": "Last path updated successfully", "last_path": last_path}

@router.get("/auth/last-path")
async def get_last_path(current_user: dict = Depends(get_current_user)):
    """Get user's last visited path."""
    user_doc = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "last_path": 1})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"last_path": user_doc.get('last_path', '/home')}

# Temp store for fresh API keys (key_id -> {key: str, expires_at: float})
TEMP_KEY_STORE = {}

# ============= API Key Routes =============

@router.post("/auth/api-keys", response_model=dict)
async def create_api_key(
    key_data: ApiKeyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new API key."""
    # Generate key
    raw_key = f"sk_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    
    # Store
    api_key = ApiKey(
        user_id=current_user['id'],
        name=key_data.name,
        key_hash=key_hash,
        prefix=raw_key[:8] + "..."
    )
    
    doc = api_key.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.api_keys.insert_one(doc)
    
    # Store in temp store for 30s timer
    TEMP_KEY_STORE[api_key.id] = {
        "key": raw_key,
        "expires_at": time.time() + 30
    }
    
    # Return raw key ONLY ONCE
    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,
        "created_at": doc['created_at'],
        "has_active_timer": True
    }

@router.get("/auth/api-keys", response_model=List[ApiKeyDisplay])
async def get_api_keys(current_user: dict = Depends(get_current_user)):
    """Get all API keys for current user."""
    cursor = db.api_keys.find({"user_id": current_user['id']})
    keys = await cursor.to_list(length=100)
    
    result = []
    for k in keys:
        if isinstance(k.get('created_at'), str):
            k['created_at'] = datetime.fromisoformat(k['created_at'])
        if isinstance(k.get('last_used_at'), str):
            k['last_used_at'] = datetime.fromisoformat(k['last_used_at'])
        # Check for active timer
        has_active = False
        if k['id'] in TEMP_KEY_STORE:
            if time.time() < TEMP_KEY_STORE[k['id']]['expires_at']:
                has_active = True
            else:
                # Cleanup expired
                del TEMP_KEY_STORE[k['id']]
        
        # Ensure fields map to ApiKeyDisplay
        result.append(ApiKeyDisplay(
            id=k['id'],
            name=k['name'],
            prefix=k['prefix'],
            created_at=k['created_at'],
            last_used_at=k.get('last_used_at'),
            has_active_timer=has_active
        ))
    return result

@router.delete("/auth/api-keys/{key_id}")
async def delete_api_key(key_id: str, current_user: dict = Depends(get_current_user)):
    """Revoke an API key."""
    result = await db.api_keys.delete_one({
        "id": key_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    # Cleanup temp store if exists
    if key_id in TEMP_KEY_STORE:
        del TEMP_KEY_STORE[key_id]
        
    return {"message": "API Key revoked successfully"}

@router.websocket("/ws/api-keys/{key_id}/timer")
async def ws_api_key_timer(websocket: WebSocket, key_id: str):
    await websocket.accept()
    try:
        while True:
            if key_id not in TEMP_KEY_STORE:
                await websocket.send_json({"key": None, "remaining": 0})
                break
            
            data = TEMP_KEY_STORE[key_id]
            remaining = int(data['expires_at'] - time.time())
            
            if remaining <= 0:
                del TEMP_KEY_STORE[key_id]
                await websocket.send_json({"key": None, "remaining": 0})
                break
            
            await websocket.send_json({
                "key": data['key'],
                "remaining": remaining
            })
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

# ============= User Validation Routes =============
@router.get("/users/check-email")
async def check_email(email: str):
    """Check if an email already exists in the database."""
    from services.email_validator import validate_email_comprehensive
    
    # Validate email format and check if disposable
    is_valid, error_message = await validate_email_comprehensive(email, check_mx=False, check_smtp=False)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    user_exists = await db.users.find_one({"email": email})
    return {"exists": bool(user_exists), "email": email}

# ============= OTP Routes =============
@router.post("/auth/send-otp", response_model=OTPResponse)
async def send_otp(request: SendOTPRequest):
    """Send OTP to user's email for login or registration."""
    from services.email_service import get_email_service
    from services.email_validator import validate_email_comprehensive
    
    try:
        # Layer 1-3 validation: Format, Alias, Disposable check (always performed)
        is_valid, error_message = await validate_email_comprehensive(
            request.email,
            check_mx=False,  # Optional: Set to True for MX record verification
            check_smtp=False  # Optional: Set to True for SMTP verification (slower)
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        email_service = get_email_service()
        
        # Check if user exists for login, or doesn't exist for registration
        user_exists = await db.users.find_one({"email": request.email})
        
        if request.purpose == "login" and not user_exists:
            raise HTTPException(status_code=404, detail="No account found with this email")
        
        if request.purpose == "register" and user_exists:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Generate OTP
        otp_code = email_service.generate_otp()
        
        # Delete any existing OTPs for this email and purpose
        await db.otps.delete_many({"email": request.email, "purpose": request.purpose})
        
        # Store OTP in database
        otp = OTP(
            email=request.email,
            otp_code=otp_code,
            purpose=request.purpose
        )
        
        doc = otp.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['expires_at'] = doc['expires_at'].isoformat()
        await db.otps.insert_one(doc)
        
        # Send OTP email
        if os.getenv("APP_ENV") == "test":
            logger.info(f"TEST ENV: OTP generated for {request.email} is {otp_code} (Email sending skipped)")
        else:
            await email_service.send_otp_email(request.email, otp_code, request.purpose)
            logger.info(f"OTP sent to {request.email} for {request.purpose}")
        
        return OTPResponse(
            success=True,
            message=f"Verification code sent to {request.email}",
            email=request.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending OTP: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send verification code. Please try again.")

@router.post("/auth/verify-otp", response_model=dict)
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and return token if valid (for login only)."""
    try:
        # Find the OTP
        otp_doc = await db.otps.find_one({
            "email": request.email,
            "purpose": request.purpose,
            "is_used": False
        })
        
        if not otp_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
        # Check if OTP has expired
        expires_at = datetime.fromisoformat(otp_doc['expires_at'])
        if datetime.now(timezone.utc) > expires_at:
            await db.otps.delete_one({"id": otp_doc['id']})
            raise HTTPException(status_code=400, detail="Verification code has expired")
        
        # Check attempts
        if otp_doc['attempts'] >= 5:
            await db.otps.delete_one({"id": otp_doc['id']})
            raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new code.")
        
        # Verify OTP code
        if os.getenv("APP_ENV") != "test" and otp_doc['otp_code'] != request.otp_code:
            # Increment attempts
            await db.otps.update_one(
                {"id": otp_doc['id']},
                {"$inc": {"attempts": 1}}
            )
            remaining = 5 - otp_doc['attempts'] - 1
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid verification code. {remaining} attempts remaining."
            )
        
        # Mark OTP as used
        await db.otps.update_one(
            {"id": otp_doc['id']},
            {"$set": {"is_used": True}}
        )
        
        # For login purpose, create token and return user data
        if request.purpose == "login":
            user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
            if not user_doc:
                raise HTTPException(status_code=404, detail="User not found")
            
            token = create_access_token({"sub": user_doc['id'], "username": user_doc['username']})
            
            return {
                "success": True,
                "message": "Verification successful",
                "access_token": token,
                "token_type": "bearer",
                "user": UserResponse(
                    id=user_doc['id'],
                    username=user_doc['username'],
                    email=user_doc['email'],
                    organization_name=user_doc.get('organization_name'),
                    plan=user_doc.get('plan', 'Free')
                )
            }
        
        # For registration, just return success
        return {
            "success": True,
            "message": "Email verified successfully",
            "email": request.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify code. Please try again.")

# ============= Actor Routes =============
# NOTE: Specific routes MUST come before parametrized routes to avoid conflicts

@router.get("/actors", response_model=List[Actor])
async def get_actors(current_user: dict = Depends(get_current_user)):
    """Get all actors for current user."""
    actors = await db.actors.find(
        {"$or": [{"user_id": current_user['id']}, {"is_public": True}]},
        {"_id": 0}
    ).to_list(1000)
    
    # Convert datetime strings
    for actor in actors:
        if isinstance(actor.get('created_at'), str):
            actor['created_at'] = datetime.fromisoformat(actor['created_at'])
        if isinstance(actor.get('updated_at'), str):
            actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
    
    return actors

@router.post("/actors", response_model=Actor)
async def create_actor(actor_data: ActorCreate, current_user: dict = Depends(get_current_user)):
    """Create a new actor."""
    actor = Actor(
        user_id=current_user['id'],
        name=actor_data.name,
        description=actor_data.description,
        icon=actor_data.icon,
        category=actor_data.category,
        type=actor_data.type,
        code=actor_data.code,
        input_schema=actor_data.input_schema,
        tags=actor_data.tags,
        readme=actor_data.readme,
        template_type=actor_data.template_type,
        visibility=actor_data.visibility,
        status='draft',
        author_name=current_user.get('username'),
        author_id=current_user['id']
    )
    
    doc = actor.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.actors.insert_one(doc)
    
    return actor

@router.post("/actors/validate-code")
async def validate_code(request: dict, current_user: dict = Depends(get_current_user)):
    """Validate actor code for syntax and security issues."""
    import ast
    import re
    
    code = request.get('code', '')
    language = request.get('language', 'python')
    
    if not code:
        return {"valid": False, "error": "No code provided"}
    
    if language == 'python':
        try:
            # Parse Python code using AST
            tree = ast.parse(code)
            
            # Check for dangerous imports
            dangerous_imports = ['os', 'sys', 'subprocess', '__import__', 'eval', 'exec', 'compile', 'open']
            dangerous_builtins = ['eval', 'exec', 'compile', '__import__', 'open', 'file', 'input', 'raw_input']
            
            for node in ast.walk(tree):
                # Check imports
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name in dangerous_imports or alias.name.startswith('os.'):
                            return {
                                "valid": False,
                                "error": f"Import '{alias.name}' is not allowed for security reasons",
                                "line": node.lineno
                            }
                
                # Check from imports
                if isinstance(node, ast.ImportFrom):
                    if node.module in dangerous_imports:
                        return {
                            "valid": False,
                            "error": f"Import from '{node.module}' is not allowed for security reasons",
                            "line": node.lineno
                        }
                
                # Check for dangerous function calls
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name) and node.func.id in dangerous_builtins:
                        return {
                            "valid": False,
                            "error": f"Function '{node.func.id}()' is not allowed for security reasons",
                            "line": node.lineno
                        }
            
            # Check for required functions
            function_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
            if 'start' not in function_names:
                return {
                    "valid": False,
                    "error": "Required function 'start(input_data)' not found",
                    "line": 1
                }
            if 'parse' not in function_names:
                return {
                    "valid": False,
                    "error": "Required function 'parse(url, html)' not found",
                    "line": 1
                }
            
            return {"valid": True, "message": "Code is valid"}
            
        except SyntaxError as e:
            return {
                "valid": False,
                "error": f"Syntax error: {e.msg}",
                "line": e.lineno
            }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Validation error: {str(e)}",
                "line": 1
            }
    
    elif language == 'javascript':
        # Basic JavaScript validation (just check if it's not empty for now)
        if not code.strip():
            return {"valid": False, "error": "Empty code"}
        return {"valid": True, "message": "JavaScript code accepted (full validation not implemented)"}
    
    return {"valid": False, "error": "Unsupported language"}

@router.get("/actors/{actor_id}", response_model=Actor)
async def get_actor(actor_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific actor."""
    actor = await db.actors.find_one({"id": actor_id}, {"_id": 0})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # Convert datetime strings
    if isinstance(actor.get('created_at'), str):
        actor['created_at'] = datetime.fromisoformat(actor['created_at'])
    if isinstance(actor.get('updated_at'), str):
        actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
    
    return actor

@router.patch("/actors/{actor_id}", response_model=Actor)
async def update_actor(actor_id: str, updates: ActorUpdate, current_user: dict = Depends(get_current_user)):
    """Update an actor."""
    actor = await db.actors.find_one({"id": actor_id, "user_id": current_user['id']})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.actors.update_one({"id": actor_id}, {"$set": update_data})
    
    updated_actor = await db.actors.find_one({"id": actor_id}, {"_id": 0})
    if isinstance(updated_actor.get('created_at'), str):
        updated_actor['created_at'] = datetime.fromisoformat(updated_actor['created_at'])
    if isinstance(updated_actor.get('updated_at'), str):
        updated_actor['updated_at'] = datetime.fromisoformat(updated_actor['updated_at'])
    
    return updated_actor

@router.delete("/actors/{actor_id}")
async def delete_actor(actor_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an actor."""
    result = await db.actors.delete_one({"id": actor_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Actor not found")
    return {"message": "Actor deleted successfully"}

@router.get("/actors-used")
async def get_actors_used(current_user: dict = Depends(get_current_user)):
    """Get actors used by the current user with run statistics."""
    try:
        # Aggregation pipeline to get actors with run statistics
        pipeline = [
            # Match runs for this user
            {"$match": {"user_id": current_user['id']}},
            # Group by actor_id to get statistics
            {
                "$group": {
                    "_id": "$actor_id",
                    "total_runs": {"$sum": 1},
                    "last_run_started": {"$max": "$started_at"},
                    "last_run_status": {"$last": "$status"},
                    "last_run_duration": {"$last": "$duration_seconds"},
                    "last_run_id": {"$last": "$id"}
                }
            },
            # Sort by last run (most recent first)
            {"$sort": {"last_run_started": -1}}
        ]
        
        run_stats = await db.runs.aggregate(pipeline).to_list(1000)
        
        # Get actor details for each actor_id
        result = []
        for stat in run_stats:
            actor = await db.actors.find_one({"id": stat["_id"]}, {"_id": 0})
            if actor:
                # Convert datetime strings if needed
                if isinstance(actor.get('created_at'), str):
                    actor['created_at'] = datetime.fromisoformat(actor['created_at'])
                if isinstance(actor.get('updated_at'), str):
                    actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
                
                # Add run statistics
                actor_with_stats = {
                    **actor,
                    "total_runs": stat["total_runs"],
                    "last_run_started": stat["last_run_started"],
                    "last_run_status": stat["last_run_status"],
                    "last_run_duration": stat["last_run_duration"],
                    "last_run_id": stat["last_run_id"]
                }
                result.append(actor_with_stats)
        
        return result
    except Exception as e:
        logger.error(f"Error getting actors used: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Run Routes =============
async def execute_scraping_job(run_id: str, actor_id: str, user_id: str, input_data: dict):
    """Background task to execute scraping."""
    try:
        logger.info(f"🔧 Executing scraping job for run {run_id}")
        logger.info(f"   Input data type: {type(input_data)}")
        logger.info(f"   Input data: {input_data}")
        
        # Update run status to running
        await db.runs.update_one(
            {"id": run_id},
            {
                "$set": {
                    "status": "running",
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Initialize scraper engine
        engine = ScraperEngine(proxy_manager)
        await engine.initialize()
        
        try:
            # Get actor details
            actor = await db.actors.find_one({"id": actor_id})
            
            results = []
            
            # Built-in scraper - use registry
            scraper_registry = get_scraper_registry()
            actor_name = actor.get('name') if actor else None
            
            if not actor_name:
                raise ValueError("Actor not found or has no name")
            
            logger.info(f"   Looking for built-in scraper: {actor_name}")
            scraper = scraper_registry.get_scraper(actor_name, engine)
            
            if not scraper:
                logger.error(f"❌ No scraper found for: {actor_name}")
                raise ValueError(f"No scraper registered for actor: {actor_name}")
            
            logger.info(f"✅ Found scraper: {type(scraper).__name__}")
            logger.info(f"   Calling scraper.scrape() with input_data: {input_data}")
            
            # Progress callback for logging
            async def progress_callback(message: str):
                await db.runs.update_one(
                    {"id": run_id},
                    {"$push": {"logs": f"{datetime.now(timezone.utc).isoformat()}: {message}"}}
                )
                logger.info(f"Run {run_id}: {message}")
            
            # Execute built-in scraper
            results = await scraper.scrape(input_data, progress_callback)
            
            # Create dataset and store results
            from models import Dataset
            dataset = Dataset(run_id=run_id, user_id=user_id, item_count=len(results))
            dataset_doc = dataset.model_dump()
            dataset_doc['created_at'] = dataset_doc['created_at'].isoformat()
            await db.datasets.insert_one(dataset_doc)
            
            # Store dataset items
            for result in results:
                item = DatasetItem(run_id=run_id, data=result)
                item_doc = item.model_dump()
                item_doc['created_at'] = item_doc['created_at'].isoformat()
                await db.dataset_items.insert_one(item_doc)
            
            # Calculate duration
            run_doc = await db.runs.find_one({"id": run_id})
            started_at = datetime.fromisoformat(run_doc['started_at'])
            finished_at = datetime.now(timezone.utc)
            duration = int((finished_at - started_at).total_seconds())
            
            # Update run as succeeded
            await db.runs.update_one(
                {"id": run_id},
                {
                    "$set": {
                        "status": "succeeded",
                        "finished_at": finished_at.isoformat(),
                        "duration_seconds": duration,
                        "results_count": len(results),
                        "dataset_id": dataset.id
                    }
                }
            )
            
            # Update actor runs count
            await db.actors.update_one({"id": actor_id}, {"$inc": {"runs_count": 1}})
            
            logger.info(f"Run {run_id} completed successfully with {len(results)} results")
        
        finally:
            await engine.cleanup()
    
    except Exception as e:
        logger.error(f"Run {run_id} failed: {str(e)}")
        await db.runs.update_one(
            {"id": run_id},
            {
                "$set": {
                    "status": "failed",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": str(e)
                }
            }
        )

@router.post("/runs", response_model=Run)
async def create_run(
    run_data: RunCreate,
    current_user: dict = Depends(get_api_user)
):
    """Create and start a new scraping run with parallel execution."""
    # Log incoming request for debugging
    logger.info(f"🚀 Creating run for user {current_user['id']}")
    logger.info(f"   Actor ID: {run_data.actor_id}")
    logger.info(f"   Input data: {run_data.input_data}")
    
    # Get actor (check by ID or API ID)
    query = {"id": run_data.actor_id}
    if run_data.actor_id.startswith("actor_"):
        query = {"api_id": run_data.actor_id}
        
    actor = await db.actors.find_one(query)
    
    # If not found by API ID, could check by regular ID if it wasn't already checked
    if not actor and run_data.actor_id.startswith("actor_"):
         actor = await db.actors.find_one({"id": run_data.actor_id})

    if not actor:
        logger.error(f"❌ Actor not found: {run_data.actor_id}")
        raise HTTPException(status_code=404, detail="Actor not found") 
    
    # Use the real ID for internal storage
    real_actor_id = actor['id']
    
    logger.info(f"   Actor name: {actor['name']}")
    
    # Create run
    run = Run(
        user_id=current_user['id'],
        actor_id=real_actor_id,
        actor_name=actor['name'],
        actor_icon=actor.get('icon'),
        input_data=run_data.input_data,
        status="queued"
    )
    
    doc = run.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.runs.insert_one(doc)
    
    logger.info(f"✅ Run created: {run.id}")
    
    # Start scraping in parallel using task manager
    await task_manager.start_task(
        run.id,
        execute_scraping_job(
            run.id,
            real_actor_id,
            current_user['id'],
            run_data.input_data
        )
    )
    
    logger.info(f"Run {run.id} queued. Currently running: {task_manager.get_running_count()} tasks")
    
    return run

@router.get("/runs")
async def get_runs(
    current_user: dict = Depends(get_current_user), 
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
):
    """Get all runs for current user with pagination."""
    # Build query
    query = {"user_id": current_user['id']}
    
    # Add search filter (search by run ID)
    if search:
        query["id"] = {"$regex": search, "$options": "i"}
    
    # Add status filter
    if status and status != "all":
        query["status"] = status
    
    # Get total count
    total_count = await db.runs.count_documents(query)
    
    # Calculate skip
    skip = (page - 1) * limit
    
    # Set sort direction
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Get runs with pagination
    runs = await db.runs.find(
        query,
        {"_id": 0}
    ).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for run in runs:
        if isinstance(run.get('created_at'), str):
            run['created_at'] = datetime.fromisoformat(run['created_at'])
        if isinstance(run.get('started_at'), str):
            run['started_at'] = datetime.fromisoformat(run['started_at'])
        if isinstance(run.get('finished_at'), str):
            run['finished_at'] = datetime.fromisoformat(run['finished_at'])
    
    return {
        "runs": runs,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/runs/{run_id}", response_model=Run)
async def get_run(run_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific run."""
    run = await db.runs.find_one({"id": run_id, "user_id": current_user['id']}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Convert datetime strings
    if isinstance(run.get('created_at'), str):
        run['created_at'] = datetime.fromisoformat(run['created_at'])
    if isinstance(run.get('started_at'), str):
        run['started_at'] = datetime.fromisoformat(run['started_at'])
    if isinstance(run.get('finished_at'), str):
        run['finished_at'] = datetime.fromisoformat(run['finished_at'])
    
    return run

@router.delete("/runs/{run_id}/abort")
async def abort_run(run_id: str, current_user: dict = Depends(get_current_user)):
    """Abort a running or queued scraping job."""
    try:
        # Verify run belongs to user and is in abortable state
        run = await db.runs.find_one({
            "id": run_id, 
            "user_id": current_user['id'], 
            "status": {"$in": ["running", "queued"]}
        })
        
        if not run:
            raise HTTPException(
                status_code=404, 
                detail="Run not found or not in running/queued state"
            )
        
        # Try to cancel the task in task_manager
        task_cancelled = await task_manager.cancel_task(run_id)
        
        # Update database status to aborted
        result = await db.runs.update_one(
            {"id": run_id, "user_id": current_user['id']},
            {
                "$set": {
                    "status": "aborted",
                    "finished_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count > 0:
            status_msg = "Run aborted and task cancelled" if task_cancelled else "Run status updated to aborted"
            logger.info(f"{status_msg}: {run_id}")
            return {
                "success": True,
                "message": status_msg,
                "run_id": run_id,
                "task_cancelled": task_cancelled
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to abort run")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error aborting run {run_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error aborting run: {str(e)}")

@router.post("/runs/abort-multiple")
async def abort_multiple_runs(
    run_ids: List[str], 
    current_user: dict = Depends(get_current_user)
):
    """Abort multiple running or queued scraping jobs."""
    try:
        results = {
            "success": [],
            "failed": [],
            "not_found": []
        }
        
        for run_id in run_ids:
            try:
                # Verify run belongs to user and is in abortable state
                run = await db.runs.find_one({
                    "id": run_id,
                    "user_id": current_user['id'],
                    "status": {"$in": ["running", "queued"]}
                })
                
                if not run:
                    results["not_found"].append(run_id)
                    continue
                
                # Try to cancel the task
                task_cancelled = await task_manager.cancel_task(run_id)
                
                # Update database status
                update_result = await db.runs.update_one(
                    {"id": run_id, "user_id": current_user['id']},
                    {
                        "$set": {
                            "status": "aborted",
                            "finished_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    results["success"].append({
                        "run_id": run_id,
                        "task_cancelled": task_cancelled
                    })
                    logger.info(f"Aborted run: {run_id}, task_cancelled: {task_cancelled}")
                else:
                    results["failed"].append(run_id)
                    
            except Exception as e:
                logger.error(f"Error aborting run {run_id}: {str(e)}")
                results["failed"].append(run_id)
        
        return {
            "success": True,
            "results": results,
            "total_requested": len(run_ids),
            "total_aborted": len(results["success"]),
            "total_failed": len(results["failed"]),
            "total_not_found": len(results["not_found"])
        }
        
    except Exception as e:
        logger.error(f"Error in abort_multiple_runs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error aborting runs: {str(e)}")

@router.post("/runs/abort-all")
async def abort_all_runs(
    status_filter: Optional[str] = "running",
    current_user: dict = Depends(get_current_user)
):
    """Abort all running or queued runs for the current user."""
    try:
        # Validate status filter
        valid_statuses = ["running", "queued", "all"]
        if status_filter not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter. Must be one of: {valid_statuses}"
            )
        
        # Build query based on status filter
        query = {"user_id": current_user['id']}
        if status_filter == "all":
            query["status"] = {"$in": ["running", "queued"]}
        else:
            query["status"] = status_filter
        
        # Find all matching runs
        runs = await db.runs.find(query, {"_id": 0, "id": 1}).to_list(length=None)
        run_ids = [run["id"] for run in runs]
        
        if not run_ids:
            return {
                "success": True,
                "message": f"No {status_filter} runs found to abort",
                "total_aborted": 0
            }
        
        # Use the abort_multiple_runs logic
        results = {
            "success": [],
            "failed": []
        }
        
        for run_id in run_ids:
            try:
                # Try to cancel the task
                task_cancelled = await task_manager.cancel_task(run_id)
                
                # Update database status
                update_result = await db.runs.update_one(
                    {"id": run_id, "user_id": current_user['id']},
                    {
                        "$set": {
                            "status": "aborted",
                            "finished_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    results["success"].append({
                        "run_id": run_id,
                        "task_cancelled": task_cancelled
                    })
                else:
                    results["failed"].append(run_id)
                    
            except Exception as e:
                logger.error(f"Error aborting run {run_id}: {str(e)}")
                results["failed"].append(run_id)
        
        return {
            "success": True,
            "message": f"Aborted {len(results['success'])} {status_filter} runs",
            "results": results,
            "total_aborted": len(results["success"]),
            "total_failed": len(results["failed"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in abort_all_runs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error aborting runs: {str(e)}")

# ============= Dataset Routes =============
@router.get("/datasets/{run_id}/items")
async def get_dataset_items(
    run_id: str, 
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None
):
    """Get dataset items for a run with pagination."""
    # Verify run belongs to user
    run = await db.runs.find_one({"id": run_id, "user_id": current_user['id']})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Build query
    query = {"run_id": run_id}
    
    # Add search filter (search across all data fields)
    if search:
        # Search in nested data field
        query["$or"] = [
            {"data.title": {"$regex": search, "$options": "i"}},
            {"data.address": {"$regex": search, "$options": "i"}},
            {"data.city": {"$regex": search, "$options": "i"}},
            {"data.category": {"$regex": search, "$options": "i"}},
            {"data.phone": {"$regex": search, "$options": "i"}},
            {"data.email": {"$regex": search, "$options": "i"}}
        ]
    
    # Get total count
    total_count = await db.dataset_items.count_documents(query)
    
    # Calculate skip
    skip = (page - 1) * limit
    
    # Get items with pagination
    items = await db.dataset_items.find(
        query,
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/datasets/{run_id}/export")
async def export_dataset(run_id: str, format: str = "json", current_user: dict = Depends(get_current_user)):
    """Export dataset in various formats."""
    from fastapi.responses import StreamingResponse
    import io
    import json
    import csv
    
    # Verify run belongs to user
    run = await db.runs.find_one({"id": run_id, "user_id": current_user['id']})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    items = await db.dataset_items.find({"run_id": run_id}, {"_id": 0}).to_list(10000)
    
    if format == "json":
        content = json.dumps([item['data'] for item in items], indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=dataset_{run_id}.json"}
        )
    
    elif format == "csv":
        if not items:
            raise HTTPException(status_code=404, detail="No data to export")
        
        output = io.StringIO()
        # Get all unique keys from all items
        all_keys = set()
        for item in items:
            all_keys.update(item['data'].keys())
        
        writer = csv.DictWriter(output, fieldnames=sorted(all_keys))
        writer.writeheader()
        for item in items:
            writer.writerow(item['data'])
        
        content = output.getvalue()
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=dataset_{run_id}.csv"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'json' or 'csv'")

# ============= Proxy Routes =============
@router.get("/proxies", response_model=List[Proxy])
async def get_proxies(current_user: dict = Depends(get_current_user)):
    """Get all proxies."""
    proxies = await db.proxies.find({}, {"_id": 0}).to_list(1000)
    
    # Convert datetime strings
    for proxy in proxies:
        if isinstance(proxy.get('created_at'), str):
            proxy['created_at'] = datetime.fromisoformat(proxy['created_at'])
        if isinstance(proxy.get('last_used'), str):
            proxy['last_used'] = datetime.fromisoformat(proxy['last_used'])
        if isinstance(proxy.get('last_check'), str):
            proxy['last_check'] = datetime.fromisoformat(proxy['last_check'])
    
    return proxies

@router.post("/proxies", response_model=Proxy)
async def add_proxy(proxy_data: ProxyCreate, current_user: dict = Depends(get_current_user)):
    """Add a new proxy."""
    proxy = Proxy(
        host=proxy_data.host,
        port=proxy_data.port,
        username=proxy_data.username,
        password=proxy_data.password,
        protocol=proxy_data.protocol
    )
    
    doc = proxy.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.proxies.insert_one(doc)
    
    return proxy

@router.post("/proxies/fetch-free")
async def fetch_free_proxies(current_user: dict = Depends(get_current_user)):
    """Fetch and add free proxies from public sources."""
    count = await proxy_manager.add_free_proxies()
    return {"message": f"Added {count} new proxies"}

@router.post("/proxies/health-check")
async def health_check_proxies(current_user: dict = Depends(get_current_user)):
    """Run health check on all proxies."""
    healthy = await proxy_manager.health_check_all()
    total = await db.proxies.count_documents({})
    return {"healthy": healthy, "total": total}

@router.delete("/proxies/{proxy_id}")
async def delete_proxy(proxy_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a proxy."""
    result = await db.proxies.delete_one({"id": proxy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proxy not found")
    return {"message": "Proxy deleted successfully"}

# ============= Lead Chat Routes (AI Engagement Advice) =============
@router.post("/leads/{lead_id}/chat")
async def chat_with_lead(
    lead_id: str,
    chat_request: LeadChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered engagement advice for a lead."""
    try:
        # Get lead data from dataset_items
        lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Verify user has access to this lead
        run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
        if not run:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize chat service
        chat_service = LeadChatService()
        
        # Get previous chat history
        chat_history = await db.lead_chats.find(
            {"lead_id": lead_id, "user_id": current_user['id']},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        
        # Get AI response
        ai_response = await chat_service.get_engagement_advice(
            lead_data={**chat_request.lead_data, 'id': lead_id},
            user_message=chat_request.message,
            chat_history=chat_history
        )
        
        # Save user message
        user_message = LeadChatMessage(
            lead_id=lead_id,
            user_id=current_user['id'],
            role='user',
            content=chat_request.message
        )
        user_doc = user_message.model_dump()
        user_doc['created_at'] = user_doc['created_at'].isoformat()
        await db.lead_chats.insert_one(user_doc)
        
        # Save AI response
        ai_message = LeadChatMessage(
            lead_id=lead_id,
            user_id=current_user['id'],
            role='assistant',
            content=ai_response
        )
        ai_doc = ai_message.model_dump()
        ai_doc['created_at'] = ai_doc['created_at'].isoformat()
        await db.lead_chats.insert_one(ai_doc)
        
        return {
            "response": ai_response,
            "message_id": ai_message.id
        }
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leads/{lead_id}/chat")
async def get_lead_chat_history(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history for a lead."""
    # Verify access
    lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
    if not run:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get chat history
    messages = await db.lead_chats.find(
        {"lead_id": lead_id, "user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Convert datetime strings
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return messages

@router.post("/leads/{lead_id}/outreach-template")
async def generate_outreach_template(
    lead_id: str,
    channel: str = "email",
    current_user: dict = Depends(get_current_user)
):
    """Generate a personalized outreach template for a lead."""
    try:
        # Get lead data
        lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Verify access
        run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
        if not run:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate template
        chat_service = LeadChatService()
        template = await chat_service.generate_outreach_template(
            lead_data={**lead['data'], 'id': lead_id},
            channel=channel
        )
        
        return {"template": template}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Template generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")

# ============= Global Chat Routes =============
@router.post("/chat/global")
async def global_chat(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced global chat assistant with COMPLETE automation control - full AI agent."""
    try:
        message = request.get('message')
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Use enhanced global chat service with user context
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        result = await chat_service.chat(message)
        
        # Handle MULTIPLE runs if created (supports multiple commands in one request)
        if result.get("run_ids") and len(result["run_ids"]) > 0:
            logger.info(f"🔄 Processing {len(result['run_ids'])} runs from chat command")
            
            # Start ALL runs in parallel
            for idx, run_id in enumerate(result["run_ids"]):
                logger.info(f"📋 Processing run {idx+1}/{len(result['run_ids'])}: {run_id}")
                
                actor_id = result.get("actor_id") if not result.get("run_ids") else (
                    result.get("actor_id") if idx == 0 else None
                )
                input_data = result.get("input_data") if not result.get("run_ids") else (
                    result.get("input_data") if idx == 0 else None
                )
                
                # Fetch run details if not provided
                if not actor_id or not input_data:
                    logger.info(f"🔍 Fetching run details from database for {run_id}")
                    run = await db.runs.find_one({"id": run_id}, {"_id": 0})
                    if run:
                        actor_id = run.get("actor_id")
                        input_data = run.get("input_data")
                        logger.info(f"✓ Found actor: {run.get('actor_name')}, input: {input_data}")
                    else:
                        logger.error(f"❌ Run {run_id} not found in database!")
                        continue
                
                if actor_id and input_data:
                    logger.info(f"🤖 AI Agent starting run {run_id} ({idx+1}/{len(result['run_ids'])}) from chat...")
                    
                    # Use task manager for parallel execution
                    await task_manager.start_task(
                        run_id,
                        execute_scraping_job(
                            run_id,
                            actor_id,
                            current_user['id'],
                            input_data
                        )
                    )
                    logger.info(f"✓ Run {run_id} started by AI Agent. Active tasks: {task_manager.get_running_count()}")
                else:
                    logger.error(f"❌ Missing actor_id or input_data for run {run_id}")
        # Backwards compatibility: handle single run_id
        elif result.get("run_id") and result.get("actor_id"):
            run_id = result["run_id"]
            actor_id = result["actor_id"]
            input_data = result["input_data"]
            
            logger.info(f"🤖 AI Agent starting run {run_id} from chat...")
            
            # Use task manager for parallel execution
            await task_manager.start_task(
                run_id,
                execute_scraping_job(
                    run_id,
                    actor_id,
                    current_user['id'],
                    input_data
                )
            )
            logger.info(f"✓ Run {run_id} started by AI Agent. Active tasks: {task_manager.get_running_count()}")
        
        # Return response with action metadata for UI automation
        response_data = {
            "response": result["response"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Include action metadata if present (navigate, export, fill_and_run, etc.)
        if result.get("action"):
            response_data.update(result["action"])
        
        return response_data
    
    except Exception as e:
        logger.error(f"Global chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/global/history")
async def get_chat_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get user's global chat conversation history."""
    try:
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        history = await chat_service.get_conversation_history(limit=limit)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat/global/history")
async def clear_chat_history(
    current_user: dict = Depends(get_current_user)
):
    """Clear user's global chat conversation history."""
    try:
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        result = await chat_service.clear_history()
        return result
    except Exception as e:
        logger.error(f"Error clearing chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= Visual Scraper Builder Routes =============

# SCRAPER BUILDER ENDPOINTS REMOVED
# The following endpoints have been deleted:
# - POST /scrapers/builder/test-selector
# - POST /scrapers/builder/preview-proxy
# - POST /scrapers/builder/test
# - POST /scrapers/config (create)
# - GET /scrapers/config (list)
# - GET /scrapers/config/{config_id} (get)
# - PUT /scrapers/config/{config_id} (update)
# - DELETE /scrapers/config/{config_id} (delete)
# - POST /scrapers/config/{config_id}/run
# - POST /scrapers/config/{config_id}/publish



# ============= Schedule Routes =============
@router.post("/schedules", status_code=201)
async def create_schedule(
    schedule_data: "ScheduleCreate",
    current_user: dict = Depends(get_current_user)
):
    """Create a new schedule for automatic actor runs."""
    from models import Schedule, ScheduleCreate
    from services.scheduler_service import get_scheduler
    
    # Validate actor exists
    actor = await db.actors.find_one({"id": schedule_data.actor_id})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # Check if user has access to the actor
    if actor['user_id'] != "system" and actor['user_id'] != current_user['id']:
        if not actor.get('is_public', False):
            raise HTTPException(status_code=403, detail="Access denied to this actor")
    
    # Create schedule
    schedule = Schedule(
        user_id=current_user['id'],
        actor_id=schedule_data.actor_id,
        actor_name=actor['name'],
        name=schedule_data.name,
        description=schedule_data.description,
        cron_expression=schedule_data.cron_expression,
        timezone=schedule_data.timezone,
        input_data=schedule_data.input_data,
        is_enabled=schedule_data.is_enabled
    )
    
    # Calculate next run
    from services.scheduler_service import get_scheduler
    scheduler = get_scheduler()
    next_run = scheduler._get_next_run(schedule.cron_expression, schedule.timezone)
    schedule.next_run = next_run
    
    # Save to database
    doc = schedule.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['next_run']:
        doc['next_run'] = doc['next_run'].isoformat()
    if doc['last_run']:
        doc['last_run'] = doc['last_run'].isoformat()
    
    await db.schedules.insert_one(doc)
    
    # Add to scheduler if enabled
    if schedule.is_enabled:
        try:
            await scheduler.add_schedule(
                schedule_id=schedule.id,
                cron_expression=schedule.cron_expression,
                timezone_str=schedule.timezone,
                user_id=current_user['id'],
                actor_id=schedule_data.actor_id,
                input_data=schedule_data.input_data
            )
        except Exception as e:
            logger.error(f"Failed to add schedule to scheduler: {str(e)}")
            # Still return the created schedule
    
    logger.info(f"✅ Schedule created: {schedule.id}")
    return schedule


@router.get("/schedules")
async def get_schedules(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    actor_id: Optional[str] = None,
    is_enabled: Optional[bool] = None
):
    """Get all schedules for the current user with pagination."""
    # Build query
    query = {"user_id": current_user['id']}
    
    if actor_id:
        query["actor_id"] = actor_id
    
    if is_enabled is not None:
        query["is_enabled"] = is_enabled
    
    # Get total count
    total = await db.schedules.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * limit
    schedules = await db.schedules.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Convert datetime strings back to datetime objects for response
    from services.scheduler_service import get_scheduler
    scheduler = get_scheduler()
    
    for schedule in schedules:
        # Convert ISO strings to datetime if needed
        if isinstance(schedule.get('created_at'), str):
            schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
        if isinstance(schedule.get('updated_at'), str):
            schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])
        if isinstance(schedule.get('next_run'), str):
            schedule['next_run'] = datetime.fromisoformat(schedule['next_run'])
        if isinstance(schedule.get('last_run'), str):
            schedule['last_run'] = datetime.fromisoformat(schedule['last_run'])
        
        # Add human-readable cron description
        schedule['human_readable'] = scheduler.get_human_readable_cron(schedule['cron_expression'])
    
    return {
        "schedules": schedules,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/schedules/{schedule_id}")
async def get_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific schedule by ID."""
    schedule = await db.schedules.find_one({"id": schedule_id, "user_id": current_user['id']}, {"_id": 0})
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Convert ISO strings to datetime if needed
    if isinstance(schedule.get('created_at'), str):
        schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
    if isinstance(schedule.get('updated_at'), str):
        schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])
    if isinstance(schedule.get('next_run'), str):
        schedule['next_run'] = datetime.fromisoformat(schedule['next_run'])
    if isinstance(schedule.get('last_run'), str):
        schedule['last_run'] = datetime.fromisoformat(schedule['last_run'])
    
    # Add human-readable cron description
    from services.scheduler_service import get_scheduler
    scheduler = get_scheduler()
    schedule['human_readable'] = scheduler.get_human_readable_cron(schedule['cron_expression'])
    
    return schedule


@router.patch("/schedules/{schedule_id}")
async def update_schedule(
    schedule_id: str,
    schedule_update: "ScheduleUpdate",
    current_user: dict = Depends(get_current_user)
):
    """Update a schedule."""
    from models import ScheduleUpdate
    from services.scheduler_service import get_scheduler
    
    # Check if schedule exists and belongs to user
    schedule = await db.schedules.find_one({"id": schedule_id, "user_id": current_user['id']})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Build update data
    update_data = schedule_update.model_dump(exclude_unset=True)
    
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc)
        
        # If cron expression or timezone changed, recalculate next run
        if 'cron_expression' in update_data or 'timezone' in update_data:
            scheduler = get_scheduler()
            cron_expr = update_data.get('cron_expression', schedule['cron_expression'])
            tz = update_data.get('timezone', schedule['timezone'])
            next_run = scheduler._get_next_run(cron_expr, tz)
            update_data['next_run'] = next_run
        
        # Update database
        await db.schedules.update_one(
            {"id": schedule_id},
            {"$set": update_data}
        )
        
        # Get updated schedule
        updated_schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
        
        # Update scheduler if enabled status changed or cron/timezone changed
        scheduler = get_scheduler()
        if 'is_enabled' in update_data or 'cron_expression' in update_data or 'timezone' in update_data:
            if updated_schedule['is_enabled']:
                # Remove old job and add new one
                await scheduler.remove_schedule(schedule_id)
                await scheduler.add_schedule(
                    schedule_id=schedule_id,
                    cron_expression=updated_schedule['cron_expression'],
                    timezone_str=updated_schedule['timezone'],
                    user_id=current_user['id'],
                    actor_id=updated_schedule['actor_id'],
                    input_data=updated_schedule['input_data']
                )
            else:
                # Remove from scheduler if disabled
                await scheduler.remove_schedule(schedule_id)
        
        logger.info(f"✅ Schedule updated: {schedule_id}")
        
        # Convert datetime objects for response
        if isinstance(updated_schedule.get('created_at'), str):
            updated_schedule['created_at'] = datetime.fromisoformat(updated_schedule['created_at'])
        if isinstance(updated_schedule.get('updated_at'), str):
            updated_schedule['updated_at'] = datetime.fromisoformat(updated_schedule['updated_at'])
        if isinstance(updated_schedule.get('next_run'), str):
            updated_schedule['next_run'] = datetime.fromisoformat(updated_schedule['next_run'])
        if isinstance(updated_schedule.get('last_run'), str):
            updated_schedule['last_run'] = datetime.fromisoformat(updated_schedule['last_run'])
        
        return updated_schedule
    
    return schedule


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a schedule."""
    from services.scheduler_service import get_scheduler
    
    # Check if schedule exists and belongs to user
    schedule = await db.schedules.find_one({"id": schedule_id, "user_id": current_user['id']})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Remove from scheduler
    scheduler = get_scheduler()
    await scheduler.remove_schedule(schedule_id)
    
    # Delete from database
    await db.schedules.delete_one({"id": schedule_id})
    
    logger.info(f"✅ Schedule deleted: {schedule_id}")
    
    return {"message": "Schedule deleted successfully"}


@router.post("/schedules/{schedule_id}/enable")
async def enable_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Enable a schedule."""
    from services.scheduler_service import get_scheduler
    
    schedule = await db.schedules.find_one({"id": schedule_id, "user_id": current_user['id']})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule['is_enabled']:
        return {"message": "Schedule already enabled"}
    
    # Update database
    await db.schedules.update_one(
        {"id": schedule_id},
        {"$set": {"is_enabled": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Add to scheduler
    updated_schedule = await db.schedules.find_one({"id": schedule_id})
    scheduler = get_scheduler()
    await scheduler.add_schedule(
        schedule_id=schedule_id,
        cron_expression=updated_schedule['cron_expression'],
        timezone_str=updated_schedule['timezone'],
        user_id=current_user['id'],
        actor_id=updated_schedule['actor_id'],
        input_data=updated_schedule['input_data']
    )
    
    logger.info(f"✅ Schedule enabled: {schedule_id}")
    
    return {"message": "Schedule enabled successfully"}


@router.post("/schedules/{schedule_id}/disable")
async def disable_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Disable a schedule."""
    from services.scheduler_service import get_scheduler
    
    schedule = await db.schedules.find_one({"id": schedule_id, "user_id": current_user['id']})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if not schedule['is_enabled']:
        return {"message": "Schedule already disabled"}
    
    # Update database
    await db.schedules.update_one(
        {"id": schedule_id},
        {"$set": {"is_enabled": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Remove from scheduler
    scheduler = get_scheduler()
    await scheduler.remove_schedule(schedule_id)
    
    logger.info(f"✅ Schedule disabled: {schedule_id}")
    
    return {"message": "Schedule disabled successfully"}


@router.post("/schedules/{schedule_id}/run-now")
async def run_schedule_now(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger a scheduled run immediately."""
    schedule = await db.schedules.find_one({"id": schedule_id, "user_id": current_user['id']})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Get actor
    actor = await db.actors.find_one({"id": schedule['actor_id']})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # Create run
    from models import Run
    run = Run(
        user_id=current_user['id'],
        actor_id=schedule['actor_id'],
        actor_name=actor['name'],
        actor_icon=actor.get('icon'),
        input_data=schedule['input_data'],
        status="queued",
        origin="Manual (Schedule)"
    )
    
    doc = run.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.runs.insert_one(doc)
    
    # Start scraping
    from services.task_manager import task_manager
    await task_manager.start_task(
        run.id,
        execute_scraping_job(
            run.id,
            schedule['actor_id'],
            current_user['id'],
            schedule['input_data']
        )
    )
    
    # Update schedule statistics for manual runs
    from services.scheduler_service import get_scheduler
    scheduler = get_scheduler()
    await scheduler._update_schedule_status(schedule_id, "success", run.id)
    
    logger.info(f"✅ Manual run triggered for schedule {schedule_id}: {run.id}")
    
    return {"message": "Run triggered successfully", "run_id": run.id, "run": run}


# ============= Policy Management Routes =============

async def check_owner_role(credentials: HTTPAuthorizationCredentials = Depends(api_key_security)):
    """Check if user has owner role."""
    user = await get_api_user(credentials)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can perform this action")
    return user


async def check_admin_or_owner_role(credentials: HTTPAuthorizationCredentials = Depends(api_key_security)):
    """Check if user has admin or owner role."""
    user = await get_api_user(credentials)
    if user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin or owner access required")
    return user


# ============= Category Routes =============
@router.get("/categories", response_model=List[dict])
async def get_all_categories(current_user: dict = Depends(check_admin_or_owner_role)):
    """Get all categories (admin and owner can view)."""
    categories = await db.categories.find().sort("display_order", 1).to_list(length=100)
    
    # Remove MongoDB _id field
    for category in categories:
        if "_id" in category:
            del category["_id"]
    
    return categories


@router.get("/categories/public")
async def get_public_categories():
    """Get all categories (public endpoint for landing site)."""
    categories = await db.categories.find().sort("display_order", 1).to_list(length=100)
    
    # Remove MongoDB _id field and return simplified format
    result = []
    for category in categories:
        result.append({
            "id": category.get("id"),
            "name": category.get("name"),
            "display_order": category.get("display_order", 0)
        })
    
    return {"categories": result}


@router.post("/categories", response_model=dict)
async def create_category(category_data: dict, current_user: dict = Depends(check_owner_role)):
    """Create a new category (only owner can create)."""
    from models.category import CategoryCreate
    from datetime import datetime, timezone
    import uuid
    
    try:
        # Validate input
        category_create = CategoryCreate(**category_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid category data: {str(e)}")
    
    # Check if category with same name already exists
    existing = await db.categories.find_one({"name": category_create.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    # Auto-adjust display order if it's too high
    display_order = category_create.display_order
    max_category = await db.categories.find().sort("display_order", -1).limit(1).to_list(length=1)
    if max_category:
        max_order = max_category[0].get("display_order", -1)
        if display_order > max_order + 1:
            display_order = max_order + 1
    
    # Check if display order already exists
    existing_order = await db.categories.find_one({"display_order": display_order})
    if existing_order:
        # Remove MongoDB _id from existing category
        if "_id" in existing_order:
            del existing_order["_id"]
        
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Display order already exists",
                "existing_category": {
                    "id": existing_order.get("id"),
                    "name": existing_order.get("name"),
                    "display_order": existing_order.get("display_order")
                }
            }
        )
    
    # Create category document
    category = {
        "id": str(uuid.uuid4()),
        "name": category_create.name,
        "description": category_create.description,
        "display_order": display_order,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "created_by": current_user.get("username", "unknown"),
        "updated_by": current_user.get("username", "unknown")
    }
    
    await db.categories.insert_one(category)
    
    # Remove MongoDB _id
    if "_id" in category:
        del category["_id"]
    
    return category


@router.put("/categories/{category_id}", response_model=dict)
async def update_category(category_id: str, category_data: dict, current_user: dict = Depends(check_owner_role)):
    """Update a category (only owner can update)."""
    from datetime import datetime, timezone
    
    # Check if category exists
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.now(timezone.utc),
        "updated_by": current_user.get("username", "unknown")
    }
    
    # Add fields that are provided
    if "name" in category_data:
        # Check if name is already used by another category
        name_check = await db.categories.find_one({"name": category_data["name"], "id": {"$ne": category_id}})
        if name_check:
            raise HTTPException(status_code=400, detail="Category name already exists")
        update_data["name"] = category_data["name"]
    
    if "description" in category_data:
        update_data["description"] = category_data["description"]
    
    if "display_order" in category_data:
        display_order = category_data["display_order"]
        
        # Auto-adjust display order if it's too high
        max_category = await db.categories.find({"id": {"$ne": category_id}}).sort("display_order", -1).limit(1).to_list(length=1)
        if max_category:
            max_order = max_category[0].get("display_order", -1)
            if display_order > max_order + 1:
                display_order = max_order + 1
        
        # Check if display order is already used by another category
        order_check = await db.categories.find_one({"display_order": display_order, "id": {"$ne": category_id}})
        if order_check:
            # Remove MongoDB _id
            if "_id" in order_check:
                del order_check["_id"]
            
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Display order already exists",
                    "existing_category": {
                        "id": order_check.get("id"),
                        "name": order_check.get("name"),
                        "display_order": order_check.get("display_order")
                    }
                }
            )
        
        update_data["display_order"] = display_order
    
    # Update category
    await db.categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    
    # Fetch updated category
    updated_category = await db.categories.find_one({"id": category_id})
    if "_id" in updated_category:
        del updated_category["_id"]
    
    return updated_category


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(check_owner_role)):
    """Delete a category (only owner can delete)."""
    
    # Check if category is used by any policies
    policies_using_category = await db.policies.find_one({"category": category_id})
    if policies_using_category:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete category that is used by policies. Please reassign or delete the policies first."
        )
    
    result = await db.categories.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully", "id": category_id}


@router.get("/categories/max-display-order")
async def get_max_display_order(current_user: dict = Depends(check_owner_role)):
    """Get the maximum display order value among all categories."""
    categories = await db.categories.find().sort("display_order", -1).limit(1).to_list(length=1)
    
    if categories:
        return {"max_display_order": categories[0].get("display_order", 0)}
    else:
        return {"max_display_order": -1}


@router.get("/categories/check-display-order/{display_order}")
async def check_display_order(display_order: int, category_id: Optional[str] = None, current_user: dict = Depends(check_owner_role)):
    """Check if a display order is already in use by another category."""
    query = {"display_order": display_order}
    
    # If checking for update, exclude the current category
    if category_id:
        query["id"] = {"$ne": category_id}
    
    existing = await db.categories.find_one(query)
    
    if existing:
        # Remove MongoDB _id
        if "_id" in existing:
            del existing["_id"]
        
        return {
            "available": False,
            "existing_category": {
                "id": existing.get("id"),
                "name": existing.get("name"),
                "display_order": existing.get("display_order")
            }
        }
    else:
        return {"available": True, "existing_category": None}


@router.post("/categories/swap-display-order")
async def swap_display_order(swap_data: dict, current_user: dict = Depends(check_owner_role)):
    """Swap display orders between two categories."""
    from datetime import datetime, timezone
    
    category_id_1 = swap_data.get("category_id_1")
    category_id_2 = swap_data.get("category_id_2")
    
    if not category_id_1 or not category_id_2:
        raise HTTPException(status_code=400, detail="Both category IDs are required")
    
    # Fetch both categories
    category_1 = await db.categories.find_one({"id": category_id_1})
    category_2 = await db.categories.find_one({"id": category_id_2})
    
    if not category_1:
        raise HTTPException(status_code=404, detail=f"Category {category_id_1} not found")
    if not category_2:
        raise HTTPException(status_code=404, detail=f"Category {category_id_2} not found")
    
    # Get current display orders
    order_1 = category_1.get("display_order", 0)
    order_2 = category_2.get("display_order", 0)
    
    # Swap display orders
    await db.categories.update_one(
        {"id": category_id_1},
        {"$set": {
            "display_order": order_2,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": current_user.get("username", "unknown")
        }}
    )
    
    await db.categories.update_one(
        {"id": category_id_2},
        {"$set": {
            "display_order": order_1,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": current_user.get("username", "unknown")
        }}
    )
    
    return {
        "message": "Display orders swapped successfully",
        "swapped": {
            "category_1": {"id": category_id_1, "new_display_order": order_2},
            "category_2": {"id": category_id_2, "new_display_order": order_1}
        }
    }


# ============= Policy Routes =============
@router.get("/policies", response_model=List[dict])
async def get_all_policies(current_user: dict = Depends(check_admin_or_owner_role)):
    """Get all policies (admin and owner can view)."""
    policies = await db.policies.find().to_list(length=100)
    
    # Remove MongoDB _id field
    for policy in policies:
        if "_id" in policy:
            del policy["_id"]
    
    return policies


@router.get("/policies/{doc_id}", response_model=dict)
async def get_policy_by_id(doc_id: str, current_user: dict = Depends(check_admin_or_owner_role)):
    """Get a specific policy by doc_id (admin and owner can view)."""
    policy = await db.policies.find_one({"doc_id": doc_id})
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    if "_id" in policy:
        del policy["_id"]
    
    return policy


@router.post("/policies", response_model=dict)
async def create_policy(policy_data: PolicyCreate, current_user: dict = Depends(check_owner_role)):
    """Create a new policy (only owner can create)."""
    # Check if policy with same doc_id already exists
    existing = await db.policies.find_one({"doc_id": policy_data.doc_id})
    if existing:
        raise HTTPException(status_code=400, detail="Policy with this doc_id already exists")
    
    policy = Policy(
        **policy_data.dict(),
        created_by=current_user["id"],
        updated_by=current_user["id"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    policy_dict = policy.dict()
    await db.policies.insert_one(policy_dict)
    
    if "_id" in policy_dict:
        del policy_dict["_id"]
    
    return policy_dict


@router.put("/policies/{doc_id}", response_model=dict)
async def update_policy(doc_id: str, policy_data: PolicyUpdate, current_user: dict = Depends(check_owner_role)):
    """Update an existing policy (only owner can update)."""
    # Check if policy exists
    existing = await db.policies.find_one({"doc_id": doc_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Prepare update data
    update_data = {k: v for k, v in policy_data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_by"] = current_user["id"]
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Update the policy
    await db.policies.update_one(
        {"doc_id": doc_id},
        {"$set": update_data}
    )
    
    # Fetch and return updated policy
    updated_policy = await db.policies.find_one({"doc_id": doc_id})
    if "_id" in updated_policy:
        del updated_policy["_id"]
    
    return updated_policy


@router.delete("/policies/{doc_id}")
async def delete_policy(doc_id: str, current_user: dict = Depends(check_owner_role)):
    """Delete a policy (only owner can delete)."""
    result = await db.policies.delete_one({"doc_id": doc_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    return {"message": "Policy deleted successfully", "doc_id": doc_id}


@router.get("/search")
async def global_search(q: str = ""):
    """Global search across Documentation and Legal policies."""
    if not q or len(q) < 2:
        return {"results": []}
    
    query_regex = {"$regex": q, "$options": "i"}
    results = []
    
    # 1. Search General Docs
    docs_cursor = db.docs.find({
        "$or": [
            {"title": query_regex},
            {"content": query_regex},
            {"tags": query_regex}
        ]
    }).limit(5)
    
    async for doc in docs_cursor:
        results.append({
            "type": "doc",
            "title": doc.get("title"),
            "subtitle": doc.get("content")[:100] + "...",
            "url": doc.get("url_path"),
            "icon": doc.get("icon", "file-text"),
            "category": doc.get("category", "Docs")
        })
        
    # 2. Search Legal Policies
    policies_cursor = db.policies.find({
        "$or": [
            {"title": query_regex},
            {"intro": query_regex},
            {"sections.title": query_regex},
            {"sections.content": query_regex}
        ]
    }).limit(5)
    
    async for policy in policies_cursor:
        # Determine best snippet (simplified)
        snippet = policy.get("intro")[:100]
        
        results.append({
            "type": "legal",
            "title": policy.get("title"),
            "subtitle": snippet + "...",
            "url": f"/legal/{policy.get('doc_id')}",
            "icon": "scale",
            "category": "Legal"
        })
    
    return {"results": results}


@router.get("/search")
async def search_documents(q: str = ""):
    """Search across legal documents and documentation."""
    if not q or len(q.strip()) < 2:
        return {"results": []}
    
    query = q.strip().lower()
    results = []
    
    # Search in policies/legal documents
    policies = await db.policies.find({
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"label": {"$regex": query, "$options": "i"}},
            {"intro": {"$regex": query, "$options": "i"}},
            {"doc_id": {"$regex": query, "$options": "i"}}
        ]
    }).to_list(length=20)
    
    for policy in policies:
        title = policy.get("label") or policy.get("title", "Untitled")
        doc_id = policy.get("doc_id", "")
        category = policy.get("category", "Legal")
        
        results.append({
            "title": title,
            "subtitle": policy.get("intro", "")[:150] + "..." if policy.get("intro") else "",
            "description": policy.get("intro", ""),
            "content": policy.get("intro", ""),
            "url": f"/legal/{doc_id}",
            "type": "legal",
            "category": category,
            "breadcrumb": ["Legal", category, title]
        })
    
    # Search in docs collection if it exists
    try:
        docs_cursor = db.docs.find({
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"content": {"$regex": query, "$options": "i"}},
                {"tags": {"$regex": query, "$options": "i"}}
            ]
        }).limit(10)
        
        async for doc in docs_cursor:
            title = doc.get("title", "Untitled")
            category = doc.get("category", "Platform")
            
            results.append({
                "title": title,
                "subtitle": doc.get("content", "")[:150] + "..." if doc.get("content") else "",
                "description": doc.get("description", doc.get("content", "")),
                "content": doc.get("content", ""),
                "url": doc.get("url_path", "#"),
                "type": doc.get("type", "doc"),
                "category": category,
                "breadcrumb": ["Documentation", category, title]
            })
    except:
        pass  # Docs collection might not exist
    
    return {"results": results}


@router.get("/legal")
async def get_all_legal_documents():
    """Get list of all legal documents (public endpoint for landing site sidebar)."""
    # Fetch policies from database (if is_public field exists, it must be True; otherwise include all)
    policies = await db.policies.find({
        "$or": [
            {"is_public": True},
            {"is_public": {"$exists": False}}
        ]
    }).to_list(length=100)
    
    # Transform to format expected by frontend
    documents = []
    for policy in policies:
        documents.append({
            "label": policy.get("label") or policy.get("title", "Untitled"),
            "id": policy.get("doc_id"),
            "category": policy.get("category", "Legal Documents")
        })
    
    return {"documents": documents}


@router.get("/legal/{doc_id}")
async def get_legal_document(doc_id: str):
    """Get content for a specific legal document (public endpoint)."""
    
    # Try to fetch from database first
    policy = await db.policies.find_one({"doc_id": doc_id})
    
    if policy:
        # Remove MongoDB _id field
        if "_id" in policy:
            del policy["_id"]
        return policy
    
    # Fallback to hardcoded data if not in database (for backward compatibility)
    # Common intro text
    base_intro = "Scrapi Technologies Private Limited, with its registered office in Bengaluru, India, welcomes you. This document outlines our policies and your rights under Indian Law."
    
    # Database of legal documents (Mock Data - Fallback)
    documents = {
        "cookie-policy": {
            "title": "Cookie Policy",
            "last_updated": "August 15, 2025",
            "intro": "This Cookie Policy describes how Scrapi Technologies Pvt. Ltd. ('we', 'us', or 'our') uses cookies on our Website and Platform, in compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.",
            "sections": [
                {
                    "id": "cookies",
                    "title": "What are Cookies?",
                    "content": "Cookies are small text files stored on your device when you access our Website or Platform. They help us function effectively and improve your experience. We use them in accordance with Indian data privacy regulations."
                },
                {
                    "id": "types",
                    "title": "Types of Cookies We Use",
                    "subsections": [
                        {"title": "Strictly Necessary Cookies", "id": "strictly-necessary", "content": "Essential for the website's operation (e.g., login, security). These cannot be disabled."},
                        {"title": "Performance & Analytics Cookies", "id": "performance", "content": "Help us understand how you use our site to improve performance. We use aggregated data where possible."},
                        {"title": "Functional Cookies", "id": "functional", "content": "Enable enhanced functionality and personalization (e.g., language preference)."},
                         {"title": "Targeting/Advertising Cookies", "id": "targeting", "content": "Used to deliver relevant advertisements. We request explicit consent for these as per DPDP Act, 2023."}
                    ]
                },
                {
                    "id": "consent",
                    "title": "Consent and Control",
                    "content": "By using our website, you consent to the use of necessary cookies. For other types, you have the right to withdraw consent at any time via the Cookie Settings."
                },
                {
                    "id": "duration",
                    "title": "Cookie Duration",
                    "content": "Cookies have different lifespans. Session cookies expire when you close your browser, while persistent cookies remain for a specified period.",
                    "table": [
                        {"name": "AWSALB", "description": "AWS Load Balancer for routing", "type": "Strictly necessary", "expiration": "6 days"},
                        {"name": "ScrapiAuth", "description": "User authentication token", "type": "Strictly necessary", "expiration": "Session"},
                        {"name": "CONSENT", "description": "Cookie consent status", "type": "Necessary", "expiration": "1 year"},
                        {"name": "_ga", "description": "Google Analytics user distinction", "type": "Performance", "expiration": "2 years"}
                    ]
                }
            ]
        },
        "terms-of-service": {
            "title": "Terms of Service",
            "last_updated": "September 1, 2025",
            "intro": "These Terms of Service ('Terms') govern your access to and use of Scrapi's services. By accessing our platform, you agree to be bound by these Terms, which are governed by the laws of India.",
            "sections": [
                {
                    "id": "acceptance",
                    "title": "Acceptance of Terms",
                    "content": "By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you may not use our Services."
                },
                {
                    "id": "account",
                    "title": "User Accounts & KYC",
                    "content": "You may need to register an account. You agree to provide accurate information. For certain services, we may require KYC documents as per Indian regulations."
                },
                {
                    "id": "usage",
                    "title": "Usage Restrictions",
                    "content": "You agree not to misuse the Services. Prohibited acts include violating the Information Technology Act, 2000, scraping prohibited data, or infringing intellectual property rights."
                },
                {
                     "id": "jurisdiction",
                     "title": "Governing Law and Jurisdiction",
                     "content": "These Terms shall be governed by the laws of India. Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka."
                }
            ]
        },
        "privacy-policy": {
            "title": "Privacy Policy",
            "last_updated": "August 20, 2025",
            "intro": "We are committed to protecting your privacy in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.",
            "sections": [
                {
                    "id": "collection",
                    "title": "Information We Collect",
                    "content": "We collect personal data you provide (Name, Email, Phone) and usage data. We process this data only for the purposes you have consented to or for legitimate uses defined by law."
                },
                {
                    "id": "rights",
                    "title": "Your Rights under DPDP Act",
                    "subsections": [
                        {"title": "Right to Access", "id": "access", "content": "You can request a summary of your personal data being processed."},
                        {"title": "Right to Correction", "id": "correction", "content": "You can request correction or completion of inaccurate data."},
                        {"title": "Right to Erasure", "id": "erasure", "content": "You can request deletion of your data unless retention is required by law."},
                        {"title": "Right to Grievance Redressal", "id": "grievance", "content": "You can contact our Grievance Officer for any privacy concerns."}
                    ]
                },
                {
                    "id": "sharing",
                    "title": "Data Sharing & Localization",
                    "content": "We do not sell your data. We may share data with service providers under strict contracts. Your data is primarily stored on servers in India or in countries with adequate data protection standards as approved by the Indian Government."
                },
                {
                     "id": "contact",
                     "title": "Grievance Officer",
                     "content": "For any privacy-related concerns, please contact our Grievance Officer: Mr. Rahul Sharma, Email: grievance@scrapi.com, Address: Scrapi Tech, HSR Layout, Bengaluru - 560102."
                }
            ]
        },
        "acceptable-use-policy": {
            "title": "Acceptable Use Policy",
            "last_updated": "July 10, 2025",
            "intro": "This policy sets out the rules for using Scrapi's Services to ensure safety and compliance with Indian laws.",
            "sections": [
                {
                    "id": "prohibited",
                    "title": "Prohibited Activities",
                    "content": "You may not use the Services for: (a) Hosting/sharing content prohibited under Section 67 of the IT Act (obscenity, child sexual abuse material); (b) Promoting hate speech, violence, or discrimination; (c) Violating copyright or trademark laws; (d) Sending spam."
                },
                {
                    "id": "enforcement",
                    "title": "Enforcement",
                    "content": "We reserve the right to suspend or terminate accounts violating this policy and report illegal activities to Indian law enforcement agencies (CERT-In, Cyber Crime Cell)."
                }
            ]
        },
        "gdpr": {
            "title": "GDPR Compliance",
            "last_updated": "May 25, 2025",
            "intro": "While we are an Indian company, we respect the privacy of our global users and comply with the GDPR for our EU users.",
            "sections": [
                {
                    "id": "rights",
                    "title": "Your Rights",
                    "content": "EU users have rights to access, rectification, erasure, restriction of processing, and data portability."
                },
                {
                    "id": "transfer",
                    "title": "Data Transfers",
                    "content": "Transfers of data from the EEA to India are protected by Standard Contractual Clauses (SCCs)."
                }
            ]
        },
        "ccpa": {
            "title": "CCPA Notice",
            "last_updated": "January 1, 2025",
            "intro": "Notice for California residents regarding their privacy rights.",
            "sections": [
                {
                    "id": "rights",
                    "title": "Your California Privacy Rights",
                    "content": "Right to know, delete, and opt-out of sale of personal information."
                },
                {
                    "id": "sales",
                    "title": "No Sale of Personal Information",
                    "content": "Scrapi does not sell personal information."
                }
            ]
        },
        "security": {
            "title": "Security Measures",
            "last_updated": "August 1, 2025",
            "intro": "We implement reasonable security practices and procedures as required by the IT Act, 2000 and ISO 27001 standards.",
            "sections": [
                {
                    "id": "infrastructure",
                    "title": "Infrastructure Security",
                    "content": "Hosted on secure cloud infrastructure with firewalls, IDS/IPS, and regular audits."
                },
                {
                    "id": "data",
                    "title": "Data Encryption",
                    "content": "Data is encrypted in transit (TLS 1.2+) and at rest (AES-256)."
                },
                {
                     "id": "incident",
                     "title": "Incident Reporting",
                     "content": "We have a mechanism to report cybersecurity incidents to CERT-In within the mandated timelines."
                }
            ]
        },
        "subprocessors": {
            "title": "List of Subprocessors",
            "last_updated": "June 15, 2025",
            "intro": "We use the following third-party service providers:",
            "sections": [
                {
                    "id": "list",
                    "title": "Current Subprocessors",
                    "content": "Entities processing data on our behalf:",
                    "table": [
                        {"name": "Amazon Web Services", "description": "Cloud Hosting", "type": "Infrastructure", "location": "Mumbai, India (Primary)"},
                        {"name": "MongoDB Atlas", "description": "Database", "type": "Database", "location": "Mumbai, India"},
                        {"name": "Razorpay/Stripe", "description": "Payment Gateway", "type": "Payments", "location": "India/USA"},
                        {"name": "SendGrid", "description": "Email Service", "type": "Communication", "location": "USA"},
                         {"name": "Google Analytics", "description": "Analytics", "type": "Analytics", "location": "Global"}
                    ]
                }
            ]
        }
    }
    
    doc = documents.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return doc

