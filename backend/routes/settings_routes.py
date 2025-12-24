from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
import os
import base64

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

# Auth dependency
from auth import get_current_user

@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile settings"""
    user_id = current_user.get("id")
    
    # Try to get settings from user_settings collection
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    
    if not settings:
        # Return default settings with user info
        # Use id field instead of _id for UUID-based users
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "hashed_password": 0})
        if not user:
            # Fallback to _id for ObjectId-based users
            try:
                user = await db.users.find_one({"_id": ObjectId(user_id)}, {"_id": 0, "password": 0, "hashed_password": 0})
            except:
                pass
        return ProfileResponse(
            username=user.get("username") if user else None,
            first_name=user.get("first_name") if user else None,
            last_name=user.get("last_name") if user else None,
        )
    
    return ProfileResponse(**settings)

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
    
    # Also update some fields in users collection for consistency
    user_update = {}
    if data.first_name is not None:
        user_update["first_name"] = data.first_name
    if data.last_name is not None:
        user_update["last_name"] = data.last_name
    
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

@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete user account and all associated data"""
    user_id = current_user.get("id")
    
    # Delete user settings
    await db.user_settings.delete_one({"user_id": user_id})
    
    # Delete user's actors
    await db.actors.delete_many({"user_id": user_id})
    
    # Delete user's runs
    await db.runs.delete_many({"user_id": user_id})
    
    # Delete user's schedules
    await db.schedules.delete_many({"user_id": user_id})
    
    # Delete user's tasks
    await db.saved_tasks.delete_many({"user_id": user_id})
    
    # Finally, delete the user
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    return {"message": "Account deleted successfully"}
