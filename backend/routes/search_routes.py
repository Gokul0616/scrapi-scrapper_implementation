"""
Search Routes - Global search endpoint
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from auth.dependencies import get_current_user
from services.search_service import global_search, save_recent_search

router = APIRouter()

# This will be set by the main routes file
_db = None

def set_search_db(database):
    global _db
    _db = database


@router.get("/scrapi-global-search")
async def scrapi_global_search(
    q: str = Query("", description="Search query"),
    scope: Optional[str] = Query(None, description="Search scope: actors, runs, datasets, docs, policies"),
    current_user: dict = Depends(get_current_user)
):
    """
    Global search endpoint for Scrapi.
    
    Features:
    - Multi-collection search (actors, runs, datasets, docs, policies)
    - Fuzzy matching
    - Result ranking by relevance
    - Recent searches
    - Quick actions with > prefix
    - Search scopes with @ # / prefixes
    
    Examples:
    - Regular search: ?q=google maps
    - Actor search: ?q=@google or ?scope=actors&q=google
    - Run search: ?q=#run or ?scope=runs&q=run
    - Docs search: ?q=/api or ?scope=docs&q=api
    - Quick actions: ?q=>create
    """
    user_id = current_user.get("id")
    
    result = await global_search(
        db=_db,
        query=q,
        user_id=user_id,
        search_scope=scope
    )
    
    return result


@router.post("/scrapi-global-search/recent")
async def save_search_to_recent(
    query: str,
    result_type: str,
    result_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Save a search result to recent searches."""
    user_id = current_user.get("id")
    
    await save_recent_search(
        db=_db,
        user_id=user_id,
        query=query,
        result_type=result_type,
        result_id=result_id
    )
    
    return {"message": "Search saved to recent"}
