from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone
from models import (
    UserCreate, UserLogin, UserResponse, Actor, ActorCreate, ActorUpdate, ActorPublish,
    Run, RunCreate, Dataset, DatasetItem, Proxy, ProxyCreate,
    LeadChatMessage, LeadChatRequest
)
from auth import create_access_token, get_current_user, hash_password, verify_password
from proxy_manager import get_proxy_manager
from scraper_engine import ScraperEngine
from scraper_registry import get_scraper_registry  # New: Dynamic scraper management
from chat_service import LeadChatService
from global_chat_service import GlobalChatService
from global_chat_service_v2 import EnhancedGlobalChatService
from task_manager import get_task_manager
import logging
import asyncio

logger = logging.getLogger(__name__)

# This will be set by server.py
db = None
proxy_manager = None
task_manager = None

def set_db(database):
    global db, proxy_manager, task_manager
    db = database
    proxy_manager = get_proxy_manager(db)
    task_manager = get_task_manager()

router = APIRouter()

# ============= Authentication Routes =============
@router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Check if user already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    from models import User
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        organization_name=user_data.organization_name
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create token
    token = create_access_token({"sub": user.id, "username": user.username})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            organization_name=user.organization_name,
            plan=user.plan
        )
    }

@router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login user with username or email."""
    # Search by username or email
    user_doc = await db.users.find_one({
        "$or": [
            {"username": credentials.username},
            {"email": credentials.username}
        ]
    }, {"_id": 0})
    
    if not user_doc or not verify_password(credentials.password, user_doc['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token({"sub": user_doc['id'], "username": user_doc['username']})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user_doc['id'],
            username=user_doc['username'],
            email=user_doc['email'],
            organization_name=user_doc.get('organization_name'),
            plan=user_doc.get('plan', 'Free')
        )
    }

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    user_doc = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user_doc['id'],
        username=user_doc['username'],
        email=user_doc['email'],
        organization_name=user_doc.get('organization_name'),
        plan=user_doc.get('plan', 'Free')
    )

@router.patch("/auth/last-path")
async def update_last_path(
    path_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's last visited path."""
    last_path = path_data.get('last_path')
    if not last_path:
        raise HTTPException(status_code=400, detail="last_path is required")
    
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"last_path": last_path}}
    )
    
    return {"message": "Last path updated successfully", "last_path": last_path}

@router.get("/auth/last-path")
async def get_last_path(current_user: dict = Depends(get_current_user)):
    """Get user's last visited path."""
    user_doc = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "last_path": 1})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"last_path": user_doc.get('last_path', '/home')}

# ============= Actor Routes =============
# NOTE: Specific routes MUST come before parametrized routes to avoid conflicts

@router.get("/actors", response_model=List[Actor])
async def get_actors(current_user: dict = Depends(get_current_user)):
    """Get all actors for current user."""
    actors = await db.actors.find(
        {"$or": [{"user_id": current_user['id']}, {"is_public": True}]},
        {"_id": 0}
    ).to_list(1000)
    
    # Convert datetime strings
    for actor in actors:
        if isinstance(actor.get('created_at'), str):
            actor['created_at'] = datetime.fromisoformat(actor['created_at'])
        if isinstance(actor.get('updated_at'), str):
            actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
    
    return actors

