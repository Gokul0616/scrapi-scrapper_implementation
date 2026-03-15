
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone
import io
import json
import csv
import logging

from database import get_db, get_proxy_manager, get_task_manager
from routes.utils import get_workspace_query, parse_datetime_safe
from routes.dependencies import get_api_user
from auth import get_current_user
from models import (
    Run, RunCreate, Dataset, DatasetItem
)
from scrapers import ScraperEngine, get_scraper_registry

logger = logging.getLogger(__name__)

router = APIRouter()

async def execute_scraping_job(run_id: str, actor_id: str, user_id: str, input_data: dict, organization_id: Optional[str] = None):
    """Background task to execute scraping."""
    db = get_db()
    proxy_manager = get_proxy_manager()
    
    try:
        logger.info(f"🔧 Executing scraping job for run {run_id}")
        logger.info(f"   Input data type: {type(input_data)}")
        logger.info(f"   Input data: {input_data}")
        
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
            
            # Built-in scraper - use registry
            scraper_registry = get_scraper_registry()
            actor_name = actor.get('name') if actor else None
            
            if not actor_name:
                raise ValueError("Actor not found or has no name")
            
            logger.info(f"   Looking for built-in scraper: {actor_name}")
            scraper = scraper_registry.get_scraper(actor_name, engine)
            
            if not scraper:
                logger.error(f"❌ No scraper found for: {actor_name}")
                raise ValueError(f"No scraper registered for actor: {actor_name}")
            
            logger.info(f"✅ Found scraper: {type(scraper).__name__}")
            logger.info(f"   Calling scraper.scrape() with input_data: {input_data}")
            
            # Progress callback for logging
            async def progress_callback(message: str):
                await db.runs.update_one(
                    {"id": run_id},
                    {"$push": {"logs": f"{datetime.now(timezone.utc).isoformat()}: {message}"}}
                )
                logger.info(f"Run {run_id}: {message}")
            
            # Execute built-in scraper
            results = await scraper.scrape(input_data, progress_callback)
            
            # Create dataset and store results
            dataset = Dataset(
                run_id=run_id,
                user_id=user_id,
                organization_id=organization_id,
                item_count=len(results)
            )
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
            started_at = parse_datetime_safe(run_doc['started_at'])
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
            
            # Record billing usage for this run
            from services.billing_service import billing_service
            await billing_service.record_run_usage(run_id)
            
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

