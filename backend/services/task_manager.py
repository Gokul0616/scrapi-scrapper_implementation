"""
Task Manager for handling parallel scraping jobs.
Transitions to Celery distributed worker queue.
"""

import logging
from typing import Dict, Set, Optional
from datetime import datetime, timezone
from celery_app import celery_app

logger = logging.getLogger(__name__)

class TaskManager:
    """Manages concurrent scraping tasks via Celery."""
    
    def __init__(self):
        pass
    
    async def get_running_count(self) -> int:
        """Get count of currently active runs from DB."""
        from database import get_db
        db = get_db()
        if db is not None:
             return await db.runs.count_documents({"status": {"$in": ["queued", "running"]}})
        return 0
    
    async def cancel_task(self, run_id: str, celery_task_id: Optional[str] = None) -> bool:
        """
        Cancel a running task via Celery.
        """
        if not celery_task_id:
            # Try fetching from db if not provided
            from database import get_db
            db = get_db()
            if db is not None:
                run = await db.runs.find_one({"id": run_id})
                if run:
                    celery_task_id = run.get("celery_task_id")
                    
        # Explicitly kill worker's child Chromium frames regardless of Celery revoke state
        from database import get_db
        db = get_db()
        if db is not None:
            run = await db.runs.find_one({"id": run_id})
            if run and run.get("worker_pid"):
                worker_pid = run.get("worker_pid")
                try:
                    import psutil
                    worker_proc = psutil.Process(worker_pid)
                    for child in worker_proc.children(recursive=True):
                        if "chrome" in child.name().lower() or "chromium" in child.name().lower():
                            logger.info(f"Nuking orphaned Chromium id {child.pid} for run {run_id}")
                            child.kill()
                except Exception:
                    pass
                    
        if celery_task_id:
            logger.info(f"Revoking Celery task {celery_task_id} for run {run_id}")
            celery_app.control.revoke(celery_task_id, terminate=True, signal='SIGTERM')
            return True
            
        logger.warning(f"Could not cancel task {run_id}: no celery_task_id found")
        return False
    
    async def start_task(self, run_id: str, actor_id: str, user_id: str = None, input_data: dict = None, organization_id: str = None, *args, **kwargs) -> bool:
        """
        Start a scraping task via Celery.
        Centralizes the logic for queue selection and run tracking.
        """
        # Handle old signature: task_manager.start_task(run_id, coroutine)
        # If second arg is a coroutine object, we shouldn't attempt to use it
        if args and hasattr(args[0], '__await__'):
            logger.warning(f"TaskManager.start_task called with deprecated coroutine for run {run_id}. Celery requires explicit arguments.")
            # We attempt to proceed if user_id and input_data were also passed as kwargs
        
        from database import get_db
        db = get_db()
        if db is None:
            logger.error("No database connection available to start task")
            return False

        # Ensure we have the minimum required data
        if not all([actor_id, user_id, input_data]):
            # Try to fetch from DB if missing
            run = await db.runs.find_one({"id": run_id})
            if run:
                actor_id = actor_id or run.get("actor_id")
                user_id = user_id or run.get("user_id")
                input_data = input_data or run.get("input_data")
                organization_id = organization_id or run.get("organization_id")
            else:
                logger.error(f"Missing required data to start run {run_id}")
                return False

        # 1. Determine queue priority
        queue_name = "default"
        try:
            from services.billing_service import billing_service
            billing_info = await billing_service.get_billing_summary(organization_id or user_id, 'organization' if organization_id else 'personal')
            plan = billing_info.get("plan", "free")
            if plan in ["pro", "business", "enterprise"]:
                queue_name = "high_priority"
        except Exception as e:
            logger.warning(f"Error determining queue for run {run_id}: {e}")

        # 2. Trigger Celery task
        from workers.scraping_worker import run_scraping_task
        try:
            celery_result = run_scraping_task.apply_async(
                kwargs={
                    "run_id": run_id,
                    "actor_id": actor_id,
                    "user_id": user_id,
                    "input_data": input_data,
                    "organization_id": organization_id
                },
                queue=queue_name
            )
            
            # 3. Save task ID to database
            await db.runs.update_one(
                {"id": run_id},
                {"$set": {"celery_task_id": celery_result.id, "status": "queued"}}
            )
            
            logger.info(f"🚀 Run {run_id} successfully queued in Celery '{queue_name}' queue. Task ID: {celery_result.id}")
            return True
        except Exception as e:
            logger.error(f"Failed to trigger Celery task for run {run_id}: {e}")
            await db.runs.update_one(
                {"id": run_id},
                {"$set": {"status": "failed", "error_message": f"Failed to queue task: {str(e)}"}}
            )
            return False

    def get_status(self) -> Dict:
        """Get current status of task manager."""
        return {
            "status": "managed_by_celery"
        }

task_manager = TaskManager()

def get_task_manager() -> TaskManager:
    """Get the global task manager instance."""
    return task_manager
