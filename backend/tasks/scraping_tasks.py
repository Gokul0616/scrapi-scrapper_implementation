"""
Celery tasks for scraping operations.
These tasks handle the actual execution of scraping jobs.
"""
import asyncio
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded

logger = logging.getLogger(__name__)


async def _get_db():
    """Get database connection."""
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'scrapi')
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name], client


async def _execute_scraping_job_async(
    run_id: str,
    actor_id: str,
    user_id: str,
    input_data: dict
) -> Dict[str, Any]:
    """
    Async implementation of scraping job execution.
    
    This is the core scraping logic that was previously in routes.py.
    """
    from scrapers import ScraperEngine, get_scraper_registry
    from services import get_proxy_manager
    from models import Dataset, DatasetItem
    
    logger.info(f"🔧 Executing scraping job for run {run_id}")
    logger.info(f"   Input data type: {type(input_data)}")
    logger.info(f"   Input data: {input_data}")
    
    # Get database connection
    db, client = await _get_db()
    
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
        
        # Initialize proxy manager and scraper engine
        proxy_manager = get_proxy_manager(db)
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
            
            return {
                "status": "success",
                "run_id": run_id,
                "results_count": len(results),
                "dataset_id": dataset.id
            }
        
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
        raise
    
    finally:
        # Close database connection
        client.close()


@shared_task(
    bind=True,
    name='tasks.scraping_tasks.execute_scraping_job',
    queue='scraping',
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,  # Max 10 minutes between retries
    retry_jitter=True,  # Add randomness to retry delays
)
def execute_scraping_job(
    self,
    run_id: str,
    actor_id: str,
    user_id: str,
    input_data: dict
) -> Dict[str, Any]:
    """
    Execute a scraping job as a Celery task.
    
    Args:
        run_id: Unique identifier for the run
        actor_id: ID of the actor to use
        user_id: ID of the user who initiated the run
        input_data: Input parameters for the scraping job
    
    Returns:
        Dict containing task result information
    
    Raises:
        Exception: Re-raises exceptions for retry logic
    """
    try:
        # Run the async scraping logic
        result = asyncio.run(_execute_scraping_job_async(
            run_id=run_id,
            actor_id=actor_id,
            user_id=user_id,
            input_data=input_data
        ))
        
        return result
    
    except SoftTimeLimitExceeded:
        logger.error(f"Task {self.request.id} exceeded soft time limit")
        # Update run status to failed
        asyncio.run(_update_run_status_on_timeout(run_id))
        raise
    
    except Exception as exc:
        logger.error(f"Task {self.request.id} failed: {exc}")
        
        # Check if we should retry
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task {self.request.id} (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        else:
            logger.error(f"Task {self.request.id} exhausted all retries")
            # Mark run as failed in database
            asyncio.run(_mark_run_failed(run_id, str(exc)))
            raise


async def _update_run_status_on_timeout(run_id: str):
    """Update run status when task times out."""
    try:
        db, client = await _get_db()
        try:
            await db.runs.update_one(
                {"id": run_id},
                {
                    "$set": {
                        "status": "failed",
                        "finished_at": datetime.now(timezone.utc).isoformat(),
                        "error_message": "Task exceeded time limit"
                    }
                }
            )
        finally:
            client.close()
    except Exception as e:
        logger.error(f"Failed to update run status on timeout: {e}")


async def _mark_run_failed(run_id: str, error_message: str):
    """Mark a run as failed after all retries exhausted."""
    try:
        db, client = await _get_db()
        try:
            await db.runs.update_one(
                {"id": run_id},
                {
                    "$set": {
                        "status": "failed",
                        "finished_at": datetime.now(timezone.utc).isoformat(),
                        "error_message": f"Failed after all retries: {error_message}"
                    }
                }
            )
        finally:
            client.close()
    except Exception as e:
        logger.error(f"Failed to mark run as failed: {e}")


@shared_task(name='tasks.scraping_tasks.health_check')
def health_check_task() -> Dict[str, str]:
    """Health check task for monitoring."""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


def revoke_task(task_id: str, terminate: bool = False) -> bool:
    """
    Revoke a running Celery task.
    
    Args:
        task_id: The Celery task ID to revoke
        terminate: If True, also terminate the worker process
    
    Returns:
        True if task was revoked, False otherwise
    """
    from celery_app import celery_app
    try:
        celery_app.control.revoke(task_id, terminate=terminate, signal='SIGTERM')
        logger.info(f"Revoked task {task_id} (terminate={terminate})")
        return True
    except Exception as e:
        logger.error(f"Failed to revoke task {task_id}: {e}")
        return False


def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the status of a Celery task.
    
    Args:
        task_id: The Celery task ID
    
    Returns:
        Dict with task status or None if not found
    """
    from celery_app import celery_app
    try:
        result = celery_app.AsyncResult(task_id)
        return {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
        }
    except Exception as e:
        logger.error(f"Failed to get task status for {task_id}: {e}")
        return None
