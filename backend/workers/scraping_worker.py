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

async def run_async_scraping_job(run_id: str, actor_id: str, user_id: str, input_data: dict, organization_id: str = None, build_id: str = None, version_number: str = None):
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
        # ── Auto-create default KV Store + Request Queue per run (Scrapi-style) ──
        from services.kv_store_service import KVStoreService
        from services.request_queue_service import RequestQueueService

        kv_service = KVStoreService(db)
        rq_service = RequestQueueService(db)

        try:
            default_kv = await kv_service.create_store(
                user_id=user_id, name=None, run_id=run_id, org_id=organization_id
            )
            # Store actor INPUT in the default KV store
            await kv_service.set_record(
                default_kv.id, "INPUT", input_data, "application/json"
            )
            default_rq = await rq_service.create_queue(
                user_id=user_id, name=None, run_id=run_id, org_id=organization_id
            )
            await db.runs.update_one(
                {"id": run_id},
                {
                    "$set": {
                        "default_kv_store_id": default_kv.id,
                        "default_request_queue_id": default_rq.id,
                    }
                }
            )
            logger.info(
                f"Default storage created for run {run_id}: "
                f"kv={default_kv.id}, rq={default_rq.id}"
            )
        except Exception as storage_err:
            logger.warning(f"Could not create default storage for run {run_id}: {storage_err}")

        # ── Phase 5: Inject decrypted env vars for this version ──────────────
        if version_number:
            try:
                from services.secrets_service import SecretsService
                secrets_svc = SecretsService(db)
                env_vars = await secrets_svc.get_for_run(actor_id, version_number)
                if env_vars:
                    os.environ.update(env_vars)
                    logger.info(f"Injected {len(env_vars)} env var(s) for actor {actor_id} v{version_number}")
            except Exception as env_err:
                logger.warning(f"Could not inject env vars for run {run_id}: {env_err}")
        # ────────────────────────────────────────────────────────────────────

        # Run the actual background scraping job
        logger.info(f"Worker beginning async scraping job for run: {run_id}")
        await execute_scraping_job(run_id, actor_id, user_id, input_data, organization_id)
        logger.info(f"Worker successfully finished async scraping job for run: {run_id}")

        # 🔔 Dispatch webhook event — run.succeeded
        try:
            from services.webhook_service import WebhookService
            await WebhookService(db).dispatch_event(
                "run.succeeded", run_id, actor_id, user_id
            )
        except Exception as wh_err:
            logger.warning(f"Webhook dispatch failed (run.succeeded) for run {run_id}: {wh_err}")

        # 🔗 Advance pipeline if this run is part of one
        try:
            from services.pipeline_service import PipelineService
            await PipelineService(db).trigger_next_step(run_id)
        except Exception as pl_err:
            logger.warning(f"Pipeline advance failed for run {run_id}: {pl_err}")

    except Exception as e:
        logger.error(f"Worker encountered error during scraping job for run {run_id}: {e}")
        # 🔔 Dispatch webhook event — run.failed
        try:
            from services.webhook_service import WebhookService
            await WebhookService(db).dispatch_event(
                "run.failed", run_id, actor_id, user_id
            )
        except Exception as wh_err:
            logger.warning(f"Webhook dispatch failed (run.failed) for run {run_id}: {wh_err}")
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
def run_scraping_task(self, run_id: str, actor_id: str, user_id: str, input_data: dict, organization_id: str = None, build_id: str = None, version_number: str = None):
    """
    Sync wrapper to execute scraping inside a Celery task.
    """
    logger.info(f"Celery picked up task for run_id: {run_id}. Task ID: {self.request.id}")
    try:
        asyncio.run(run_async_scraping_job(run_id, actor_id, user_id, input_data, organization_id, build_id, version_number))
    except BaseException as e:
        logger.error(f"Failed or Aborted scraping task {self.request.id}: {e}")
        cleanup_child_processes(self.request.id)
        raise
    finally:
        cleanup_child_processes(self.request.id)
