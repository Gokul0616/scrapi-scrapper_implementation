"""
Task Manager for handling parallel scraping jobs.
Allows multiple scraping runs to execute concurrently.
"""

import asyncio
import logging
from typing import Dict, Set
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class TaskManager:
    """Manages concurrent scraping tasks."""
    
    def __init__(self):
        self.running_tasks: Dict[str, asyncio.Task] = {}
        self.task_locks: Set[str] = set()
    
    def is_running(self, run_id: str) -> bool:
        """Check if a task is currently running."""
        return run_id in self.running_tasks and not self.running_tasks[run_id].done()
    
    def get_running_count(self) -> int:
        """Get count of currently running tasks."""
        # Clean up completed tasks
        self._cleanup_completed()
        return len(self.running_tasks)
    
    def _cleanup_completed(self):
        """Remove completed tasks from tracking."""
        completed = [run_id for run_id, task in self.running_tasks.items() if task.done()]
        for run_id in completed:
            del self.running_tasks[run_id]
            self.task_locks.discard(run_id)
    
    async def start_task(self, run_id: str, coroutine):
        """
        Start a new task in the background.
        
        Args:
            run_id: Unique identifier for the run
            coroutine: Async function to execute
        """
        if run_id in self.task_locks:
            logger.warning(f"Task {run_id} is already running")
            return
        
        # Mark as running
        self.task_locks.add(run_id)
        
        # Create and start task
        task = asyncio.create_task(coroutine)
        self.running_tasks[run_id] = task
        
        logger.info(f"Started task {run_id}. Total running: {self.get_running_count()}")
        
        # Add callback to cleanup when done
        task.add_done_callback(lambda t: self._task_completed(run_id, t))
    
    def _task_completed(self, run_id: str, task: asyncio.Task):
        """Callback when a task completes."""
        self.task_locks.discard(run_id)
        
        if task.exception():
            logger.error(f"Task {run_id} failed with exception: {task.exception()}")
        else:
            logger.info(f"Task {run_id} completed successfully")
        
        # Clean up
        if run_id in self.running_tasks:
            del self.running_tasks[run_id]
    
    async def cancel_task(self, run_id: str) -> bool:
        """
        Cancel a running task.
        
        Args:
            run_id: Task identifier
            
        Returns:
            True if task was cancelled, False if not found or already completed
        """
        if run_id not in self.running_tasks:
            return False
        
        task = self.running_tasks[run_id]
        if task.done():
            return False
        
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            logger.info(f"Task {run_id} cancelled")
        
        return True
    
    def get_status(self) -> Dict:
        """Get current status of task manager."""
        self._cleanup_completed()
        return {
            "running_tasks": len(self.running_tasks),
            "task_ids": list(self.running_tasks.keys())
        }

# Global task manager instance
task_manager = TaskManager()

def get_task_manager() -> TaskManager:
    """Get the global task manager instance."""
    return task_manager
