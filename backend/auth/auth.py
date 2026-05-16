from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import bcrypt
if getattr(bcrypt, "__about__", None) is None:
    class About:
        pass
    About.__version__ = getattr(bcrypt, "__version__", getattr(bcrypt, "__version", ""))
    bcrypt.__about__ = About

from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# Security configurations
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a stored password against one provided by user."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user."""
    token = credentials.credentials
    payload = decode_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Verify session is not revoked
    jti = payload.get("jti")
    if jti:
        from database import get_db
        from bson import ObjectId
        db = get_db()
        if db is not None:
            # Check both string and ObjectId user_id formats
            uid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
            session_exists = await db.sessions.find_one({"jti": jti, "user_id": uid})
            if not session_exists:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Session has been revoked or expired"
                )
    
    return {
        "id": user_id, 
        "username": payload.get("username"),
        "role": payload.get("role", "admin"),
        "jti": jti
    }

security_optional = HTTPBearer(auto_error=False)

async def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)) -> Optional[dict]:
    """Dependency to get current user if authenticated, otherwise None."""
    if not credentials:
        return None
        
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        user_id = payload.get("sub")
        if user_id is None:
            return None
            
        jti = payload.get("jti")
        if jti:
            from database import get_db
            from bson import ObjectId
            db = get_db()
            if db is not None:
                uid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
                session_exists = await db.sessions.find_one({"jti": jti, "user_id": uid})
                if not session_exists:
                    return None
        
        return {
            "id": user_id, 
            "username": payload.get("username"),
            "role": payload.get("role", "admin"),
            "jti": jti
        }
    except HTTPException:
        return None
    except Exception:
        return None
