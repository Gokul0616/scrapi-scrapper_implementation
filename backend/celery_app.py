import os
from celery import Celery

# Create the celery application
celery_app = Celery(
    "scrapi",
    broker=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("REDIS_URL", "redis://localhost:6379/1"),
    include=["tasks.scrape_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=['json'],
    task_acks_late=True,               # Only ack AFTER task finishes (prevents job loss on worker crash)
    worker_prefetch_multiplier=1,      # One job per worker at a time for long-running scrape tasks
    task_reject_on_worker_lost=True,   # Re-queue on worker crash
    task_routes={
        "tasks.scrape_tasks.run_actor":         {"queue": "q_standard"},
        "tasks.scrape_tasks.run_actor_priority": {"queue": "q_priority"},
        "tasks.scrape_tasks.run_actor_premium":  {"queue": "q_premium"},
        "tasks.scrape_tasks.run_actor_free":     {"queue": "q_free"},
        "tasks.scrape_tasks.run_scheduled":      {"queue": "q_scheduled"},
        "tasks.scrape_tasks.deliver_webhook":    {"queue": "q_webhooks"},
    },
    task_time_limit=3600,           # Hard kill after 1 hour
    task_soft_time_limit=3300,      # Soft warning at 55 minutes
    beat_schedule_filename="/tmp/celery_beat_schedule",
)

if __name__ == '__main__':
    celery_app.start()