@router.post("/actors", response_model=Actor)
async def create_actor(actor_data: ActorCreate, current_user: dict = Depends(get_current_user)):
    """Create a new actor."""
    actor = Actor(
        user_id=current_user['id'],
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

@router.get("/actors/{actor_id}", response_model=Actor)
async def get_actor(actor_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific actor."""
    actor = await db.actors.find_one({"id": actor_id}, {"_id": 0})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # Convert datetime strings
    if isinstance(actor.get('created_at'), str):
        actor['created_at'] = datetime.fromisoformat(actor['created_at'])
    if isinstance(actor.get('updated_at'), str):
        actor['updated_at'] = datetime.fromisoformat(actor['updated_at'])
    
    return actor

@router.patch("/actors/{actor_id}", response_model=Actor)
async def update_actor(actor_id: str, updates: ActorUpdate, current_user: dict = Depends(get_current_user)):
    """Update an actor."""
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
    result = await db.actors.delete_one({"id": actor_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Actor not found")
    return {"message": "Actor deleted successfully"}

@router.get("/actors-used")
async def get_actors_used(current_user: dict = Depends(get_current_user)):
    """Get actors used by the current user with run statistics."""
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

# ============= Run Routes =============
async def execute_scraping_job(run_id: str, actor_id: str, user_id: str, input_data: dict):
    """Background task to execute scraping."""
    try:
        # Update run status to running
        await db.runs.update_one(
            {"id": run_id},
            {
                "$set": {
                    "status": "running",
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Initialize scraper engine
        engine = ScraperEngine(proxy_manager)
        await engine.initialize()
        
        try:
            # Get actor details
            actor = await db.actors.find_one({"id": actor_id})
            
            results = []
            
            # Get scraper dynamically from registry based on actor name
            scraper_registry = get_scraper_registry()
            actor_name = actor.get('name') if actor else None
            
            if not actor_name:
                raise ValueError("Actor not found or has no name")
            
            scraper = scraper_registry.get_scraper(actor_name, engine)
            
            if not scraper:
                raise ValueError(f"No scraper registered for actor: {actor_name}")
            
            # Progress callback for logging
            async def progress_callback(message: str):
                await db.runs.update_one(
                    {"id": run_id},
                    {"$push": {"logs": f"{datetime.now(timezone.utc).isoformat()}: {message}"}}
                )
                logger.info(f"Run {run_id}: {message}")
            
            # Execute scraper
            results = await scraper.scrape(input_data, progress_callback)
            
            # Create dataset and store results
            from models import Dataset
            dataset = Dataset(run_id=run_id, user_id=user_id, item_count=len(results))
            dataset_doc = dataset.model_dump()
            dataset_doc['created_at'] = dataset_doc['created_at'].isoformat()
            await db.datasets.insert_one(dataset_doc)
            
            # Store dataset items
            for result in results:
                item = DatasetItem(run_id=run_id, data=result)
                item_doc = item.model_dump()
                item_doc['created_at'] = item_doc['created_at'].isoformat()
                await db.dataset_items.insert_one(item_doc)
            
            # Calculate duration
            run_doc = await db.runs.find_one({"id": run_id})
            started_at = datetime.fromisoformat(run_doc['started_at'])
            finished_at = datetime.now(timezone.utc)
            duration = int((finished_at - started_at).total_seconds())
            
            # Update run as succeeded
            await db.runs.update_one(
                {"id": run_id},
                {
                    "$set": {
                        "status": "succeeded",
                        "finished_at": finished_at.isoformat(),
                        "duration_seconds": duration,
                        "results_count": len(results),
                        "dataset_id": dataset.id
                    }
                }
            )
            
            # Update actor runs count
            await db.actors.update_one({"id": actor_id}, {"$inc": {"runs_count": 1}})
            
            logger.info(f"Run {run_id} completed successfully with {len(results)} results")
        
        finally:
            await engine.cleanup()
    
    except Exception as e:
        logger.error(f"Run {run_id} failed: {str(e)}")
        await db.runs.update_one(
            {"id": run_id},
            {
                "$set": {
                    "status": "failed",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": str(e)
                }
            }
        )

@router.post("/runs", response_model=Run)
async def create_run(
    run_data: RunCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create and start a new scraping run with parallel execution."""
    # Log incoming request for debugging
    logger.info(f"🚀 Creating run for user {current_user['id']}")
    logger.info(f"   Actor ID: {run_data.actor_id}")
    logger.info(f"   Input data: {run_data.input_data}")
    
    # Get actor
    actor = await db.actors.find_one({"id": run_data.actor_id})
    if not actor:
        logger.error(f"❌ Actor not found: {run_data.actor_id}")
        raise HTTPException(status_code=404, detail="Actor not found")
    
    logger.info(f"   Actor name: {actor['name']}")
    
    # Create run
    run = Run(
        user_id=current_user['id'],
        actor_id=run_data.actor_id,
        actor_name=actor['name'],
        input_data=run_data.input_data,
        status="queued"
    )
    
    doc = run.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.runs.insert_one(doc)
    
    logger.info(f"✅ Run created: {run.id}")
    
    # Start scraping in parallel using task manager
    await task_manager.start_task(
        run.id,
        execute_scraping_job(
            run.id,
            run_data.actor_id,
            current_user['id'],
            run_data.input_data
        )
    )
    
    logger.info(f"Run {run.id} queued. Currently running: {task_manager.get_running_count()} tasks")
    
    return run

@router.get("/runs")
async def get_runs(
    current_user: dict = Depends(get_current_user), 
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
):
    """Get all runs for current user with pagination."""
    # Build query
    query = {"user_id": current_user['id']}
    
    # Add search filter (search by run ID)
    if search:
        query["id"] = {"$regex": search, "$options": "i"}
    
    # Add status filter
    if status and status != "all":
        query["status"] = status
    
    # Get total count
    total_count = await db.runs.count_documents(query)
    
    # Calculate skip
    skip = (page - 1) * limit
    
    # Set sort direction
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Get runs with pagination
    runs = await db.runs.find(
        query,
        {"_id": 0}
    ).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for run in runs:
        if isinstance(run.get('created_at'), str):
            run['created_at'] = datetime.fromisoformat(run['created_at'])
        if isinstance(run.get('started_at'), str):
            run['started_at'] = datetime.fromisoformat(run['started_at'])
        if isinstance(run.get('finished_at'), str):
            run['finished_at'] = datetime.fromisoformat(run['finished_at'])
    
    return {
        "runs": runs,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/runs/{run_id}", response_model=Run)
async def get_run(run_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific run."""
    run = await db.runs.find_one({"id": run_id, "user_id": current_user['id']}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Convert datetime strings
    if isinstance(run.get('created_at'), str):
        run['created_at'] = datetime.fromisoformat(run['created_at'])
    if isinstance(run.get('started_at'), str):
        run['started_at'] = datetime.fromisoformat(run['started_at'])
    if isinstance(run.get('finished_at'), str):
        run['finished_at'] = datetime.fromisoformat(run['finished_at'])
    
    return run

@router.delete("/runs/{run_id}/abort")
async def abort_run(run_id: str, current_user: dict = Depends(get_current_user)):
    """Abort a running or queued scraping job."""
    try:
        # Verify run belongs to user and is in abortable state
        run = await db.runs.find_one({
            "id": run_id, 
            "user_id": current_user['id'], 
            "status": {"$in": ["running", "queued"]}
        })
        
        if not run:
            raise HTTPException(
                status_code=404, 
                detail="Run not found or not in running/queued state"
            )
        
        # Try to cancel the task in task_manager
        task_cancelled = await task_manager.cancel_task(run_id)
        
        # Update database status to aborted
        result = await db.runs.update_one(
            {"id": run_id, "user_id": current_user['id']},
            {
                "$set": {
                    "status": "aborted",
                    "finished_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count > 0:
            status_msg = "Run aborted and task cancelled" if task_cancelled else "Run status updated to aborted"
            logger.info(f"{status_msg}: {run_id}")
            return {
                "success": True,
                "message": status_msg,
                "run_id": run_id,
                "task_cancelled": task_cancelled
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to abort run")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error aborting run {run_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error aborting run: {str(e)}")

@router.post("/runs/abort-multiple")
async def abort_multiple_runs(
    run_ids: List[str], 
    current_user: dict = Depends(get_current_user)
):
    """Abort multiple running or queued scraping jobs."""
    try:
        results = {
            "success": [],
            "failed": [],
            "not_found": []
        }
        
        for run_id in run_ids:
            try:
                # Verify run belongs to user and is in abortable state
                run = await db.runs.find_one({
                    "id": run_id,
                    "user_id": current_user['id'],
                    "status": {"$in": ["running", "queued"]}
                })
                
                if not run:
                    results["not_found"].append(run_id)
                    continue
                
                # Try to cancel the task
                task_cancelled = await task_manager.cancel_task(run_id)
                
                # Update database status
                update_result = await db.runs.update_one(
                    {"id": run_id, "user_id": current_user['id']},
                    {
                        "$set": {
                            "status": "aborted",
                            "finished_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    results["success"].append({
                        "run_id": run_id,
                        "task_cancelled": task_cancelled
                    })
                    logger.info(f"Aborted run: {run_id}, task_cancelled: {task_cancelled}")
                else:
                    results["failed"].append(run_id)
                    
            except Exception as e:
                logger.error(f"Error aborting run {run_id}: {str(e)}")
                results["failed"].append(run_id)
        
        return {
            "success": True,
            "results": results,
            "total_requested": len(run_ids),
            "total_aborted": len(results["success"]),
            "total_failed": len(results["failed"]),
            "total_not_found": len(results["not_found"])
        }
        
    except Exception as e:
        logger.error(f"Error in abort_multiple_runs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error aborting runs: {str(e)}")

@router.post("/runs/abort-all")
async def abort_all_runs(
    status_filter: Optional[str] = "running",
    current_user: dict = Depends(get_current_user)
):
    """Abort all running or queued runs for the current user."""
    try:
        # Validate status filter
        valid_statuses = ["running", "queued", "all"]
        if status_filter not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter. Must be one of: {valid_statuses}"
            )
        
        # Build query based on status filter
        query = {"user_id": current_user['id']}
        if status_filter == "all":
            query["status"] = {"$in": ["running", "queued"]}
        else:
            query["status"] = status_filter
        
        # Find all matching runs
        runs = await db.runs.find(query, {"_id": 0, "id": 1}).to_list(length=None)
        run_ids = [run["id"] for run in runs]
        
        if not run_ids:
            return {
                "success": True,
                "message": f"No {status_filter} runs found to abort",
                "total_aborted": 0
            }
        
        # Use the abort_multiple_runs logic
        results = {
            "success": [],
            "failed": []
        }
        
        for run_id in run_ids:
            try:
                # Try to cancel the task
                task_cancelled = await task_manager.cancel_task(run_id)
                
                # Update database status
                update_result = await db.runs.update_one(
                    {"id": run_id, "user_id": current_user['id']},
                    {
                        "$set": {
                            "status": "aborted",
                            "finished_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    results["success"].append({
                        "run_id": run_id,
                        "task_cancelled": task_cancelled
                    })
                else:
                    results["failed"].append(run_id)
                    
            except Exception as e:
                logger.error(f"Error aborting run {run_id}: {str(e)}")
                results["failed"].append(run_id)
        
        return {
            "success": True,
            "message": f"Aborted {len(results['success'])} {status_filter} runs",
            "results": results,
            "total_aborted": len(results["success"]),
            "total_failed": len(results["failed"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in abort_all_runs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error aborting runs: {str(e)}")

# ============= Dataset Routes =============
@router.get("/datasets/{run_id}/items")
async def get_dataset_items(
    run_id: str, 
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None
):
    """Get dataset items for a run with pagination."""
    # Verify run belongs to user
    run = await db.runs.find_one({"id": run_id, "user_id": current_user['id']})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Build query
    query = {"run_id": run_id}
    
    # Add search filter (search across all data fields)
    if search:
        # Search in nested data field
        query["$or"] = [
            {"data.title": {"$regex": search, "$options": "i"}},
            {"data.address": {"$regex": search, "$options": "i"}},
            {"data.city": {"$regex": search, "$options": "i"}},
            {"data.category": {"$regex": search, "$options": "i"}},
            {"data.phone": {"$regex": search, "$options": "i"}},
            {"data.email": {"$regex": search, "$options": "i"}}
        ]
    
    # Get total count
    total_count = await db.dataset_items.count_documents(query)
    
    # Calculate skip
    skip = (page - 1) * limit
    
    # Get items with pagination
    items = await db.dataset_items.find(
        query,
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/datasets/{run_id}/export")
async def export_dataset(run_id: str, format: str = "json", current_user: dict = Depends(get_current_user)):
    """Export dataset in various formats."""
    from fastapi.responses import StreamingResponse
    import io
    import json
    import csv
    
    # Verify run belongs to user
    run = await db.runs.find_one({"id": run_id, "user_id": current_user['id']})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    items = await db.dataset_items.find({"run_id": run_id}, {"_id": 0}).to_list(10000)
    
    if format == "json":
        content = json.dumps([item['data'] for item in items], indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=dataset_{run_id}.json"}
        )
    
    elif format == "csv":
        if not items:
            raise HTTPException(status_code=404, detail="No data to export")
        
        output = io.StringIO()
        # Get all unique keys from all items
        all_keys = set()
        for item in items:
            all_keys.update(item['data'].keys())
        
        writer = csv.DictWriter(output, fieldnames=sorted(all_keys))
        writer.writeheader()
        for item in items:
            writer.writerow(item['data'])
        
        content = output.getvalue()
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=dataset_{run_id}.csv"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'json' or 'csv'")

# ============= Proxy Routes =============
@router.get("/proxies", response_model=List[Proxy])
async def get_proxies(current_user: dict = Depends(get_current_user)):
    """Get all proxies."""
    proxies = await db.proxies.find({}, {"_id": 0}).to_list(1000)
    
    # Convert datetime strings
    for proxy in proxies:
        if isinstance(proxy.get('created_at'), str):
            proxy['created_at'] = datetime.fromisoformat(proxy['created_at'])
        if isinstance(proxy.get('last_used'), str):
            proxy['last_used'] = datetime.fromisoformat(proxy['last_used'])
        if isinstance(proxy.get('last_check'), str):
            proxy['last_check'] = datetime.fromisoformat(proxy['last_check'])
    
    return proxies

@router.post("/proxies", response_model=Proxy)
async def add_proxy(proxy_data: ProxyCreate, current_user: dict = Depends(get_current_user)):
    """Add a new proxy."""
    proxy = Proxy(
        host=proxy_data.host,
        port=proxy_data.port,
        username=proxy_data.username,
        password=proxy_data.password,
        protocol=proxy_data.protocol
    )
    
    doc = proxy.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.proxies.insert_one(doc)
    
    return proxy

@router.post("/proxies/fetch-free")
async def fetch_free_proxies(current_user: dict = Depends(get_current_user)):
    """Fetch and add free proxies from public sources."""
    count = await proxy_manager.add_free_proxies()
    return {"message": f"Added {count} new proxies"}

@router.post("/proxies/health-check")
async def health_check_proxies(current_user: dict = Depends(get_current_user)):
    """Run health check on all proxies."""
    healthy = await proxy_manager.health_check_all()
    total = await db.proxies.count_documents({})
    return {"healthy": healthy, "total": total}

@router.delete("/proxies/{proxy_id}")
async def delete_proxy(proxy_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a proxy."""
    result = await db.proxies.delete_one({"id": proxy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proxy not found")
    return {"message": "Proxy deleted successfully"}

# ============= Lead Chat Routes (AI Engagement Advice) =============
@router.post("/leads/{lead_id}/chat")
async def chat_with_lead(
    lead_id: str,
    chat_request: LeadChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered engagement advice for a lead."""
    try:
        # Get lead data from dataset_items
        lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Verify user has access to this lead
        run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
        if not run:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize chat service
        chat_service = LeadChatService()
        
        # Get previous chat history
        chat_history = await db.lead_chats.find(
            {"lead_id": lead_id, "user_id": current_user['id']},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        
        # Get AI response
        ai_response = await chat_service.get_engagement_advice(
            lead_data={**chat_request.lead_data, 'id': lead_id},
            user_message=chat_request.message,
            chat_history=chat_history
        )
        
        # Save user message
        user_message = LeadChatMessage(
            lead_id=lead_id,
            user_id=current_user['id'],
            role='user',
            content=chat_request.message
        )
        user_doc = user_message.model_dump()
        user_doc['created_at'] = user_doc['created_at'].isoformat()
        await db.lead_chats.insert_one(user_doc)
        
        # Save AI response
        ai_message = LeadChatMessage(
            lead_id=lead_id,
            user_id=current_user['id'],
            role='assistant',
            content=ai_response
        )
        ai_doc = ai_message.model_dump()
        ai_doc['created_at'] = ai_doc['created_at'].isoformat()
        await db.lead_chats.insert_one(ai_doc)
        
        return {
            "response": ai_response,
            "message_id": ai_message.id
        }
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leads/{lead_id}/chat")
async def get_lead_chat_history(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history for a lead."""
    # Verify access
    lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
    if not run:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get chat history
    messages = await db.lead_chats.find(
        {"lead_id": lead_id, "user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Convert datetime strings
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return messages

@router.post("/leads/{lead_id}/outreach-template")
async def generate_outreach_template(
    lead_id: str,
    channel: str = "email",
    current_user: dict = Depends(get_current_user)
):
    """Generate a personalized outreach template for a lead."""
    try:
        # Get lead data
        lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Verify access
        run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
        if not run:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate template
        chat_service = LeadChatService()
        template = await chat_service.generate_outreach_template(
            lead_data={**lead['data'], 'id': lead_id},
            channel=channel
        )
        
        return {"template": template}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Template generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")

# ============= Global Chat Routes =============
@router.post("/chat/global")
async def global_chat(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced global chat assistant with COMPLETE automation control - full AI agent."""
    try:
        message = request.get('message')
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Use enhanced global chat service with user context
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        result = await chat_service.chat(message)
        
        # Handle MULTIPLE runs if created (supports multiple commands in one request)
        if result.get("run_ids") and len(result["run_ids"]) > 0:
            logger.info(f"🔄 Processing {len(result['run_ids'])} runs from chat command")
            
            # Start ALL runs in parallel
            for idx, run_id in enumerate(result["run_ids"]):
                logger.info(f"📋 Processing run {idx+1}/{len(result['run_ids'])}: {run_id}")
                
                actor_id = result.get("actor_id") if not result.get("run_ids") else (
                    result.get("actor_id") if idx == 0 else None
                )
                input_data = result.get("input_data") if not result.get("run_ids") else (
                    result.get("input_data") if idx == 0 else None
                )
                
                # Fetch run details if not provided
                if not actor_id or not input_data:
                    logger.info(f"🔍 Fetching run details from database for {run_id}")
                    run = await db.runs.find_one({"id": run_id}, {"_id": 0})
                    if run:
                        actor_id = run.get("actor_id")
                        input_data = run.get("input_data")
                        logger.info(f"✓ Found actor: {run.get('actor_name')}, input: {input_data}")
                    else:
                        logger.error(f"❌ Run {run_id} not found in database!")
                        continue
                
                if actor_id and input_data:
                    logger.info(f"🤖 AI Agent starting run {run_id} ({idx+1}/{len(result['run_ids'])}) from chat...")
                    
                    # Use task manager for parallel execution
                    await task_manager.start_task(
                        run_id,
                        execute_scraping_job(
                            run_id,
                            actor_id,
                            current_user['id'],
                            input_data
                        )
                    )
                    logger.info(f"✓ Run {run_id} started by AI Agent. Active tasks: {task_manager.get_running_count()}")
                else:
                    logger.error(f"❌ Missing actor_id or input_data for run {run_id}")
        # Backwards compatibility: handle single run_id
        elif result.get("run_id") and result.get("actor_id"):
            run_id = result["run_id"]
            actor_id = result["actor_id"]
            input_data = result["input_data"]
            
            logger.info(f"🤖 AI Agent starting run {run_id} from chat...")
            
            # Use task manager for parallel execution
            await task_manager.start_task(
                run_id,
                execute_scraping_job(
                    run_id,
                    actor_id,
                    current_user['id'],
                    input_data
                )
            )
            logger.info(f"✓ Run {run_id} started by AI Agent. Active tasks: {task_manager.get_running_count()}")
        
        # Return response with action metadata for UI automation
        response_data = {
            "response": result["response"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Include action metadata if present (navigate, export, fill_and_run, etc.)
        if result.get("action"):
            response_data.update(result["action"])
        
        return response_data
    
    except Exception as e:
        logger.error(f"Global chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/global/history")
async def get_chat_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get user's global chat conversation history."""
    try:
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        history = await chat_service.get_conversation_history(limit=limit)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat/global/history")
async def clear_chat_history(
    current_user: dict = Depends(get_current_user)
):
    """Clear user's global chat conversation history."""
    try:
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        result = await chat_service.clear_history()
        return result
    except Exception as e:
        logger.error(f"Error clearing chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
