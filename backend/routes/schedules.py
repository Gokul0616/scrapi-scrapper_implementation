
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from datetime import datetime, timezone
import logging

from database import get_db, get_proxy_manager, get_task_manager
from routes.utils import get_workspace_query, parse_datetime_safe
from routes.runs import execute_scraping_job
from auth import get_current_user
from models import (
    Schedule, ScheduleCreate, ScheduleUpdate, Run
)
from services.scheduler_service import get_scheduler

logger = logging.getLogger(__name__)

router = APIRouter()

# ============= Schedule Routes =============
@router.post("/schedules", status_code=201)
async def create_schedule(
    schedule_data: ScheduleCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new schedule for automatic actor runs."""
    db = get_db()
    scheduler = get_scheduler()
    
    # Validate actor exists
    actor = await db.actors.find_one({"id": schedule_data.actor_id})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # Check if user has access to the actor
    if actor['user_id'] != "system" and actor['user_id'] != current_user['id']:
        if not actor.get('is_public', False):
            raise HTTPException(status_code=403, detail="Access denied to this actor")
    
    # Get workspace context
    workspace_type = getattr(request.state, 'workspace_type', 'personal')
    workspace_id = getattr(request.state, 'workspace_id', '')
    
    organization_id = None
    if workspace_type == 'organization' and workspace_id:
        organization_id = workspace_id
        
    # Check max_schedules limit
    from services.billing_service import billing_service
    try:
        target_ws_id = workspace_id if workspace_id else current_user['id']
        billing_info = await billing_service.get_billing_summary(target_ws_id, workspace_type)
        
        limits = billing_info.get("limits", {})
        max_schedules = limits.get("max_schedules", 0)
        
        if max_schedules == 0:
            raise HTTPException(
                status_code=403,
                detail="Your current plan does not support Scheduled Runs. Please upgrade to create schedules."
            )
            
        # Count existing schedules
        query = {"user_id": current_user['id']}
        if organization_id:
            query = {"organization_id": organization_id}
            
        current_schedules_count = await db.schedules.count_documents(query)
        
        if current_schedules_count >= max_schedules:
            raise HTTPException(
                status_code=403,
                detail=f"Scheduled runs limit reached ({max_schedules}). Upgrade your plan to create more schedules."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking schedule limits: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify plan limits for scheduling.")
    
    # Create schedule
    schedule = Schedule(
        user_id=current_user['id'],
        organization_id=organization_id,  # Add workspace context
        actor_id=schedule_data.actor_id,
        actor_name=actor['name'],
        name=schedule_data.name,
        description=schedule_data.description,
        cron_expression=schedule_data.cron_expression,
        timezone=schedule_data.timezone,
        input_data=schedule_data.input_data,
        is_enabled=schedule_data.is_enabled
    )
    
    # Calculate next run
    if scheduler:
        next_run = scheduler._get_next_run(schedule.cron_expression, schedule.timezone)
        schedule.next_run = next_run
    
    # Save to database
    doc = schedule.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['next_run']:
        doc['next_run'] = doc['next_run'].isoformat()
    if doc['last_run']:
        doc['last_run'] = doc['last_run'].isoformat()
    
    await db.schedules.insert_one(doc)
    
    # Add to scheduler if enabled
    if schedule.is_enabled and scheduler:
        try:
            await scheduler.add_schedule(
                schedule_id=schedule.id,
                cron_expression=schedule.cron_expression,
                timezone_str=schedule.timezone,
                user_id=current_user['id'],
                actor_id=schedule_data.actor_id,
                input_data=schedule_data.input_data
            )
        except Exception as e:
            logger.error(f"Failed to add schedule to scheduler: {str(e)}")
            # Still return the created schedule
    
    logger.info(f"✅ Schedule created: {schedule.id}")
    return schedule


@router.get("/schedules")
async def get_schedules(
    request: Request,
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    actor_id: Optional[str] = None,
    is_enabled: Optional[bool] = None
):
    """Get all schedules for the current user in current workspace with pagination."""
    db = get_db()
    scheduler = get_scheduler()
    
    # Build query
    query = get_workspace_query(current_user['id'], request)
    
    if actor_id:
        query["actor_id"] = actor_id
    
    if is_enabled is not None:
        query["is_enabled"] = is_enabled
    
    # Get total count
    total = await db.schedules.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * limit
    schedules = await db.schedules.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    for schedule in schedules:
        # Convert ISO strings to datetime if needed
        if isinstance(schedule.get('created_at'), str):
            schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
        if isinstance(schedule.get('updated_at'), str):
            schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])
        if isinstance(schedule.get('next_run'), str):
            schedule['next_run'] = datetime.fromisoformat(schedule['next_run'])
        if isinstance(schedule.get('last_run'), str):
            schedule['last_run'] = datetime.fromisoformat(schedule['last_run'])
        
        # Add human-readable cron description
        if scheduler:
            schedule['human_readable'] = scheduler.get_human_readable_cron(schedule['cron_expression'])
    
    return {
        "schedules": schedules,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 0
    }


@router.get("/schedules/{schedule_id}")
async def get_schedule(
    schedule_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific schedule by ID."""
    db = get_db()
    scheduler = get_scheduler()
    
    query = get_workspace_query(current_user['id'], request)
    query['id'] = schedule_id
    
    schedule = await db.schedules.find_one(query, {"_id": 0})
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Convert ISO strings to datetime if needed
    if isinstance(schedule.get('created_at'), str):
        schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
    if isinstance(schedule.get('updated_at'), str):
        schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])
    if isinstance(schedule.get('next_run'), str):
        schedule['next_run'] = datetime.fromisoformat(schedule['next_run'])
    if isinstance(schedule.get('last_run'), str):
        schedule['last_run'] = datetime.fromisoformat(schedule['last_run'])
    
    # Add human-readable cron description
    if scheduler:
        schedule['human_readable'] = scheduler.get_human_readable_cron(schedule['cron_expression'])
    
    return schedule


