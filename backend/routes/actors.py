
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from datetime import datetime, timezone
import logging

from backend.database import get_db
from backend.routes.utils import get_workspace_query, parse_datetime_safe
from auth import get_current_user, get_optional_current_user
from models import (
    Actor, ActorCreate, ActorUpdate, ActorView
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ============= Actor Routes =============
# NOTE: Specific routes MUST come before parametrized routes to avoid conflicts

@router.get("/actors", response_model=List[Actor])
async def get_actors(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all actors for current user in current workspace."""
    db = get_db()
    workspace_query = get_workspace_query(current_user['id'], request)
    
    # Allow public actors OR actors in current workspace
    query = {
        "$or": [
            workspace_query,
            {"is_public": True}
        ]
    }
    
    actors = await db.actors.find(query, {"_id": 0}).to_list(1000)
    
    # Convert datetime strings
    for actor in actors:
        if isinstance(actor.get('created_at'), str):
            actor['created_at'] = datetime.fromisoformat(actor['created_at'])
        if isinstance(actor.get('updated_at'), str):
            actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
    
    return actors

@router.post("/actors", response_model=Actor)
async def create_actor(
    actor_data: ActorCreate, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new actor in the current workspace."""
    db = get_db()
    workspace_type = getattr(request.state, 'workspace_type', 'personal')
    workspace_id = getattr(request.state, 'workspace_id', '')
    
    organization_id = None
    if workspace_type == 'organization' and workspace_id:
        organization_id = workspace_id
    
    actor = Actor(
        user_id=current_user['id'],
        organization_id=organization_id,  # Add workspace context
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

# Specific actor routes MUST come before the dynamic {actor_id} route
@router.get("/actors/recently-viewed")
async def get_recently_viewed_actors(current_user: dict = Depends(get_current_user), limit: int = 10):
    """Get recently viewed actors for the current user."""
    db = get_db()
    try:
        # Get recent views for this user
        cursor = db.actor_views.find(
            {"user_id": current_user['id']}
        ).sort("viewed_at", -1).limit(limit)
        
        views = await cursor.to_list(length=limit)
        
        # Get actor details for each view
        result = []
        for view in views:
            actor = await db.actors.find_one({"id": view["actor_id"]}, {"_id": 0})
            if actor:
                # Convert datetime strings if needed
                if isinstance(actor.get('created_at'), str):
                    actor['created_at'] = datetime.fromisoformat(actor['created_at'])
                if isinstance(actor.get('updated_at'), str):
                    actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
                
                # Add view timestamp
                actor['last_viewed_at'] = view['viewed_at']
                result.append(actor)
        
        return result
    except Exception as e:
        logger.error(f"Error getting recently viewed actors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/actors/suggested")
async def get_suggested_actors(current_user: dict = Depends(get_current_user), limit: int = 6):
    """Get suggested actors based on user's recent views or popular actors for new users."""
    db = get_db()
    try:
        # Get user's recent views
        recent_views = await db.actor_views.find(
            {"user_id": current_user['id']}
        ).sort("viewed_at", -1).limit(10).to_list(length=10)
        
        if recent_views:
            # Get categories from recently viewed actors
            viewed_actor_ids = [view["actor_id"] for view in recent_views]
            viewed_actors = await db.actors.find(
                {"id": {"$in": viewed_actor_ids}},
                {"_id": 0}
            ).to_list(length=10)
            
            # Extract categories
            categories = list(set([actor.get("category") for actor in viewed_actors if actor.get("category")]))
            
            # Suggest actors from same categories, excluding already viewed
            suggested = await db.actors.find(
                {
                    "category": {"$in": categories},
                    "id": {"$nin": viewed_actor_ids},
                    "is_public": True
                },
                {"_id": 0}
            ).limit(limit).to_list(length=limit)
            
            # If we don't have enough suggestions, add popular actors
            if len(suggested) < limit:
                additional = await db.actors.find(
                    {
                        "id": {"$nin": viewed_actor_ids + [a["id"] for a in suggested]},
                        "is_public": True
                    },
                    {"_id": 0}
                ).sort("runs_count", -1).limit(limit - len(suggested)).to_list(length=limit)
                suggested.extend(additional)
        else:
            # New user - show most popular/featured actors
            suggested = await db.actors.find(
                {"is_public": True},
                {"_id": 0}
            ).sort([("is_featured", -1), ("runs_count", -1), ("created_at", -1)]).limit(limit).to_list(length=limit)
        
        # Convert datetime strings
        for actor in suggested:
            if isinstance(actor.get('created_at'), str):
                actor['created_at'] = datetime.fromisoformat(actor['created_at'])
            if isinstance(actor.get('updated_at'), str):
                actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
        
        return suggested
    except Exception as e:
        logger.error(f"Error getting suggested actors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Store endpoints
@router.get("/store/categories")
async def get_store_categories(current_user: Optional[dict] = Depends(get_optional_current_user)):
    """Get all categories with actor counts for store filtering."""
    db = get_db()
    try:
        # Get all public actors
        actors = await db.actors.find({"is_public": True}, {"category": 1}).to_list(10000)
        
        # Define category mappings
        category_map = {
            'all': 'All',
            'social': 'Social media',
            'ai': 'AI',
            'agents': 'Agents',
            'lead': 'Lead generation',
            'ecommerce': 'E-commerce',
            'seo': 'SEO tools',
            'jobs': 'Jobs',
            'mcp': 'MCP servers',
            'news': 'News',
            'realestate': 'Real estate',
            'developer': 'Developer tools',
            'travel': 'Travel',
            'videos': 'Videos',
            'automation': 'Automation',
            'integrations': 'Integrations',
            'opensource': 'Open source',
            'other': 'Other'
        }
        
        # Count actors per category
        category_counts = {}
        total_count = len(actors)
        
        for category_id, category_name in category_map.items():
            if category_id == 'all':
                category_counts[category_id] = {
                    'id': category_id,
                    'name': category_name,
                    'count': total_count
                }
            else:
                count = sum(1 for actor in actors if actor.get('category', '').lower().replace(' ', '').replace('-', '') == category_id.replace(' ', '').replace('-', ''))
                category_counts[category_id] = {
                    'id': category_id,
                    'name': category_name,
                    'count': count
                }
        
        return list(category_counts.values())
    except Exception as e:
        logger.error(f"Error getting store categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/store/featured")
async def get_featured_actors(current_user: Optional[dict] = Depends(get_optional_current_user), limit: int = 6):
    """Get featured actors for store landing page."""
    db = get_db()
    try:
        actors = await db.actors.find(
            {"is_public": True, "is_featured": True},
            {"_id": 0}
        ).sort("runs_count", -1).limit(limit).to_list(limit)
        
        # If not enough featured actors, get popular ones
        if len(actors) < limit:
            additional = await db.actors.find(
                {"is_public": True, "is_featured": {"$ne": True}},
                {"_id": 0}
            ).sort("runs_count", -1).limit(limit - len(actors)).to_list(limit)
            actors.extend(additional)
        
        # Convert datetime strings
        for actor in actors:
            if isinstance(actor.get('created_at'), str):
                actor['created_at'] = datetime.fromisoformat(actor['created_at'])
            if isinstance(actor.get('updated_at'), str):
                actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
        
        return actors
    except Exception as e:
        logger.error(f"Error getting featured actors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/store/actors")
async def get_store_actors(
    current_user: Optional[dict] = Depends(get_optional_current_user),
    search: Optional[str] = None,
    category: Optional[str] = None,
    developer: Optional[str] = None,
    sort_by: str = "relevant",
    skip: int = 0,
    limit: int = 50
):
    """Get all store actors with filtering, search, and pagination."""
    db = get_db()
    try:
        # Build query
        query = {"is_public": True}
        
        # Search filter
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$regex": search, "$options": "i"}}
            ]
        
        # Category filter
        if category and category != 'all':
            query["category"] = {"$regex": category, "$options": "i"}
        
        # Developer filter
        if developer and developer != 'all':
            query["author_name"] = developer
        
        # Get total count
        total = await db.actors.count_documents(query)
        
        # Sort options
        sort_field = "runs_count"
        sort_order = -1
        
        if sort_by == "rating":
            sort_field = "rating"
        elif sort_by == "newest":
            sort_field = "created_at"
        elif sort_by == "name":
            sort_field = "name"
            sort_order = 1
        
        # Get actors
        actors = await db.actors.find(
            query,
            {"_id": 0}
        ).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
        
        # Convert datetime strings
        for actor in actors:
            if isinstance(actor.get('created_at'), str):
                actor['created_at'] = datetime.fromisoformat(actor['created_at'])
            if isinstance(actor.get('updated_at'), str):
                actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
        
        return {
            "actors": actors,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting store actors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/store/developers")
async def get_store_developers(current_user: Optional[dict] = Depends(get_optional_current_user)):
    """Get list of unique developers for filtering."""
    db = get_db()
    try:
        # Get distinct author names
        developers = await db.actors.distinct("author_name", {"is_public": True})
        return [{"id": dev, "name": dev} for dev in developers if dev]
    except Exception as e:
        logger.error(f"Error getting developers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/actors/{actor_id}", response_model=Actor)
async def get_actor(actor_id: str, current_user: Optional[dict] = Depends(get_optional_current_user)):
    """Get specific actor. Public access allowed if actor is public."""
    db = get_db()
    actor = await db.actors.find_one({"id": actor_id}, {"_id": 0})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
        
    # Check access permission
    is_public = actor.get('is_public', False)
    is_owner = current_user and current_user['id'] == actor.get('user_id')
    
    if not is_public and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Convert datetime strings
    if isinstance(actor.get('created_at'), str):
        actor['created_at'] = datetime.fromisoformat(actor['created_at'])
    if isinstance(actor.get('updated_at'), str):
        actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
    
    return actor

@router.patch("/actors/{actor_id}", response_model=Actor)
async def update_actor(actor_id: str, updates: ActorUpdate, current_user: dict = Depends(get_current_user)):
    """Update an actor."""
    db = get_db()
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
    db = get_db()
    result = await db.actors.delete_one({"id": actor_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Actor not found")
    return {"message": "Actor deleted successfully"}

@router.get("/actors-used")
async def get_actors_used(current_user: dict = Depends(get_current_user)):
    """Get actors used by the current user with run statistics."""
    db = get_db()
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

@router.post("/actors/{actor_id}/view")
async def track_actor_view(actor_id: str, current_user: dict = Depends(get_current_user)):
    """Track when a user views an actor."""
    db = get_db()
    try:
        # Check if actor exists
        actor = await db.actors.find_one({"id": actor_id})
        if not actor:
            raise HTTPException(status_code=404, detail="Actor not found")
        
        # Create or update actor view record
        actor_view = ActorView(
            user_id=current_user['id'],
            actor_id=actor_id,
            viewed_at=datetime.now(timezone.utc)
        )
        
        # Remove old view from this user for this actor (to update the timestamp)
        await db.actor_views.delete_many({
            "user_id": current_user['id'],
            "actor_id": actor_id
        })
        
        # Insert new view record
        doc = actor_view.model_dump()
        doc['viewed_at'] = doc['viewed_at'].isoformat()
        await db.actor_views.insert_one(doc)
        
        return {"message": "View tracked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking actor view: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
