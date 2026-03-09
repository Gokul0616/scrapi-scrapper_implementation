"""
Celery application configuration for Scrapi.
Provides distributed task processing with Redis broker and MongoDB result backend.
"""
import os
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure, task_success
import logging

logger = logging.getLogger(__name__)

# Get configuration from environment
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'scrapi')

# Create Celery app
celery_app = Celery(
    'scrapi',
    broker=REDIS_URL,
    backend=f'{MONGO_URL}/{DB_NAME}?collection=celery_task_results',
    include=['tasks.scraping_tasks']
)

# Celery configuration
celery_app.conf.update(
    # Task serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task execution settings
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3300,  # 55 minutes soft limit
    worker_prefetch_multiplier=1,  # One task at a time per worker
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks to prevent memory leaks
    
    # Result backend settings
    result_expires=86400 * 7,  # Results expire after 7 days
    result_extended=True,
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute initial delay
    task_max_retries=3,
    
    # Broker settings
    broker_connection_retry_on_startup=True,
    broker_heartbeat=30,
    
    # Task routing
    task_routes={
        'tasks.scraping_tasks.execute_scraping_job': {'queue': 'scraping'},
        'tasks.scraping_tasks.*': {'queue': 'scraping'},
    },
    
    # Worker concurrency (will be overridden by command line)
    worker_concurrency=int(os.environ.get('CELERY_WORKER_CONCURRENCY', '2')),
)


@task_prerun.connect
def task_prerun_handler(task_id, task, args, kwargs, **extras):
    """Log when a task starts running."""
    logger.info(f"Task {task.name}[{task_id}] started with args={args}, kwargs={kwargs}")


@task_postrun.connect
def task_postrun_handler(task_id, task, args, kwargs, retval, state, **extras):
    """Log when a task completes."""
    logger.info(f"Task {task.name}[{task_id}] completed with state={state}")


@task_failure.connect
def task_failure_handler(task_id, exception, args, kwargs, traceback, einfo, **extras):
    """Log task failures."""
    logger.error(f"Task failed [{task_id}]: {exception}")


@task_success.connect
def task_success_handler(sender, result, **kwargs):
    """Log task success."""
    logger.info(f"Task {sender.name} succeeded with result: {result}")


if __name__ == '__main__':
    celery_app.start()
