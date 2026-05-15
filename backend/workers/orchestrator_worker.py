import asyncio
import logging
import os
import sys
import json
import time

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from celery_app import celery_app
from services.docker_executor import DockerExecutor
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(backend_dir, '.env'))

logger = logging.getLogger(__name__)

async def run_async_orchestrated_job(run_id: str, actor_id: str, user_id: str, input_data: dict, organization_id: str = None, version_number: str = None):
    from motor.motor_asyncio import AsyncIOMotorClient
    import redis.asyncio as aioredis
    import jwt

    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'scrapi')
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    secret_key = os.environ.get('JWT_SECRET', 'supersecretkey') # Fallback for test

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    redis_client = aioredis.from_url(redis_url, decode_responses=True)

    try:
        # Create standard storages (KV store, Request Queue) as before
        from services.kv_store_service import KVStoreService
        from services.request_queue_service import RequestQueueService

        kv_service = KVStoreService(db)
        rq_service = RequestQueueService(db)

        default_kv = await kv_service.create_store(user_id=user_id, run_id=run_id, org_id=organization_id)
        await kv_service.set_record(default_kv.id, "INPUT", input_data, "application/json")
        default_rq = await rq_service.create_queue(user_id=user_id, run_id=run_id, org_id=organization_id)

        # Update run with default storage
        await db.runs.update_one(
            {"id": run_id},
            {
                "$set": {
                    "default_kv_store_id": default_kv.id,
                    "default_request_queue_id": default_rq.id,
                    "status": "running",
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Fetch actor details
        run = await db.runs.find_one({"id": run_id})
        dataset_id = run.get("default_dataset_id", "default") if run else "default"

        # 1. Generate Ephemeral Run Token
        exp = datetime.now(timezone.utc) + timedelta(hours=2)
        payload = {
            "sub": user_id,
            "run_id": run_id,
            "dataset_id": dataset_id,
            "exp": exp,
            "scopes": ["run:write"]
        }
        run_token = jwt.encode(payload, secret_key, algorithm="HS256")

        # 2. Prepare Environment Variables for the Actor SDK
        env_vars = {
            "SCRAPI_TOKEN": run_token,
            "SCRAPI_RUN_ID": run_id,
            "SCRAPI_API_URL": "http://host.docker.internal:8001", # Connect back to host
            "SCRAPI_DEFAULT_DATASET_ID": dataset_id,
            "SCRAPI_DEFAULT_KEY_VALUE_STORE_ID": default_kv.id,
            "SCRAPI_DEFAULT_REQUEST_QUEUE_ID": default_rq.id,
            "PYTHONUNBUFFERED": "1" # Important for immediate log streaming
        }

        # Inject user secrets if needed
        if version_number:
            try:
                from services.secrets_service import SecretsService
                secrets_svc = SecretsService(db)
                secrets = await secrets_svc.get_for_run(actor_id, version_number)
                if secrets:
                    env_vars.update(secrets)
            except Exception as env_err:
                logger.warning(f"Could not inject env vars: {env_err}")

        # 3. Docker Execution
        executor = DockerExecutor()
        
        # For Phase 7 testing, we will run a simple Python script instead of building custom actor images.
        # This python script simulates an actor using the SDK.
        # We mount the backend directory so it can import 'scrapi'.
        # Actually, let's just pass a raw command for testing.
        
        # Temporary test image
        image = "python:3.11-slim"
        limits = {"memory": "512m"}

        async def log_callback(line: str):
            # Stream directly to Redis SSE channel
            await redis_client.publish(f"run_logs:{run_id}", line)

        logger.info(f"Orchestrator starting container for run {run_id}...")
        
        # Let's write a small script inside the container to test the SDK
        test_script = """
import sys
import os
import time

print('Starting Actor inside Docker container...')
print('Environment:')
for k, v in os.environ.items():
    if k.startswith('SCRAPI_'):
        print(f'{k}={v}')

print('Simulating scrape...')
time.sleep(2)
print('Scrape complete! Pushing data...')
time.sleep(1)
print('Done!')
"""
        env_vars["TEST_SCRIPT"] = test_script
        
        exit_code = await executor.run_actor(
            image=image,
            env=env_vars,
            limits=limits,
            run_id=run_id,
            log_callback=log_callback,
            command=["python", "-c", test_script]
        )

        finished_at = datetime.now(timezone.utc).isoformat()
        if exit_code == 0:
            await db.runs.update_one({"id": run_id}, {"$set": {"status": "succeeded", "finished_at": finished_at}})
            await redis_client.publish(f"run_logs:{run_id}", "Container exited successfully.")
        else:
            await db.runs.update_one({"id": run_id}, {"$set": {"status": "failed", "finished_at": finished_at}})
            await redis_client.publish(f"run_logs:{run_id}", f"Container failed with exit code {exit_code}.")

    except Exception as e:
        logger.error(f"Orchestrator error for run {run_id}: {e}")
        await db.runs.update_one({"id": run_id}, {"$set": {"status": "failed", "finished_at": datetime.now(timezone.utc).isoformat(), "error_message": str(e)}})
        await redis_client.publish(f"run_logs:{run_id}", f"Orchestrator error: {str(e)}")
        raise
    finally:
        client.close()
        await redis_client.close()


@celery_app.task(bind=True, name="workers.orchestrator_worker.run_orchestrated_task")
def run_orchestrated_task(self, run_id: str, actor_id: str, user_id: str, input_data: dict, organization_id: str = None, version_number: str = None):
    logger.info(f"Orchestrator picked up task for run_id: {run_id}. Task ID: {self.request.id}")
    try:
        asyncio.run(run_async_orchestrated_job(run_id, actor_id, user_id, input_data, organization_id, version_number))
    except BaseException as e:
        logger.error(f"Failed Orchestrator task {self.request.id}: {e}")
        raise
