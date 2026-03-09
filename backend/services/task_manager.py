"""
Task Manager for handling parallel scraping jobs.
Now backed by Celery for distributed task processing with Redis.

This module maintains backward compatibility with the existing interface
while delegating actual task execution to Celery workers.
"""
import asyncio
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class TaskManager:
    """
    Manages concurrent scraping tasks.
    
    This class maintains the original interface for backward compatibility
    but now delegates task execution to Celery workers via Redis.
    """
    
    def __init__(self):
        self._celery_available = False
        self._task_id_map: Dict[str, str] = {}  # Maps run_id to celery task_id
        self._local_tasks: Dict[str, asyncio.Task] = {}  # Fallback for local execution
        self._task_locks: Set[str] = set()
        
        # Try to initialize Celery
        self._init_celery()
    
    def _init_celery(self):
        """Initialize Celery connection."""
        try:
            from celery_app import celery_app
            self._celery_app = celery_app
            self._celery_available = True
            logger.info("✅ TaskManager initialized with Celery backend")
        except Exception as e:
            logger.warning(f"⚠️ Celery not available, falling back to local task execution: {e}")
            self._celery_available = False
    
    def is_running(self, run_id: str) -> bool:
        """Check if a task is currently running."""
        if self._celery_available and run_id in self._task_id_map:
            from celery_app import celery_app
            result = celery_app.AsyncResult(self._task_id_map[run_id])
            return result.state in ['PENDING', 'STARTED', 'RETRY']
        return run_id in self._local_tasks and not self._local_tasks[run_id].done()
    
    def get_running_count(self) -> int:
        """Get count of currently running tasks."""
        count = 0
        
        # Count Celery tasks
        if self._celery_available:
            try:
                from celery_app import celery_app
                inspect = celery_app.control.inspect()
                active = inspect.active() or {}
                for worker_tasks in active.values():
                    count += len(worker_tasks)
            except Exception as e:
                logger.warning(f"Failed to get Celery task count: {e}")
        
        # Count local tasks
        self._cleanup_completed_local()
        count += len(self._local_tasks)
        
        return count
    
    def _cleanup_completed_local(self):
        """Remove completed local tasks from tracking."""
        completed = [run_id for run_id, task in self._local_tasks.items() if task.done()]
        for run_id in completed:
            del self._local_tasks[run_id]
            self._task_locks.discard(run_id)
    
    async def start_task(self, run_id: str, coroutine=None, **kwargs):
        """
        Start a new task.
        
        Args:
            run_id: Unique identifier for the run
            coroutine: Async function to execute (for backward compatibility)
            **kwargs: Additional arguments including:
                - actor_id: ID of the actor to use
                - user_id: ID of the user
                - input_data: Input parameters for the scraping job
        """
        if run_id in self._task_locks:
            logger.warning(f"Task {run_id} is already running")
            return
        
        self._task_locks.add(run_id)
        
        try:
            if self._celery_available:
                # Use Celery for distributed task processing
                actor_id = kwargs.get('actor_id')
                user_id = kwargs.get('user_id')
                input_data = kwargs.get('input_data')
                
                if actor_id and user_id is not None and input_data is not None:
                    # Use Celery task
                    from tasks.scraping_tasks import execute_scraping_job
                    
                    task = execute_scraping_job.delay(
                        run_id=run_id,
                        actor_id=actor_id,
                        user_id=user_id,
                        input_data=input_data
                    )
                    self._task_id_map[run_id] = task.id
                    logger.info(f"Started Celery task {task.id} for run {run_id}")
                elif coroutine:
                    # Fallback: Execute locally if no Celery args provided
                    logger.warning(f"No Celery args provided for run {run_id}, using local execution")
                    await self._start_local_task(run_id, coroutine)
                else:
                    raise ValueError("Either provide coroutine or actor_id/user_id/input_data for Celery")
            else:
                # Fallback to local execution
                if coroutine:
                    await self._start_local_task(run_id, coroutine)
                else:
                    raise ValueError("Celery not available and no coroutine provided")
        
        except Exception as e:
            logger.error(f"Failed to start task {run_id}: {e}")
            self._task_locks.discard(run_id)
            raise
    
    async def _start_local_task(self, run_id: str, coroutine):
        """Start a task locally (fallback mode)."""
        task = asyncio.create_task(self._wrap_coroutine(run_id, coroutine))
        self._local_tasks[run_id] = task
        
        logger.info(f"Started local task {run_id}. Total running: {self.get_running_count()}")
        
        # Add callback to cleanup when done
        task.add_done_callback(lambda t: self._task_completed(run_id, t))
    
    async def _wrap_coroutine(self, run_id: str, coroutine):
        """Wrap a coroutine for local execution."""
        try:
            if asyncio.iscoroutine(coroutine):
                return await coroutine
            else:
                return await coroutine
        except Exception as e:
            logger.error(f"Task {run_id} failed with exception: {e}")
            raise
    
    def _task_completed(self, run_id: str, task: asyncio.Task):
        """Callback when a local task completes."""
        self._task_locks.discard(run_id)
        
        try:
            if task.exception():
                logger.error(f"Task {run_id} failed with exception: {task.exception()}")
            else:
                logger.info(f"Task {run_id} completed successfully")
        except asyncio.CancelledError:
            logger.info(f"Task {run_id} was cancelled")
        
        # Clean up
        if run_id in self._local_tasks:
            del self._local_tasks[run_id]
    
    async def cancel_task(self, run_id: str) -> bool:
        """
        Cancel a running task.
        
        Args:
            run_id: Task identifier
            
        Returns:
            True if task was cancelled, False if not found or already completed
        """
        cancelled = False
        
        # Try to cancel Celery task
        if self._celery_available and run_id in self._task_id_map:
            try:
                from celery_app import celery_app
                task_id = self._task_id_map[run_id]
                celery_app.control.revoke(task_id, terminate=True, signal='SIGTERM')
                logger.info(f"Revoked Celery task {task_id} for run {run_id}")
                cancelled = True
                del self._task_id_map[run_id]
                self._task_locks.discard(run_id)
            except Exception as e:
                logger.warning(f"Failed to revoke Celery task for run {run_id}: {e}")
        
        # Try to cancel local task
        if run_id in self._local_tasks:
            task = self._local_tasks[run_id]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    logger.info(f"Task {run_id} cancelled")
                cancelled = True
            del self._local_tasks[run_id]
            self._task_locks.discard(run_id)
        
        return cancelled
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status of task manager."""
        status = {
            "celery_available": self._celery_available,
            "local_tasks": len(self._local_tasks),
            "task_locks": len(self._task_locks),
        }
        
        if self._celery_available:
            try:
                from celery_app import celery_app
                inspect = celery_app.control.inspect()
                
                active = inspect.active() or {}
                scheduled = inspect.scheduled() or {}
                reserved = inspect.reserved() or {}
                
                status["celery_tasks"] = {
                    "active": sum(len(t) for t in active.values()),
                    "scheduled": sum(len(t) for t in scheduled.values()),
                    "reserved": sum(len(t) for t in reserved.values()),
                }
            except Exception as e:
                logger.warning(f"Failed to get Celery status: {e}")
                status["celery_error"] = str(e)
        
        return status
    
    def get_task_info(self, run_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific task.
        
        Args:
            run_id: The run ID to look up
            
        Returns:
            Dict with task information or None if not found
        """
        if self._celery_available and run_id in self._task_id_map:
            try:
                from celery_app import celery_app
                task_id = self._task_id_map[run_id]
                result = celery_app.AsyncResult(task_id)
                return {
                    "run_id": run_id,
                    "task_id": task_id,
                    "status": result.status,
                    "result": result.result if result.ready() else None,
                }
            except Exception as e:
                logger.warning(f"Failed to get task info for {run_id}: {e}")
        
        if run_id in self._local_tasks:
            task = self._local_tasks[run_id]
            return {
                "run_id": run_id,
                "type": "local",
                "done": task.done(),
                "cancelled": task.cancelled(),
            }
        
        return None
    
    def shutdown(self):
        """Graceful shutdown - cancel all pending tasks."""
        logger.info("Shutting down TaskManager...")
        
        # Cancel Celery tasks
        if self._celery_available:
            for run_id, task_id in self._task_id_map.items():
                try:
                    from celery_app import celery_app
                    celery_app.control.revoke(task_id, terminate=True)
                    logger.info(f"Revoked Celery task {task_id} during shutdown")
                except Exception as e:
                    logger.warning(f"Failed to revoke task {task_id} during shutdown: {e}")
        
        # Cancel local tasks
        for run_id, task in list(self._local_tasks.items()):
            if not task.done():
                task.cancel()
                logger.info(f"Cancelled local task {run_id} during shutdown")
        
        self._task_id_map.clear()
        self._local_tasks.clear()
        self._task_locks.clear()
        logger.info("TaskManager shutdown complete")


# Global task manager instance
task_manager = TaskManager()


def get_task_manager() -> TaskManager:
    """Get the global task manager instance."""
    return task_manager
