"""
Scheduler Service for managing cron-based scheduled runs.
Uses APScheduler for job scheduling and execution.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.jobstores.memory import MemoryJobStore
from croniter import croniter
from datetime import datetime, timezone
import pytz
import logging
import os
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for managing scheduled actor runs."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize the scheduler service."""
        self.db = db
        self.scheduler = None
        self._initialized = False
        
    async def start(self):
        """Start the scheduler and load existing schedules."""
        if self._initialized:
            logger.warning("Scheduler already initialized")
            return
            
        try:
            # Create scheduler with redis job store
            jobstores = {
                'default': RedisJobStore(
                    host=os.environ.get('REDIS_HOST', 'localhost'),
                    port=int(os.environ.get('REDIS_PORT', 6379)),
                    db=2
                ),
                'memory': MemoryJobStore()
            }
            
            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                timezone=pytz.UTC
            )
            
            self.scheduler.start()
            self._initialized = True
            logger.info("✅ Scheduler started successfully")
            
            # Start Data Retention Cron in memory store (to avoid unpicklable DB objects in Redis)
            self.scheduler.add_job(
                func=self._run_data_retention_cleanup,
                trigger=CronTrigger(hour=0, minute=0, timezone=pytz.UTC), # Run daily at midnight
                id="system_data_retention_cleanup",
                jobstore="memory",
                replace_existing=True
            )
            
            # Load and schedule existing enabled schedules
            await self._load_schedules()
            
        except Exception as e:
            logger.error(f"❌ Failed to start scheduler: {str(e)}")
            raise
    
    async def stop(self):
        """Stop the scheduler."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            self._initialized = False
            logger.info("Scheduler stopped")
    
    async def _load_schedules(self):
        """Load all enabled schedules from database and add them to scheduler."""
        try:
            schedules = await self.db.schedules.find({"is_enabled": True}).to_list(length=None)
            
            loaded_count = 0
            for schedule_doc in schedules:
                try:
                    await self.add_schedule(
                        schedule_id=schedule_doc['id'],
                        cron_expression=schedule_doc['cron_expression'],
                        timezone_str=schedule_doc['timezone'],
                        user_id=schedule_doc['user_id'],
                        actor_id=schedule_doc['actor_id'],
                        input_data=schedule_doc['input_data']
                    )
                    loaded_count += 1
                except Exception as e:
                    logger.error(f"Failed to load schedule {schedule_doc['id']}: {str(e)}")
            
            logger.info(f"✅ Loaded {loaded_count} schedules from database")
            
        except Exception as e:
            logger.error(f"❌ Failed to load schedules: {str(e)}")
    
    async def add_schedule(
        self,
        schedule_id: str,
        cron_expression: str,
        timezone_str: str,
        user_id: str,
        actor_id: str,
        input_data: Dict[str, Any]
    ):
        """Add a new schedule to the scheduler."""
        try:
            # Parse timezone
            tz = pytz.timezone(timezone_str)
            
            # Create cron trigger
            trigger = CronTrigger.from_crontab(cron_expression, timezone=tz)
            
            # Add job to scheduler
            self.scheduler.add_job(
                func=execute_scheduled_run,
                trigger=trigger,
                id=schedule_id,
                kwargs={
                    'schedule_id': schedule_id,
                    'user_id': user_id,
                    'actor_id': actor_id,
                    'input_data': input_data
                },
                replace_existing=True,
                misfire_grace_time=3600  # Allow 1 hour grace period for misfires
            )
            
            # Calculate next run time
            next_run = self._get_next_run(cron_expression, timezone_str)
            
            # Update schedule in database with next_run time
            await self.db.schedules.update_one(
                {"id": schedule_id},
                {"$set": {"next_run": next_run}}
            )
            
            logger.info(f"✅ Added schedule {schedule_id} with cron '{cron_expression}'")
            logger.info(f"   Next run: {next_run}")
            
        except Exception as e:
            logger.error(f"❌ Failed to add schedule {schedule_id}: {str(e)}")
            raise
    
    async def remove_schedule(self, schedule_id: str):
        """Remove a schedule from the scheduler."""
        try:
            self.scheduler.remove_job(schedule_id)
            logger.info(f"Removed schedule {schedule_id}")
        except Exception as e:
            logger.warning(f"Failed to remove schedule {schedule_id}: {str(e)}")
    
    async def _update_schedule_status(
        self,
        schedule_id: str,
        status: str,
        run_id: Optional[str]
    ):
        """Update schedule with last run information."""
        try:
            set_data = {
                "last_run": datetime.now(timezone.utc),
                "last_status": status
            }
            
            if run_id:
                set_data["last_run_id"] = run_id
            
            # Calculate next run time
            schedule = await self.db.schedules.find_one({"id": schedule_id})
            if schedule:
                next_run = self._get_next_run(
                    schedule['cron_expression'],
                    schedule['timezone']
                )
                set_data["next_run"] = next_run
            
            await self.db.schedules.update_one(
                {"id": schedule_id},
                {
                    "$set": set_data,
                    "$inc": {"run_count": 1}
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to update schedule status: {str(e)}")
    
    def _get_next_run(self, cron_expression: str, timezone_str: str) -> datetime:
        """Calculate the next run time for a cron expression."""
        try:
            tz = pytz.timezone(timezone_str)
            now = datetime.now(tz)
            cron = croniter(cron_expression, now)
            next_run = cron.get_next(datetime)
            return next_run.astimezone(pytz.UTC)
        except Exception as e:
            logger.error(f"Failed to calculate next run: {str(e)}")
            return datetime.now(timezone.utc)
            
    async def _run_data_retention_cleanup(self):
        """Background job to clean up old datasets and runs based on plan retention limits."""
        try:
            logger.info("🧹 Starting daily data retention cleanup")
            from datetime import timedelta
            
            # 1. Get all workspaces and their retention limits
            workspaces = []
            
            async for user in self.db.users.find({}, {"id": 1, "limits": 1, "plan": 1}):
                retention_days = user.get("limits", {}).get("data_retention_days", 7)
                workspaces.append(("personal", user["id"], retention_days))
                
            async for org in self.db.organizations.find({}, {"id": 1, "limits": 1, "plan": 1}):
                retention_days = org.get("limits", {}).get("data_retention_days", 7)
                workspaces.append(("organization", org["id"], retention_days))
                
            now = datetime.now(timezone.utc)
            total_deleted_runs = 0
            total_deleted_datasets = 0
            
            for ws_type, ws_id, retention_days in workspaces:
                cutoff_date = now - timedelta(days=retention_days)
                cutoff_iso = cutoff_date.isoformat()
                
                query = {
                    "user_id" if ws_type == "personal" else "organization_id": ws_id,
                    "created_at": {"$lt": cutoff_iso}
                }
                
                # Delete old UNNAMED datasets and their associated items
                dataset_query = dict(query)
                dataset_query["name"] = None
                
                datasets_to_delete = await self.db.datasets.find(dataset_query, {"id": 1, "run_id": 1}).to_list(None)
                if datasets_to_delete:
                    dataset_ids = [d["id"] for d in datasets_to_delete]
                    run_ids_for_items = [d["run_id"] for d in datasets_to_delete if "run_id" in d]
                    
                    if run_ids_for_items:
                        await self.db.dataset_items.delete_many({"run_id": {"$in": run_ids_for_items}})
                        
                    del_ds = await self.db.datasets.delete_many({"id": {"$in": dataset_ids}})
                    total_deleted_datasets += del_ds.deleted_count
                
                # We skip deleting runs that are attached to preserved (named) datasets.
                # Find runs we can safely delete
                datasets_preserved = await self.db.datasets.find({"name": {"$ne": None}}).to_list(None)
                preserved_run_ids = [d["run_id"] for d in datasets_preserved if "run_id" in d]
                
                run_query = dict(query)
                if preserved_run_ids:
                    run_query["id"] = {"$nin": preserved_run_ids}
                    
                del_runs = await self.db.runs.delete_many(run_query)
                total_deleted_runs += del_runs.deleted_count
                
            logger.info(f"✅ Data retention cleanup finished. Deleted {total_deleted_runs} runs and {total_deleted_datasets} datasets.")
        except Exception as e:
            logger.error(f"❌ Error during data retention cleanup: {str(e)}")
    
    def get_human_readable_cron(self, cron_expression: str) -> str:
        """Convert cron expression to human-readable format."""
        try:
            parts = cron_expression.split()
            if len(parts) != 5:
                return cron_expression
            
            minute, hour, day, month, weekday = parts
            
            # Common patterns
            if cron_expression == "* * * * *":
                return "Every minute"
            elif cron_expression == "0 * * * *":
                return "Every hour"
            elif cron_expression == "0 0 * * *":
                return "Daily at midnight"
            elif cron_expression == "0 12 * * *":
                return "Daily at noon"
            elif cron_expression == "0 0 * * 0":
                return "Weekly on Sunday at midnight"
            elif cron_expression == "0 0 1 * *":
                return "Monthly on the 1st at midnight"
            elif cron_expression.startswith("*/"):
                interval = cron_expression.split()[0][2:]
                return f"Every {interval} minutes"
            else:
                return f"At {hour}:{minute} daily" if day == "*" else cron_expression
                
        except Exception:
            return cron_expression


async def execute_scheduled_run(
    schedule_id: str,
    user_id: str,
    actor_id: str,
    input_data: Dict[str, Any]
):
    """Execute a scheduled run (module-level function for pickling)."""
    try:
        scheduler = get_scheduler()
        db = scheduler.db
        logger.info(f"⏰ Executing scheduled run for schedule {schedule_id}")
        
        # Get actor details
        actor = await db.actors.find_one({"id": actor_id})
        if not actor:
            logger.error(f"Actor {actor_id} not found for schedule {schedule_id}")
            await scheduler._update_schedule_status(schedule_id, "failed", None)
            return
        
        from models import Run
        run = Run(
            user_id=user_id,
            actor_id=actor_id,
            actor_name=actor['name'],
            actor_icon=actor.get('icon'),
            input_data=input_data,
            status="queued",
            origin="Scheduler"
        )
        
        doc = run.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.runs.insert_one(doc)
        
        logger.info(f"✅ Created scheduled run {run.id} for schedule {schedule_id}")
        
        from tasks.scrape_tasks import run_actor, PLAN_QUEUE_MAP
        user_doc = await db.users.find_one({"id": user_id})
        plan = user_doc.get("plan", "free") if user_doc else "free"
        queue = PLAN_QUEUE_MAP.get(plan, "q_free")
        
        run_actor.apply_async(
            kwargs={
                "run_id": run.id,
                "actor_id": actor_id,
                "user_id": user_id,
                "input_data": input_data,
                "organization_id": None
            },
            queue=queue,
            task_id=run.id
        )
        
        await scheduler._update_schedule_status(schedule_id, "success", run.id)
        logger.info(f"✅ Scheduled run {run.id} started successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to execute scheduled run for {schedule_id}: {str(e)}")
        try:
            scheduler = get_scheduler()
            await scheduler._update_schedule_status(schedule_id, "failed", None)
        except Exception:
            pass

# Global scheduler instance
scheduler_service: Optional[SchedulerService] = None


def get_scheduler() -> SchedulerService:
    """Get the global scheduler instance."""
    if scheduler_service is None:
        raise RuntimeError("Scheduler service not initialized")
    return scheduler_service


async def init_scheduler(db: AsyncIOMotorDatabase):
    """Initialize the global scheduler service."""
    global scheduler_service
    scheduler_service = SchedulerService(db)
    await scheduler_service.start()
    return scheduler_service
