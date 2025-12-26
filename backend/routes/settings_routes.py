from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
import os
import base64
import asyncio
import json

router = APIRouter(prefix="/settings", tags=["settings"])

# Database reference - will be set by main app
db = None

def set_settings_db(database):
    global db
    db = database

# Pydantic models
class UsernameUpdate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=200)
    readme: Optional[str] = Field(None, max_length=2000)
    homepage_url: Optional[str] = None
    github: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    discord: Optional[str] = None
    is_public: Optional[bool] = False
    show_email: Optional[bool] = False
    theme_preference: Optional[str] = "system"

class ProfileResponse(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    readme: Optional[str] = None
    homepage_url: Optional[str] = None
    github: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    discord: Optional[str] = None
    is_public: bool = False
    show_email: bool = False
    profile_picture: Optional[str] = None
    theme_preference: str = "system"

class UserPreferencesUpdate(BaseModel):
    theme_preference: Optional[str] = None
    sidebar_collapsed: Optional[bool] = None

class UserPreferencesResponse(BaseModel):
    theme_preference: str = "light"
    sidebar_collapsed: bool = False

# Auth dependency
from auth import get_current_user

@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile settings"""
    user_id = current_user.get("id")
    
    # Get user from users collection
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "hashed_password": 0})
    if not user:
        # Fallback to _id for ObjectId-based users
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)}, {"_id": 0, "password": 0, "hashed_password": 0})
        except:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Try to get settings from user_settings collection
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    
    # Merge user data with settings, settings override user data
    profile_data = {
        "username": user.get("username"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "theme_preference": user.get("theme_preference", "light"),
    }
    
    if settings:
        # Settings override user data
        profile_data.update({k: v for k, v in settings.items() if v is not None})
    
    return ProfileResponse(**profile_data)

@router.put("/username")
async def update_username(data: UsernameUpdate, current_user: dict = Depends(get_current_user)):
    """Update username"""
    user_id = current_user.get("id")
    new_username = data.username.strip().lower()
    
    # Check if username is already taken (handle both UUID and ObjectId)
    existing = await db.users.find_one({
        "username": new_username,
        "id": {"$ne": user_id}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Update in users collection (handle both UUID and ObjectId)
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"username": new_username, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Fallback to _id for ObjectId-based users
    if result.modified_count == 0:
        try:
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"username": new_username, "updated_at": datetime.now(timezone.utc)}}
            )
        except:
            pass
    
    # Also update in settings if exists
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {"username": new_username, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    return {"message": "Username updated successfully", "username": new_username}

@router.put("/profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile settings"""
    user_id = current_user.get("id")
    
    update_data = data.model_dump(exclude_none=True)
    update_data["user_id"] = user_id
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Upsert settings
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Also update fields in users collection for consistency
    user_update = {}
    if data.first_name is not None:
        user_update["first_name"] = data.first_name
    if data.last_name is not None:
        user_update["last_name"] = data.last_name
    if data.theme_preference is not None:
        user_update["theme_preference"] = data.theme_preference
    
    if user_update:
        user_update["updated_at"] = datetime.now(timezone.utc)
        # Handle both UUID and ObjectId
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": user_update}
        )
        # Fallback to _id for ObjectId-based users
        if result.modified_count == 0:
            try:
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": user_update}
                )
            except:
                pass
    
    return {"message": "Profile updated successfully"}

@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload profile picture"""
    user_id = current_user.get("id")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and encode file as base64 for simplicity
    # In production, you'd want to use cloud storage
    contents = await file.read()
    
    # Check file size (max 2MB)
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 2MB")
    
    # Store as base64 data URL
    base64_image = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Update in settings
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "profile_picture": data_url,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {"message": "Profile picture uploaded", "url": data_url}

@router.delete("/profile-picture")
async def delete_profile_picture(current_user: dict = Depends(get_current_user)):
    """Delete profile picture"""
    user_id = current_user.get("id")
    
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "profile_picture": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Profile picture deleted"}

class AccountDeletionRequest(BaseModel):
    confirmation_text: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)  # Re-authentication
    feedback_reason: Optional[str] = None  # 'too_expensive', 'lack_features', 'found_alternative', 'privacy_concerns', 'other'
    feedback_text: Optional[str] = None

@router.delete("/account")
async def delete_account(
    data: AccountDeletionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Schedule account deletion with 7-day grace period"""
    user_id = current_user.get("id")
    username = current_user.get("username")
    
    # Get user from database
    user = await db.users.find_one({"id": user_id})
    if not user:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except:
            raise HTTPException(status_code=404, detail="User not found")
            
    # Validate confirmation text matches email
    user_email = user.get("email")
    if data.confirmation_text.strip() != user_email:
        raise HTTPException(
            status_code=400, 
            detail="Confirmation text does not match your email address"
        )
    
    # Verify password (re-authentication)
    from auth import verify_password
    if not verify_password(data.password, user.get("hashed_password")):
        raise HTTPException(
            status_code=401,
            detail="Invalid password. Please enter your correct password to confirm deletion."
        )
    
    user_email = user.get("email")
    
    # Schedule account deletion (7-day grace period)
    from services.account_deletion_service import get_deletion_service
    deletion_service = get_deletion_service(db)
    
    result = await deletion_service.schedule_account_deletion(
        user_id=user_id,
        username=username,
        password_hash=user.get("hashed_password"),
        feedback_reason=data.feedback_reason,
        feedback_text=data.feedback_text
    )
    
    # Send deletion scheduled email
    if user_email and result.get("success"):
        try:
            from services.email_service import get_email_service
            email_service = get_email_service()
            from datetime import datetime
            deletion_date = datetime.fromisoformat(result['permanent_deletion_at']).strftime("%B %d, %Y at %I:%M %p UTC")
            await email_service.send_deletion_scheduled_email(
                user_email, 
                username, 
                deletion_date,
                result['grace_period_days']
            )
        except Exception as e:
            print(f"Failed to send deletion scheduled email: {str(e)}")
    
    return {
        "message": "Account deletion scheduled successfully",
        "deletion_scheduled_at": result['deletion_scheduled_at'],
        "permanent_deletion_at": result['permanent_deletion_at'],
        "grace_period_days": result['grace_period_days']
    }