@router.patch("/schedules/{schedule_id}")
async def update_schedule(
    schedule_id: str,
    schedule_update: ScheduleUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a schedule."""
    db = get_db()
    scheduler = get_scheduler()
    
    # Check if schedule exists and belongs to user
    query = get_workspace_query(current_user['id'], request)
    query['id'] = schedule_id
    
    schedule = await db.schedules.find_one(query)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Build update data
    update_data = schedule_update.model_dump(exclude_unset=True)
    
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc)
        
        # If cron expression or timezone changed, recalculate next run
        if 'cron_expression' in update_data or 'timezone' in update_data:
            if scheduler:
                cron_expr = update_data.get('cron_expression', schedule['cron_expression'])
                tz = update_data.get('timezone', schedule['timezone'])
                next_run = scheduler._get_next_run(cron_expr, tz)
                update_data['next_run'] = next_run
        
        # Update database
        await db.schedules.update_one(
            {"id": schedule_id},
            {"$set": update_data}
        )
        
        # Get updated schedule
        updated_schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
        
        # Update scheduler if enabled status changed or cron/timezone changed
        if scheduler:
            if 'is_enabled' in update_data or 'cron_expression' in update_data or 'timezone' in update_data:
                if updated_schedule['is_enabled']:
                    # Remove old job and add new one
                    await scheduler.remove_schedule(schedule_id)
                    await scheduler.add_schedule(
                        schedule_id=schedule_id,
                        cron_expression=updated_schedule['cron_expression'],
                        timezone_str=updated_schedule['timezone'],
                        user_id=current_user['id'],
                        actor_id=updated_schedule['actor_id'],
                        input_data=updated_schedule['input_data']
                    )
                else:
                    # Remove from scheduler if disabled
                    await scheduler.remove_schedule(schedule_id)
        
        logger.info(f"✅ Schedule updated: {schedule_id}")
        
        # Convert datetime objects for response
        if isinstance(updated_schedule.get('created_at'), str):
            updated_schedule['created_at'] = datetime.fromisoformat(updated_schedule['created_at'])
        if isinstance(updated_schedule.get('updated_at'), str):
            updated_schedule['updated_at'] = datetime.fromisoformat(updated_schedule['updated_at'])
        if isinstance(updated_schedule.get('next_run'), str):
            updated_schedule['next_run'] = datetime.fromisoformat(updated_schedule['next_run'])
        if isinstance(updated_schedule.get('last_run'), str):
            updated_schedule['last_run'] = datetime.fromisoformat(updated_schedule['last_run'])
        
        return updated_schedule
    
    return schedule


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a schedule."""
    db = get_db()
    scheduler = get_scheduler()
    
    # Check if schedule exists and belongs to user
    query = get_workspace_query(current_user['id'], request)
    query['id'] = schedule_id
    
    schedule = await db.schedules.find_one(query)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Remove from scheduler
    if scheduler:
        await scheduler.remove_schedule(schedule_id)
    
    # Delete from database
    await db.schedules.delete_one({"id": schedule_id})
    
    logger.info(f"✅ Schedule deleted: {schedule_id}")
    
    return {"message": "Schedule deleted successfully"}


@router.post("/schedules/{schedule_id}/enable")
async def enable_schedule(
    schedule_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Enable a schedule."""
    db = get_db()
    scheduler = get_scheduler()
    
    query = get_workspace_query(current_user['id'], request)
    query['id'] = schedule_id
    
    schedule = await db.schedules.find_one(query)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule['is_enabled']:
        return {"message": "Schedule already enabled"}
    
    # Update database
    await db.schedules.update_one(
        {"id": schedule_id},
        {"$set": {"is_enabled": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Add to scheduler
    updated_schedule = await db.schedules.find_one({"id": schedule_id})
    if scheduler:
        await scheduler.add_schedule(
            schedule_id=schedule_id,
            cron_expression=updated_schedule['cron_expression'],
            timezone_str=updated_schedule['timezone'],
            user_id=current_user['id'],
            actor_id=updated_schedule['actor_id'],
            input_data=updated_schedule['input_data']
        )
    
    logger.info(f"✅ Schedule enabled: {schedule_id}")
    
    return {"message": "Schedule enabled successfully"}


@router.post("/schedules/{schedule_id}/disable")
async def disable_schedule(
    schedule_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Disable a schedule."""
    db = get_db()
    scheduler = get_scheduler()
    
    query = get_workspace_query(current_user['id'], request)
    query['id'] = schedule_id
    
    schedule = await db.schedules.find_one(query)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if not schedule['is_enabled']:
        return {"message": "Schedule already disabled"}
    
    # Update database
    await db.schedules.update_one(
        {"id": schedule_id},
        {"$set": {"is_enabled": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Remove from scheduler
    if scheduler:
        await scheduler.remove_schedule(schedule_id)
    
    logger.info(f"✅ Schedule disabled: {schedule_id}")
    
    return {"message": "Schedule disabled successfully"}


@router.post("/schedules/{schedule_id}/run-now")
async def run_schedule_now(
    schedule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger a scheduled run immediately."""
    db = get_db()
    task_manager = get_task_manager()
    scheduler = get_scheduler()
    
    schedule = await db.schedules.find_one({"id": schedule_id, "user_id": current_user['id']})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Get actor
    actor = await db.actors.find_one({"id": schedule['actor_id']})
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # Create run
    run = Run(
        user_id=current_user['id'],
        actor_id=schedule['actor_id'],
        actor_name=actor['name'],
        actor_icon=actor.get('icon'),
        input_data=schedule['input_data'],
        status="queued",
        origin="Manual (Schedule)"
    )
    
    doc = run.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.runs.insert_one(doc)
    
    # Start scraping
    if task_manager:
        await task_manager.start_task(
            run.id,
            execute_scraping_job(
                run.id,
                schedule['actor_id'],
                current_user['id'],
                schedule['input_data'],
                schedule.get('organization_id') # Pass organization_id from schedule
            )
        )
    
    # Update schedule statistics for manual runs
    if scheduler:
        await scheduler._update_schedule_status(schedule_id, "success", run.id)
    
    logger.info(f"✅ Manual run triggered for schedule {schedule_id}: {run.id}")
    
    return {"message": "Run triggered successfully", "run_id": run.id, "run": run}
