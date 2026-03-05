import os
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import HTTPException, status
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI")

def get_google_auth_url() -> str:
    """
    Generate the Google OAuth 2.0 authorization URL.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account"
    }
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{url}?{query_string}"

async def exchange_code_for_token(code: str) -> Dict[str, Any]:
    """
    Exchange authorization code for access and ID tokens.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    response = requests.post(token_url, data=data)
    if response.status_code != 200:
        logger.error(f"Failed to exchange code for token: {response.text}")
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
    
    return response.json()

def verify_google_id_token(token: str) -> Dict[str, Any]:
    """
    Verify a Google ID token and return user information.
    """
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        return {
            "email": idinfo.get("email"),
            "first_name": idinfo.get("given_name"),
            "last_name": idinfo.get("family_name"),
            "picture": idinfo.get("picture"),
            "email_verified": idinfo.get("email_verified")
        }
    except ValueError as e:
        logger.warning(f"Invalid Google ID token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid Google ID token")
    except Exception as e:
        logger.error(f"Error during Google token verification: {str(e)}")
        raise HTTPException(status_code=500, detail="Error verifying Google token")
