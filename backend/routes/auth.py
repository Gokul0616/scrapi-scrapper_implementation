
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from database import get_db
from routes.utils import parse_datetime_safe, generate_random_profile_color
from models import (
    UserCreate, UserLogin, UserResponse, 
    AdminUserCreate, AdminUserLogin, AdminUserResponse,
    CaptchaVerifyRequest, ShieldChallengeResponse, ShieldVerifyRequest
)
from models.notification import Notification
from auth import create_access_token, get_current_user, hash_password, verify_password
from services.google_auth import get_google_auth_url, exchange_code_for_token, verify_google_id_token
from services.github_auth import get_github_auth_url, exchange_github_code_for_token, get_github_user_info
from services.session_service import SessionService
from services.email_service import get_email_service
import uuid
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# ============= CAPTCHA and Anti-Bot Routes =============

@router.get("/auth/captcha")
async def get_captcha(request: Request):
    """Generate a new CAPTCHA challenge."""
    captcha_service = request.app.state.captcha_service
    return await captcha_service.create_captcha()

@router.post("/auth/verify-captcha")
async def verify_captcha(request: Request, verify_data: CaptchaVerifyRequest):
    """
    Verify a CAPTCHA solution. 
    Optionally checks if the user is blocked before allowing verification.
    """
    captcha_service = request.app.state.captcha_service
    access_control_service = request.app.state.access_control_service
    
    # Check if blocked by IP
    client_ip = request.client.host
    is_blocked, remaining = await access_control_service.is_blocked(client_ip, verify_data.email or "")
    if is_blocked:
        time_str = access_control_service.format_time_remaining(remaining)
        raise HTTPException(
            status_code=429, 
            detail=f"Too many attempts. Please try again in {time_str}."
        )

    is_valid = await captcha_service.verify_captcha(verify_data.captcha_id, verify_data.answer)
    if not is_valid:
        await access_control_service.record_failure(client_ip, verify_data.email or "")
        raise HTTPException(status_code=400, detail="Invalid CAPTCHA answer")
    
    return {"success": True}

@router.get("/auth/challenge", response_model=ShieldChallengeResponse)
async def get_shield_challenge(request: Request):
    """Generate a high-security Proof-of-Work challenge."""
    security_service = request.app.state.security_service
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    return await security_service.generate_challenge(client_ip, user_agent)

@router.post("/auth/verify-shield")
async def verify_shield(verify_data: ShieldVerifyRequest, request: Request):
    """
    Verify the Enterprise Shield (PoW + Fingerprint).
    """
    security_service = request.app.state.security_service
    client_ip = request.client.host
    
    success, message = await security_service.verify_shield(
        verify_data.nonce, 
        verify_data.solution, 
        verify_data.fingerprint,
        client_ip
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    return {"success": True}

# ============= Authentication Routes =============
@router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate, request: Request):
    """Register a new user from scraper website - always creates 'user' role."""
    from services.email_validator import validate_email_comprehensive
    from utils.username_generator import generate_unique_username
    
    db = get_db()
    client_ip = request.client.host
    access_control_service = request.app.state.access_control_service
    
    # 🛡️ Rate Limiting Check
    is_blocked, remaining = await access_control_service.is_blocked(client_ip, user_data.email)
    if is_blocked:
        time_str = access_control_service.format_time_remaining(remaining)
        raise HTTPException(
            status_code=429, 
            detail=f"Too many failed registration attempts. Please try again in {time_str}."
        )
    
    # 🛡️ Enterprise Shield Check
    if user_data.shield_nonce and user_data.shield_solution and user_data.fingerprint:
        security_service = request.app.state.security_service
        success, msg = await security_service.verify_shield(
            user_data.shield_nonce,
            user_data.shield_solution,
            user_data.fingerprint,
            request.client.host
        )
        if not success:
            await access_control_service.record_failure(client_ip, user_data.email)
            raise HTTPException(status_code=400, detail=msg)
    # Fallback to legacy CAPTCHA if Shield is not provided (optional for now)
    elif user_data.captcha_id and user_data.captcha_answer:
        captcha_service = request.app.state.captcha_service
        if not await captcha_service.verify_captcha(user_data.captcha_id, user_data.captcha_answer):
            await access_control_service.record_failure(client_ip, user_data.email)
            raise HTTPException(status_code=400, detail="Invalid CAPTCHA answer")
    else:
        # Require at least one form of security
        raise HTTPException(status_code=400, detail="Security verification required")
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
    
    # Check if user document exists with 'deleted' status
    existing_deleted = await db.users.find_one({"email": user_data.email, "account_status": "deleted"})
    if existing_deleted:
        raise HTTPException(
            status_code=400,
            detail="This email is associated with a deleted account. Please contact support."
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
    from utils.id_utils import generate_user_id
    
    user_id = generate_user_id(generated_username)
    
    user = User(
        id=user_id,
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
    
    # Create session
    session_service = SessionService(db.sessions)
    jti = await session_service.create_session(
        user_id=user.id,
        user_agent_str=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    
    # Create token
    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role, "jti": jti})
    
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
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            profile_color=user.profile_color,
            profile_picture=None,
            theme_preference=user.theme_preference
        )
    }

