"""
Celery Queue Configuration — Phase 1.3

Defines named queues for priority-based task routing:
  - high_priority  → Pro / Business plan runs
  - default        → Free tier runs
  - scheduled      → Scheduler-triggered runs
  - webhooks       → Webhook delivery tasks

Import `QUEUE_CONFIG` in celery_app.py to apply, or use
`apply_async(queue=QUEUES.HIGH_PRIORITY)` at dispatch time.
"""

from kombu import Exchange, Queue

# ── Exchange ─────────────────────────────────────────────────────────────────
# A single direct exchange for all scrapi tasks
SCRAPI_EXCHANGE = Exchange("scrapi", type="direct")


# ── Queue name constants (use these instead of raw strings) ───────────────────
class QUEUES:
    HIGH_PRIORITY = "high_priority"
    DEFAULT = "default"
    SCHEDULED = "scheduled"
    WEBHOOKS = "webhooks"
    BUILDS = "builds"  # Phase 5 — Actor build pipeline


# ── Queue definitions ─────────────────────────────────────────────────────────
TASK_QUEUES = (
    Queue(
        QUEUES.HIGH_PRIORITY,
        SCRAPI_EXCHANGE,
        routing_key=QUEUES.HIGH_PRIORITY,
        queue_arguments={"x-max-priority": 10},
    ),
    Queue(
        QUEUES.DEFAULT,
        SCRAPI_EXCHANGE,
        routing_key=QUEUES.DEFAULT,
        queue_arguments={"x-max-priority": 5},
    ),
    Queue(
        QUEUES.SCHEDULED,
        SCRAPI_EXCHANGE,
        routing_key=QUEUES.SCHEDULED,
        queue_arguments={"x-max-priority": 3},
    ),
    Queue(
        QUEUES.WEBHOOKS,
        SCRAPI_EXCHANGE,
        routing_key=QUEUES.WEBHOOKS,
        queue_arguments={"x-max-priority": 7},
    ),
    Queue(
        QUEUES.BUILDS,
        SCRAPI_EXCHANGE,
        routing_key=QUEUES.BUILDS,
        queue_arguments={"x-max-priority": 8},  # Higher than default, lower than high_priority
    ),
)

# ── Explicit task → queue routing ─────────────────────────────────────────────
TASK_ROUTES = {
    "workers.scraping_worker.run_scraping_task": {"queue": QUEUES.DEFAULT},
    "workers.webhook_worker.dispatch_webhook": {"queue": QUEUES.WEBHOOKS},
    "workers.build_worker.run_build_task": {"queue": QUEUES.BUILDS},  # Phase 5
}

# ── Convenience dict to pass straight into celery_app.conf.update() ──────────
QUEUE_CONFIG = {
    "task_queues": TASK_QUEUES,
    "task_routes": TASK_ROUTES,
    "task_default_queue": QUEUES.DEFAULT,
    "task_default_exchange": "scrapi",
    "task_default_routing_key": QUEUES.DEFAULT,
}
