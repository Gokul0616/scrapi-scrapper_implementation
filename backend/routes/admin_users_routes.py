from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from database import get_db
from models import AdminUserResponse
from auth import get_current_user

router = APIRouter()

@router.get("/admin/team", response_model=List[AdminUserResponse])
async def get_team_members(current_user: dict = Depends(get_current_user)):
    """
    Get all admin users.
    Only accessible by 'owner'.
    """
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Access denied. Owner privileges required.")
        
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
        
    cursor = db.admin_users.find({})
    users = []
    async for user_doc in cursor:
        users.append(AdminUserResponse(
            id=user_doc['id'],
            username=user_doc['username'],
            email=user_doc['email'],
            organization_name=user_doc.get('organization_name'),
            plan=user_doc.get('plan', 'Free'),
            role=user_doc.get('role', 'admin'),
            permissions=user_doc.get('permissions', []),
            is_active=user_doc.get('is_active', True),
            created_at=user_doc.get('created_at').strftime("%Y-%m-%dT%H:%M:%S.%f") if isinstance(user_doc.get('created_at'), str) == False else user_doc.get('created_at'),
            last_login_at=user_doc.get('last_login_at').strftime("%Y-%m-%dT%H:%M:%S.%f") if user_doc.get('last_login_at') and isinstance(user_doc.get('last_login_at'), str) == False else user_doc.get('last_login_at')
        ))
        
    return users

@router.put("/admin/team/{user_id}/permissions")
async def update_user_permissions(
    user_id: str, 
    permissions: List[str] = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Update permissions for an admin user.
    Only accessible by 'owner'.
    """
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Access denied. Owner privileges required.")
        
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
        
    # Prevent modifying own permissions randomly (though owner always has full access conceptually)
    if user_id == current_user['id']:
        # Optional: decide if owner can modify their own permissions in this list. 
        # Usually owner implicitly has all permissions or doesn't use this list.
        pass

    result = await db.admin_users.update_one(
        {"id": user_id},
        {"$set": {"permissions": permissions}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success", "message": "Permissions updated"}
