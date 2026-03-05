import os
import requests
from fastapi import HTTPException, status
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI")

def get_github_auth_url() -> str:
    """
    Generate the GitHub OAuth authorization URL with repo and user:email scopes.
    """
    if not GITHUB_CLIENT_ID or not GITHUB_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    url = "https://github.com/login/oauth/authorize"
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "repo user:email",
        "state": os.urandom(16).hex()  # Recommended for security
    }
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{url}?{query_string}"

async def exchange_github_code_for_token(code: str) -> str:
    """
    Exchange authorization code for a GitHub access token.
    """
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI
    }
    
    response = requests.post(token_url, headers=headers, data=data)
    if response.status_code != 200:
        logger.error(f"Failed to exchange GitHub code for token: {response.text}")
        raise HTTPException(status_code=400, detail="Failed to exchange GitHub authorization code")
    
    res_data = response.json()
    access_token = res_data.get("access_token")
    
    if not access_token:
        logger.error(f"GitHub response missing access_token: {res_data}")
        raise HTTPException(status_code=400, detail="GitHub authorization failed")
        
    return access_token

async def get_github_user_info(access_token: str) -> Dict[str, Any]:
    """
    Fetch user information and repositories from GitHub API.
    """
    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # 1. Get basic profile
    user_response = requests.get("https://api.github.com/user", headers=headers)
    if user_response.status_code != 200:
        logger.error(f"Failed to fetch GitHub user info: {user_response.text}")
        raise HTTPException(status_code=400, detail="Failed to fetch GitHub user data")
    
    user_data = user_response.json()
    
    # 2. Get email (GitHub might return null for email in basic profile)
    email = user_data.get("email")
    if not email:
        email_response = requests.get("https://api.github.com/user/emails", headers=headers)
        if email_response.status_code == 200:
            emails: List[Dict[str, Any]] = email_response.json()
            # Try to find primary verified email
            primary_email = next((e["email"] for e in emails if e.get("primary") and e.get("verified")), None)
            # Fallback to any verified email
            if not primary_email:
                primary_email = next((e["email"] for e in emails if e.get("verified")), None)
            # Fallback to first email
            if not primary_email and emails:
                primary_email = emails[0]["email"]
            
            email = primary_email

    # Split name if available
    name = user_data.get("name") or ""
    name_parts = name.split(" ", 1)
    first_name = name_parts[0] if name_parts else user_data.get("login")
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    return {
        "github_id": str(user_data.get("id")),
        "username": user_data.get("login"),
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "picture": user_data.get("avatar_url"),
        "access_token": access_token  # We store this to access repos later
    }