@router.get("/auth/google/url")
async def google_auth_url():
    """Return the Google OAuth 2.0 authorization URL."""
    return {"url": get_google_auth_url()}

@router.get("/auth/google/callback")
async def google_auth_callback(code: str, request: Request):
    """Google OAuth 2.0 callback - handles both signup and login."""
    from utils.username_generator import generate_unique_username
    from models import User
    from utils.id_utils import generate_user_id
    
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    # Exchange code for tokens
    tokens = await exchange_code_for_token(code)
    id_token_str = tokens.get("id_token")
    
    if not id_token_str:
        raise HTTPException(status_code=400, detail="Failed to get ID token from Google")

    # Verify ID token
    google_user = verify_google_id_token(id_token_str)
    email = google_user.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Google token does not contain email")

    # Check if user already exists in standard users
    user_doc = await db.users.find_one({"email": email})
    collection_name = "users"
    
    if not user_doc:
        # Check if user exists in admin users
        user_doc = await db.admin_users.find_one({"email": email})
        collection_name = "admin_users"
    
    user_id = None
    username = None
    role = "user"
    
    if user_doc:
        user_id = user_doc['id']
        username = user_doc['username']
        role = user_doc.get('role', 'user' if collection_name == "users" else "admin")
        
        # Check if account is deleted
        if user_doc.get("account_status") == "deleted":
            raise HTTPException(
                status_code=403, 
                detail="This account has been permanently deleted and cannot be accessed."
            )

        update_fields = {
            "last_login_at": datetime.now(timezone.utc).isoformat()
        }
        
        if not user_doc.get("google_id"):
            update_fields["google_id"] = google_user.get("sub")
        
        # Update last login and google_id in the correct collection
        await db[collection_name].update_one(
            {"id": user_id},
            {"$set": update_fields}
        )

        # Check if account is pending deletion
        if user_doc.get("account_status") == "pending_deletion":
            deletion_scheduled_at = user_doc.get("deletion_scheduled_at")
            permanent_deletion_at = user_doc.get("permanent_deletion_at")
            
            # Days remaining
            days_remaining = 0
            if permanent_deletion_at:
                permanent_deletion_at = parse_datetime_safe(permanent_deletion_at)
                days_remaining = max(0, (permanent_deletion_at - datetime.now(timezone.utc)).days)
            
            session_service = SessionService(db.sessions)
            jti = await session_service.create_session(
                user_id=user_id,
                user_agent_str=request.headers.get("user-agent", ""),
                ip_address=request.client.host if request.client else "127.0.0.1"
            )
            token = create_access_token({"sub": user_id, "username": username, "role": role, "jti": jti})
            frontend_url = os.environ.get("FRONTEND_URL", "https://app.scrapi.com")
            
            # Construct redirect URL with deletion info
            redirect_url = f"{frontend_url}/auth/callback?token={token}&account_status=pending_deletion"
            if deletion_scheduled_at:
                redirect_url += f"&deletion_scheduled_at={deletion_scheduled_at}"
            if permanent_deletion_at:
                redirect_url += f"&permanent_deletion_at={permanent_deletion_at.isoformat()}"
            redirect_url += f"&days_remaining={days_remaining}&username={username}&user_id={user_id}"
            
            return RedirectResponse(url=redirect_url)

        # Existing user - update profile picture if provided and not set
        if google_user.get("picture"):
             await db.user_settings.update_one(
                {"user_id": user_id},
                {"$set": {"profile_picture": google_user["picture"]}},
                upsert=True
            )
    else:
        # New user - register
        # Check if email is associated with a deleted account
        deleted_account = await db.deleted_accounts_legal_retention.find_one({"email": email})
        if deleted_account:
             # In a real app, you might want to redirect to a FE error page
             raise HTTPException(status_code=400, detail="Email associated with deleted account")

        # Auto-generate a unique username
        existing_usernames = set()
        async for user in db.users.find({}, {"username": 1}):
            existing_usernames.add(user.get("username"))
        
        username = generate_unique_username(existing_usernames)
        user_id = generate_user_id(username)
        
        new_user = User(
            id=user_id,
            username=username,
            email=email,
            first_name=google_user.get("first_name"),
            last_name=google_user.get("last_name"),
            auth_provider="google",
            google_id=google_user.get("sub"),
            role="user",
            profile_color=generate_random_profile_color()
        )
        
        doc = new_user.model_dump()
        doc['created_at'] = doc['created_at']
        await db.users.insert_one(doc)

        # Create user settings for profile picture
        if google_user.get("picture"):
            await db.user_settings.insert_one({
                "user_id": user_id,
                "profile_picture": google_user["picture"],
                "created_at": datetime.now(timezone.utc)
            })
        
        # Create welcome notification
        welcome_notification = Notification(
            user_id=user_id,
            title="Welcome to Scrapi! 👋",
            message="You've successfully signed up with Google.",
            type="welcome",
            icon="👋",
            link="/actors"
        )
        await db.notifications.insert_one(welcome_notification.model_dump())
    
    # Create session
    session_service = SessionService(db.sessions)
    jti = await session_service.create_session(
        user_id=user_id,
        user_agent_str=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    
    # Create token
    token = create_access_token({"sub": user_id, "username": username, "role": role, "jti": jti})
    
    # Redirect back to frontend with token
    # Assuming frontend has a route /auth/callback to handle this
    frontend_url = os.environ.get("FRONTEND_URL", "https://app.scrapi.com")
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={token}")

@router.get("/auth/github/url")
async def github_auth_url():
    """Returns the GitHub OAuth authorization URL."""
    try:
        return {"url": get_github_auth_url()}
    except Exception as e:
        logger.error(f"Error generating GitHub auth URL: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate GitHub authentication URL")

@router.get("/auth/github/callback")
async def github_auth_callback(code: str, request: Request):
    """
    Handle GitHub OAuth callback.
    Exchanges code for token, gets user info, and creates/logs in the user.
    """
    from database import get_db
    from utils.id_utils import generate_user_id
    from utils.username_generator import generate_unique_username
    from models import User

    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    # Exchange code for token
    try:
        access_token = await exchange_github_code_for_token(code)
    except Exception as e:
        logger.error(f"GitHub code exchange failed: {str(e)}")
        raise HTTPException(status_code=400, detail="GitHub authentication failed")

    # Get user info (including primary email)
    github_user = await get_github_user_info(access_token)
    email = github_user.get("email")
    
    if not email:
        raise HTTPException(
            status_code=400, 
            detail="GitHub account must have a verified email address. Please check your GitHub settings."
        )

    # Check if user already exists
    user_doc = await db.users.find_one({"email": email})
    collection_name = "users"
    
    if not user_doc:
        user_doc = await db.admin_users.find_one({"email": email})
        collection_name = "admin_users"
    
    user_id = None
    username = None
    role = "user"
    
    if user_doc:
        user_id = user_doc['id']
        username = user_doc['username']
        role = user_doc.get('role', 'user' if collection_name == "users" else "admin")
        
        # Check if account is deleted
        if user_doc.get("account_status") == "deleted":
            raise HTTPException(
                status_code=403, 
                detail="This account has been permanently deleted and cannot be accessed."
            )

        # Update user with github info
        update_fields = {
            "last_login_at": datetime.now(timezone.utc).isoformat(),
            "github_id": github_user.get("github_id"),
            "github_username": github_user.get("username"),
            "github_access_token": access_token
        }
        
        await db[collection_name].update_one(
            {"id": user_id},
            {"$set": update_fields}
        )

        # Check if account is pending deletion
        if user_doc.get("account_status") == "pending_deletion":
            deletion_scheduled_at = user_doc.get("deletion_scheduled_at")
            permanent_deletion_at = user_doc.get("permanent_deletion_at")
            
            # Days remaining
            days_remaining = 0
            if permanent_deletion_at:
                permanent_deletion_at = parse_datetime_safe(permanent_deletion_at)
                days_remaining = max(0, (permanent_deletion_at - datetime.now(timezone.utc)).days)
            
            session_service = SessionService(db.sessions)
            jti = await session_service.create_session(
                user_id=user_id,
                user_agent_str=request.headers.get("user-agent", ""),
                ip_address=request.client.host if request.client else "127.0.0.1"
            )
            token = create_access_token({"sub": user_id, "username": username, "role": role, "jti": jti})
            frontend_url = os.environ.get("FRONTEND_URL", "https://app.scrapi.com")
            
            # Construct redirect URL with deletion info
            redirect_url = f"{frontend_url}/auth/callback?token={token}&account_status=pending_deletion"
            if deletion_scheduled_at:
                redirect_url += f"&deletion_scheduled_at={deletion_scheduled_at}"
            if permanent_deletion_at:
                redirect_url += f"&permanent_deletion_at={permanent_deletion_at.isoformat()}"
            redirect_url += f"&days_remaining={days_remaining}&username={username}&user_id={user_id}"
            
            return RedirectResponse(url=redirect_url)

        # New user - register
        # Check if email is associated with a deleted account
        deleted_account = await db.deleted_accounts_legal_retention.find_one({"email": email})
        if deleted_account:
             raise HTTPException(status_code=400, detail="Email associated with deleted account")

        # Auto-generate a unique username
        existing_usernames = set()
        async for user in db.users.find({}, {"username": 1}):
            existing_usernames.add(user.get("username"))
        
        username = generate_unique_username(existing_usernames)
        user_id = generate_user_id(username)
        
        new_user = User(
            id=user_id,
            username=username,
            email=email,
            first_name=github_user.get("first_name"),
            last_name=github_user.get("last_name"),
            auth_provider="github",
            github_id=github_user.get("github_id"),
            github_username=github_user.get("username"),
            github_access_token=access_token,
            role="user",
            profile_color=generate_random_profile_color()
        )
        
        doc = new_user.model_dump()
        doc['created_at'] = doc['created_at']
        await db.users.insert_one(doc)

        # Create user settings for profile picture
        if github_user.get("picture"):
            await db.user_settings.insert_one({
                "user_id": user_id,
                "profile_picture": github_user["picture"],
                "created_at": datetime.now(timezone.utc)
            })
        
        # Create welcome notification
        welcome_notification = Notification(
            user_id=user_id,
            title="Welcome to Scrapi! 👋",
            message="You've successfully signed up with GitHub.",
            type="welcome",
            icon="👋",
            link="/actors"
        )
        await db.notifications.insert_one(welcome_notification.model_dump())
    
    # Create session
    session_service = SessionService(db.sessions)
    jti = await session_service.create_session(
        user_id=user_id,
        user_agent_str=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    
    # Create token
    token = create_access_token({"sub": user_id, "username": username, "role": role, "jti": jti})
    
    # Redirect back to frontend
    frontend_url = os.environ.get("FRONTEND_URL", "https://app.scrapi.com")
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={token}")

@router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin, request: Request):
    """Login user with username or email."""
    db = get_db()
    client_ip = request.client.host
    access_control_service = request.app.state.access_control_service
    
    # 🛡️ Rate Limiting Check
    is_blocked, remaining = await access_control_service.is_blocked(client_ip, credentials.username)
    if is_blocked:
        time_str = access_control_service.format_time_remaining(remaining)
        raise HTTPException(
            status_code=429, 
            detail=f"Too many failed login attempts. Please try again in {time_str}."
        )
    
    # 🛡️ Enterprise Shield Check
    if credentials.shield_nonce and credentials.shield_solution and credentials.fingerprint:
        security_service = request.app.state.security_service
        success, msg = await security_service.verify_shield(
            credentials.shield_nonce,
            credentials.shield_solution,
            credentials.fingerprint,
            request.client.host
        )
        if not success:
            await access_control_service.record_failure(client_ip, credentials.username)
            raise HTTPException(status_code=400, detail=msg)
    # Fallback to honeypot/captcha if Shield is missing
    elif credentials.website_check:
        await access_control_service.record_failure(client_ip, credentials.username)
        raise HTTPException(status_code=400, detail="Bot detection triggered")
    elif credentials.captcha_id and credentials.captcha_answer:
        captcha_service = request.app.state.captcha_service
        if not await captcha_service.verify_captcha(credentials.captcha_id, credentials.captcha_answer):
            await access_control_service.record_failure(client_ip, credentials.username)
            raise HTTPException(status_code=400, detail="Invalid CAPTCHA answer")
    else:
        # Require at least one form of security for login
        raise HTTPException(status_code=400, detail="Security verification required")

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
        await access_control_service.record_failure(client_ip, credentials.username)
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    # 🛡️ Block explicitly deleted accounts
    if user_doc.get("account_status") == "deleted":
        raise HTTPException(
            status_code=403, 
            detail="This account has been permanently deleted and cannot be accessed."
        )
        
    # Successful login, reset attempts
    await access_control_service.reset_attempts(client_ip, credentials.username)
    
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
        {"$set": {"last_login_at": datetime.now(timezone.utc)}}
    )
    
    # Create session
    session_service = SessionService(db.sessions)
    jti = await session_service.create_session(
        user_id=user_doc['id'],
        user_agent_str=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    
    # Create access token
    token = create_access_token({
        "sub": user_doc['id'], 
        "username": user_doc['username'],
        "role": user_doc.get('role', 'user'),
        "jti": jti
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
            created_at=user_doc.get('created_at') or datetime.now(timezone.utc),
            last_login_at=user_doc.get('last_login_at'),
            profile_color=profile_color,
            profile_picture=profile_picture,
            theme_preference=user_doc.get('theme_preference', 'light'),
            auth_provider=user_doc.get('auth_provider', 'email')
        )
    }

@router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logs out the user and revokes their current session."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
        
    jti = current_user.get("jti")
    if jti:
        session_service = SessionService(db.sessions)
        await session_service.collection.delete_one({"jti": jti, "user_id": current_user["id"]})
        
    return {"message": "Successfully logged out"}

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    """Initiates the password reset flow."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
        
    # Check both collections
    user_doc = await db.users.find_one({"email": req.email})
    collection_name = "users"
    
    if not user_doc:
        user_doc = await db.admin_users.find_one({"email": req.email})
        collection_name = "admin_users"
        
    if user_doc:
        from datetime import timedelta
        # Create a short-lived reset token (1 hour)
        reset_token = create_access_token(
            data={
                "sub": user_doc["id"], 
                "email": user_doc["email"], 
                "type": "password_reset",
                "collection": collection_name
            },
            expires_delta=timedelta(hours=1)
        )
        
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/auth/reset-password?token={reset_token}"
        
        # Send email
        email_service = get_email_service()
        username = user_doc.get("username", user_doc.get("email"))
        await email_service.send_password_reset_email(user_doc["email"], username, reset_link)
        
    # Always return success for security (don't reveal if email exists)
    return {"message": "If the email exists, a password reset link has been sent."}

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Resets the user's password using a token."""
    from auth import decode_token
    
    try:
        payload = decode_token(req.token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid token type")
        
    user_id = payload.get("sub")
    collection = payload.get("collection", "users")
    
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
        
    # Update password
    hashed_password = hash_password(req.new_password)
    result = await db[collection].update_one(
        {"id": user_id},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Revoke all sessions for this user for security
    session_service = SessionService(db.sessions)
    from bson import ObjectId
    uid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    await session_service.collection.delete_many({"user_id": uid})
    
    return {"message": "Password has been reset successfully. You can now log in with your new password."}

# ============= Admin Console Authentication Routes =============
@router.post("/auth/admin/register", response_model=dict)
async def admin_register(user_data: AdminUserCreate):
    """Register a new admin user for admin console."""
    db = get_db()

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
    
    # Default permissions: owner gets terminal_access by default
    initial_permissions = []
    if role == "owner":
        initial_permissions = ["terminal_access"]
        
    admin_user = AdminUser(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        organization_name=user_data.organization_name,
        role=role if role else "admin",  # Temp role until selection
        permissions=initial_permissions
    )
    
    doc = admin_user.model_dump()
    # doc['created_at'] = doc['created_at'].isoformat()  # Removed
    # if doc.get('last_login_at'):
    #     doc['last_login_at'] = doc['last_login_at'].isoformat()  # Removed
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
            permissions=admin_user.permissions,
            is_active=admin_user.is_active,
            created_at=admin_user.created_at,
            last_login_at=admin_user.last_login_at
        )
    }

@router.post("/auth/admin/login", response_model=dict)
async def admin_login(credentials: AdminUserLogin):
    """Login admin user with username or email."""
    db = get_db()

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
        {"$set": {"last_login_at": datetime.now(timezone.utc)}}
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
            permissions=user_doc.get('permissions', []),
            is_active=user_doc.get('is_active', True),
            created_at=user_doc.get('created_at') or datetime.now(timezone.utc),
            last_login_at=user_doc.get('last_login_at')
        )
    }