# ============= Run Routes =============
@router.post("/runs", response_model=Run)
async def create_run(
    run_data: RunCreate,
    request: Request,
    current_user: dict = Depends(get_api_user)
):
    """Create and start a new scraping run with parallel execution."""
    db = get_db()
    task_manager = get_task_manager()
    
    # Log incoming request for debugging
    logger.info(f"🚀 Creating run for user {current_user['id']}")
    logger.info(f"   Actor ID: {run_data.actor_id}")
    logger.info(f"   Input data: {run_data.input_data}")
    
    # Get actor (check by ID or API ID)
    query = {"id": run_data.actor_id}
    if run_data.actor_id.startswith("actor_"):
        query = {"api_id": run_data.actor_id}
        
    actor = await db.actors.find_one(query)
    
    # If not found by API ID, could check by regular ID if it wasn't already checked
    if not actor and run_data.actor_id.startswith("actor_"):
         actor = await db.actors.find_one({"id": run_data.actor_id})

    if not actor:
        logger.error(f"❌ Actor not found: {run_data.actor_id}")
        raise HTTPException(status_code=404, detail="Actor not found") 
    
    # Use the real ID for internal storage
    real_actor_id = actor['id']
    
    logger.info(f"   Actor name: {actor['name']}")
    
    # Get workspace context
    workspace_type = getattr(request.state, 'workspace_type', 'personal')
    workspace_id = getattr(request.state, 'workspace_id', '')
    
    organization_id = None
    if workspace_type == 'organization' and workspace_id:
        organization_id = workspace_id
        
    # === Billing Limits Check ===
    from services.billing_service import billing_service
    try:
        target_ws_id = workspace_id if workspace_id else current_user['id']
        
        # Fetch workspace document to avoid NameError
        if workspace_type == 'organization':
            workspace = await db.organizations.find_one({"id": target_ws_id})
        else:
            workspace = await db.users.find_one({"id": target_ws_id})
            
        if not workspace:
            workspace = {} # Fallback

        billing_info = await billing_service.get_billing_summary(target_ws_id, workspace_type)
        plan_consumption = billing_info.get("planConsumption", {})
        free_remaining = plan_consumption.get("freeRemaining", 0)
        
        # === Check Plan Expiration ===
        expires_at_str = billing_info.get("expires_at")
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                
                if datetime.now(timezone.utc) > expires_at:
                    # Plan expired! Force Free limits
                    logger.warning(f"⚠️ Plan for {target_ws_id} has expired on {expires_at_str}. Fallback to Free limits.")
                    # Temporarily override billing_info for this check
                    free_remaining = min(free_remaining, workspace.get("platform_credits", 5.0))
            except Exception as e:
                logger.error(f"Error parsing expiry date: {e}")

        # 1. Platform Credit Check
        if free_remaining <= 0:
            raise HTTPException(
                status_code=403, 
                detail="Platform compute credits exhausted or plan expired. Please upgrade or renew your plan."
            )
            
        limits = billing_info.get("limits", {})
        max_concurrent_runs = limits.get("max_concurrent_runs", 1)
        max_ram_gb = limits.get("max_ram_gb", 2)
        
        # 2. Concurrency Check
        active_query = {"status": {"$in": ["queued", "running"]}}
        if organization_id:
            active_query["organization_id"] = organization_id
        else:
            active_query["user_id"] = current_user['id']
            
        active_runs_count = await db.runs.count_documents(active_query)
        if active_runs_count >= max_concurrent_runs:
            raise HTTPException(
                status_code=403,
                detail=f"Concurrent runs limit reached ({max_concurrent_runs}). Upgrade your plan to run more actors simultaneously."
            )
            
        # 3. RAM Check
        if max_ram_gb < 1:
            raise HTTPException(
                status_code=403,
                detail="Insufficient RAM limits on your plan."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking billing limits: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify plan limits.")
    # ==========================
        
    # Create run
    run = Run(
        user_id=current_user['id'],
        organization_id=organization_id,
        actor_id=real_actor_id,
        actor_name=actor['name'],
        actor_icon=actor.get('icon'),
        input_data=run_data.input_data,
        status="queued"
    )
    
    doc = run.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.runs.insert_one(doc)
    
    logger.info(f"✅ Run created: {run.id}")
    
    # Start scraping in parallel using task manager
    if task_manager:
        await task_manager.start_task(
            run.id,
            execute_scraping_job(
                run.id,
                real_actor_id,
                current_user['id'],
                run_data.input_data,
                organization_id  # Pass organization_id
            )
        )
        logger.info(f"Run {run.id} queued. Currently running: {task_manager.get_running_count()} tasks")
    else:
        logger.warning(f"Task manager not initialized, run {run.id} created but not started")
    
    return run

@router.get("/runs")
async def get_runs(
    request: Request,
    current_user: dict = Depends(get_current_user), 
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
):
    """Get all runs for current user in current workspace."""
    db = get_db()
    # Build query
    query = get_workspace_query(current_user['id'], request)
    
    # Add search filter (search by run ID or actor name)
    if search:
        query["$or"] = [
            {"id": {"$regex": search, "$options": "i"}},
            {"actor_name": {"$regex": search, "$options": "i"}}
        ]
    
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
async def get_run(
    run_id: str, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get specific run."""
    db = get_db()
    query = get_workspace_query(current_user['id'], request)
    query['id'] = run_id
    
    run = await db.runs.find_one(query, {"_id": 0})
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
async def abort_run(
    run_id: str, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Abort a running or queued scraping job."""
    db = get_db()
    task_manager = get_task_manager()
    try:
        # Verify run belongs to user and is in abortable state
        query = get_workspace_query(current_user['id'], request)
        query.update({
            "id": run_id, 
            "status": {"$in": ["running", "queued"]}
        })
        
        run = await db.runs.find_one(query)
        
        if not run:
            raise HTTPException(
                status_code=404, 
                detail="Run not found or not in running/queued state"
            )
        
        # Try to cancel the task in task_manager
        task_cancelled = False
        if task_manager:
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
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Abort multiple running or queued scraping jobs."""
    db = get_db()
    task_manager = get_task_manager()
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    try:
        results = {
            "success": [],
            "failed": [],
            "not_found": []
        }
        
        workspace_query = get_workspace_query(current_user['id'], request)
        
        for run_id in run_ids:
            try:
                # Verify run belongs to user and is in abortable state
                query = workspace_query.copy()
                query.update({
                    "id": run_id,
                    "status": {"$in": ["running", "queued"]}
                })
                
                run = await db.runs.find_one(query)
                
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
    request: Request,
    status_filter: Optional[str] = "running",
    current_user: dict = Depends(get_current_user)
):
    """Abort all running or queued runs for the current user in current workspace."""
    db = get_db()
    task_manager = get_task_manager()
    if not task_manager:
        raise HTTPException(status_code=500, detail="Task manager not initialized")

    try:
        # Validate status filter
        valid_statuses = ["running", "queued", "all"]
        if status_filter not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter. Must be one of: {valid_statuses}"
            )
        
        # Build query based on status filter
        query = get_workspace_query(current_user['id'], request)
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
    request: Request,
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None
):
    """Get dataset items for a run with pagination."""
    db = get_db()
    # Verify run belongs to user
    query = get_workspace_query(current_user['id'], request)
    query['id'] = run_id
    
    run = await db.runs.find_one(query)
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
async def export_dataset(
    run_id: str, 
    request: Request,
    format: str = "json", 
    current_user: dict = Depends(get_current_user)
):
    """Export dataset in various formats."""
    db = get_db()
    
    # Verify run belongs to user
    query = get_workspace_query(current_user['id'], request)
    query['id'] = run_id
    
    run = await db.runs.find_one(query)
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
