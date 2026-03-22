import asyncio
from celery_app import celery_app
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

PLAN_QUEUE_MAP = {
    "free": "q_free", 
    "starter": "q_standard",
    "pro": "q_priority", 
    "scale": "q_premium"
}

@celery_app.task(
    bind=True, 
    max_retries=3, 
    default_retry_delay=60,
    name="tasks.scrape_tasks.run_actor"
)
def run_actor(self, run_id, actor_id, user_id, input_data, organization_id=None):
    """
    Execute a scraping actor — runs in an isolated Celery worker process.
    This replaces the single-process asyncio TaskManager.
    """
    try:
        # Create a new event loop for this Celery worker process/thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Run the async scraping job
        loop.run_until_complete(_execute_async(run_id, actor_id, user_id, input_data, organization_id))
    except Exception as exc:
        logger.error(f"Task run_actor failed for run_id={run_id}: {exc}")
        raise self.retry(exc=exc)
    finally:
        # IMPORTANT: Celery runs synchronously. When run_until_complete finishes, the 
        # asyncio event loop pauses. If we keep Playwright alive, its connection pipe breaks!
        # We MUST tear down the BrowserPool at the end of each Celery task.
        from services.browser_pool import BrowserPool
        if BrowserPool._instance:
            try:
                # Run cleanup in the same event loop context
                if loop and loop.is_running():
                    loop.run_until_complete(BrowserPool._instance.cleanup())
                else: # If loop is not running or not available, create a temporary one for cleanup
                    temp_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(temp_loop)
                    temp_loop.run_until_complete(BrowserPool._instance.cleanup())
                    temp_loop.close()
            except Exception as e:
                logger.warning(f"Error cleaning up BrowserPool: {e}")
            BrowserPool._instance = None
        
        if loop: # Only attempt to close if loop was successfully created
            try:
                loop.close()
            except Exception as e:
                logger.warning(f"Error closing event loop: {e}")


async def _execute_async(run_id, actor_id, user_id, input_data, organization_id=None):
    # Initialize MongoDB client for this Celery worker process
    # Ensure backend root is in sys.path for worker imports
    import sys
    import os
    from pathlib import Path
    backend_dir = str(Path(__file__).parent.parent.absolute())
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
        
    from motor.motor_asyncio import AsyncIOMotorClient
    from database import set_globals
    from services.proxy_manager import ProxyManager
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'scrapi')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Initialize ProxyManager and set globals
    proxy_manager = ProxyManager(db.proxies)
    set_globals(db, proxy_mgr=proxy_manager)
    
    # Import inside the function to avoid circular imports during Celery startup
    from routes.runs import execute_scraping_job
    await execute_scraping_job(
        run_id=run_id, 
        actor_id=actor_id, 
        user_id=user_id, 
        input_data=input_data, 
        organization_id=organization_id
    )
