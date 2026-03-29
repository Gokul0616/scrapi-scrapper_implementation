import asyncio
import logging
import os
import sys

# Ensure the backend root directory is explicitly in the Python path for Celery child processes
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery_app import celery_app

logger = logging.getLogger(__name__)

async def run_async_scraping_job(run_id: str, actor_id: str, user_id: str, input_data: dict, organization_id: str = None):
    import sys
    import os
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
        
    from motor.motor_asyncio import AsyncIOMotorClient
    from database import set_globals
    from services.proxy_manager import ProxyManager
    from routes.runs import execute_scraping_job
    from services.task_manager import task_manager # Even though we use Celery, the execute_scraping_job imports and requires task_manager or proxies
    from services.email_validator import get_email_validator
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'scrapi')
    
    # Init MongoDB for this loop
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Register worker PID so abort API can cleanly identify and kill zombie browsers
    import os
    await db.runs.update_one({"id": run_id}, {"$set": {"worker_pid": os.getpid()}})
    
    # Re-initialize globals for this process
    proxy_manager = ProxyManager(db)
    set_globals(db, proxy_manager, task_manager)
    
    # Needs to initialize the email validator as well because some core services might rely on it
    try:
        await get_email_validator()
    except Exception as e:
        logger.warning(f"Could not initialize email validator in worker: {e}")
        
    try:
        # Run the actual background scraping job (we ignore its task_manager dependencies)
        logger.info(f"Worker beginning async scraping job for run: {run_id}")
        await execute_scraping_job(run_id, actor_id, user_id, input_data, organization_id)
        logger.info(f"Worker successfully finished async scraping job for run: {run_id}")
    except Exception as e:
        logger.error(f"Worker encountered error during scraping job for run {run_id}: {e}")
        raise
    finally:
        client.close()


def cleanup_child_processes(task_id: str):
    import psutil
    try:
        current_process = psutil.Process()
        children = current_process.children(recursive=True)
        for child in children:
            if "chrome" in child.name().lower() or "chromium" in child.name().lower():
                logger.info(f"Task {task_id}: Force killing orphaned Chromium process {child.pid}")
                child.kill()
    except Exception as e:
        pass

@celery_app.task(bind=True, name="workers.scraping_worker.run_scraping_task")
def run_scraping_task(self, run_id: str, actor_id: str, user_id: str, input_data: dict, organization_id: str = None):
    """
    Sync wrapper to execute scraping inside a Celery task.
    """
    logger.info(f"Celery picked up task for run_id: {run_id}. Task ID: {self.request.id}")
    try:
        asyncio.run(run_async_scraping_job(run_id, actor_id, user_id, input_data, organization_id))
    except BaseException as e:
        logger.error(f"Failed or Aborted scraping task {self.request.id}: {e}")
        cleanup_child_processes(self.request.id)
        raise
    finally:
        cleanup_child_processes(self.request.id)
