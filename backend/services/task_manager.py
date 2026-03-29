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
    
    def get_status(self) -> Dict:
        """Get current status of task manager."""
        return {
            "status": "managed_by_celery"
        }

task_manager = TaskManager()

def get_task_manager() -> TaskManager:
    """Get the global task manager instance."""
    return task_manager
