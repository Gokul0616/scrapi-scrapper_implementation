"""
Scheduler Service for managing cron-based scheduled runs.
Uses APScheduler for job scheduling and execution.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from croniter import croniter
from datetime import datetime, timezone
import pytz
import logging
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
            # Create scheduler with memory job store
            jobstores = {
                'default': MemoryJobStore()
            }
            
            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                timezone=pytz.UTC
            )
            
            self.scheduler.start()
            self._initialized = True
            logger.info("✅ Scheduler started successfully")
            
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
                func=self._execute_scheduled_run,
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
    
    async def _execute_scheduled_run(
        self,
        schedule_id: str,
        user_id: str,
        actor_id: str,
        input_data: Dict[str, Any]
    ):
        """Execute a scheduled run."""
        try:
            logger.info(f"⏰ Executing scheduled run for schedule {schedule_id}")
            
            # Get actor details
            actor = await self.db.actors.find_one({"id": actor_id})
            if not actor:
                logger.error(f"Actor {actor_id} not found for schedule {schedule_id}")
                await self._update_schedule_status(schedule_id, "failed", None)
                return
            
            # Import Run model here to avoid circular imports
            from models import Run
            
            # Create run
            run = Run(
                user_id=user_id,
                actor_id=actor_id,
                actor_name=actor['name'],
                actor_icon=actor.get('icon'),
                input_data=input_data,
                status="queued",
                origin="Scheduler"
            )
            
            # Save run to database
            doc = run.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await self.db.runs.insert_one(doc)
            
            logger.info(f"✅ Created scheduled run {run.id} for schedule {schedule_id}")
            
            # Import task manager and execute function
            from services.task_manager import task_manager
            from routes.routes import execute_scraping_job
            
            # Start the scraping task
            await task_manager.start_task(
                run.id,
                execute_scraping_job(
                    run.id,
                    actor_id,
                    user_id,
                    input_data
                )
            )
            
            # Update schedule with last run info
            await self._update_schedule_status(schedule_id, "success", run.id)
            
            logger.info(f"✅ Scheduled run {run.id} started successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to execute scheduled run for {schedule_id}: {str(e)}")
            await self._update_schedule_status(schedule_id, "failed", None)
    
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
