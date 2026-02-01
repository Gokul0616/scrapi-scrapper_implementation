
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
import hashlib

from database import get_db
from auth import get_current_user

api_key_security = HTTPBearer()

async def get_api_user(credentials: HTTPAuthorizationCredentials = Depends(api_key_security)):
    """Authenticate user via API Key or JWT."""
    db = get_db()
    token = credentials.credentials
    
    if token.startswith("scrapi_api_"):
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