@router.post("/auth/admin/select-role", response_model=dict)
async def admin_select_role(role_data: dict, current_user: dict = Depends(get_current_user)):
    """Select role for admin user (owner or admin) - only for first-time setup."""
    role = role_data.get('role')
    
    db = get_db()

    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    if role not in ['owner', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'owner' or 'admin'")
    
    # Check if owner already exists (only if trying to select owner)
    if role == 'owner':
        existing_owner = await db.admin_users.find_one({"role": "owner"})
        if existing_owner and existing_owner['id'] != current_user['id']:
            raise HTTPException(status_code=400, detail="Owner already exists")
    
    # Grant terminal access to owner by default if selected
    update_data = {"role": role}
    if role == 'owner':
         update_data["permissions"] = ["terminal_access"]
         
    # Update admin user role
    await db.admin_users.update_one(
        {"id": current_user['id']},
        {"$set": update_data}
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
            permissions=user_doc.get('permissions', []),
            is_active=user_doc.get('is_active', True),
            created_at=user_doc.get('created_at') or datetime.now(timezone.utc),
            last_login_at=user_doc.get('last_login_at')
        )
    }

@router.get("/auth/admin/me", response_model=AdminUserResponse)
async def get_admin_me(current_user: dict = Depends(get_current_user)):
    """Get current admin user info."""
    db = get_db()

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
        permissions=user_doc.get('permissions', []),
        is_active=user_doc.get('is_active', True),
        created_at=user_doc.get('created_at', datetime.now(timezone.utc).isoformat()),
        last_login_at=user_doc.get('last_login_at')
    )