@router.post("/account/reactivate")
async def reactivate_account(current_user: dict = Depends(get_current_user)):
    """Reactivate a pending deletion account"""
    user_id = current_user.get("id")
    username = current_user.get("username")
    
    from services.account_deletion_service import get_deletion_service
    deletion_service = get_deletion_service(db)
    
    result = await deletion_service.reactivate_account(user_id, username)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to reactivate account"))
    
    # Get user email
    user = await db.users.find_one({"id": user_id}, {"email": 1})
    user_email = user.get("email") if user else None
    
    # Send reactivation confirmation email
    if user_email:
        try:
            from services.email_service import get_email_service
            email_service = get_email_service()
            await email_service.send_account_reactivated_email(user_email, username)
        except Exception as e:
            print(f"Failed to send reactivation email: {str(e)}")
    
    return {"message": "Account reactivated successfully"}

@router.get("/account/export")
async def export_account_data(current_user: dict = Depends(get_current_user)):
    """Export all user data before deletion"""
    user_id = current_user.get("id")
    
    from services.account_deletion_service import get_deletion_service
    deletion_service = get_deletion_service(db)
    
    try:
        export_data = await deletion_service.export_user_data(user_id)
        return export_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_preferences(current_user: dict = Depends(get_current_user)):
    """Get user preferences (theme, sidebar state, etc.)"""
    user_id = current_user.get("id")
    
    # Get user from users collection for default values
    user = await db.users.find_one({"id": user_id}, {"theme_preference": 1, "_id": 0})
    if not user:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)}, {"theme_preference": 1, "_id": 0})
        except:
            user = {}
    
    # Get settings from user_settings collection
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    
    # Build response with defaults
    preferences = {
        "theme_preference": user.get("theme_preference", "light"),
        "sidebar_collapsed": False
    }
    
    # Override with settings if available
    if settings:
        if "theme_preference" in settings:
            preferences["theme_preference"] = settings["theme_preference"]
        if "sidebar_collapsed" in settings:
            preferences["sidebar_collapsed"] = settings["sidebar_collapsed"]
    
    return UserPreferencesResponse(**preferences)

@router.put("/preferences")
async def update_preferences(data: UserPreferencesUpdate, current_user: dict = Depends(get_current_user)):
    """Update user preferences (theme, sidebar state, etc.)"""
    user_id = current_user.get("id")
    
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        return {"message": "No preferences to update"}
    
    update_data["user_id"] = user_id
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Update in user_settings collection
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Also update theme_preference in users collection for consistency
    if "theme_preference" in update_data:
        user_update = {
            "theme_preference": update_data["theme_preference"],
            "updated_at": datetime.now(timezone.utc)
        }
        # Handle both UUID and ObjectId
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": user_update}
        )
        # Fallback to _id for ObjectId-based users
        if result.modified_count == 0:
            try:
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": user_update}
                )
            except:
                pass
    
    return {"message": "Preferences updated successfully"}


@router.websocket("/ws/check-username")
async def check_username_ws(websocket: WebSocket):
    """WebSocket endpoint for real-time username validation"""
    await websocket.accept()
    
    try:
        while True:
            # Receive username from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            username = message.get("username", "").strip().lower()
            user_id = message.get("user_id")
            
            # Validation response
            response = {
                "username": username,
                "valid": False,
                "available": False,
                "message": ""
            }
            
            # Basic validation
            if not username:
                response["message"] = ""
                await websocket.send_json(response)
                continue
            
            if len(username) < 3:
                response["message"] = "Username must be at least 3 characters"
                await websocket.send_json(response)
                continue
            
            if len(username) > 50:
                response["message"] = "Username must be at most 50 characters"
                await websocket.send_json(response)
                continue
            
            # Check special characters
            import re
            if not re.match("^[a-z0-9_]+$", username):
                response["message"] = "Username can only contain lowercase letters, numbers, and underscores"
                await websocket.send_json(response)
                continue
            
            # Check if username is taken by someone else
            existing = await db.users.find_one({
                "username": username,
                "id": {"$ne": user_id}
            })
            
            if existing:
                response["message"] = "Username already taken"
                response["valid"] = True
                response["available"] = False
            else:
                response["message"] = "Username is available"
                response["valid"] = True
                response["available"] = True
            
            await websocket.send_json(response)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "error": str(e),
                "message": "An error occurred while checking username"
            })
        except:
            pass
        finally:
            try:
                await websocket.close()
            except:
                pass
