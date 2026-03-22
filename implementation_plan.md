# Scrapi → Apify Scale: Complete Implementation Plan

## Background

After deep-auditing the codebase and researching Apify's architecture, here is the full picture:

**What's already installed but NOT wired up to scraping:**
- `celery==5.6.2`, `kombu`, `flower` — in [requirements.txt](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/requirements.txt), [docker-compose.yml](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/docker-compose.yml) has a `worker` service but `celery_app.py` **doesn't exist** → worker crashes on start
- `redis==4.6.0` — running, used for some caching but not as a job broker for scrapers
- `prometheus_client==0.24.1` — installed, zero metrics exported
- `APScheduler` with `MemoryJobStore` — scheduled jobs are **lost on every restart**
- [ScraperEngine](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/scrapers/scraper_engine.py#16-273) runs Playwright inside the FastAPI async event loop → single process, no isolation

**What Apify does that you don't yet:**
| Layer | Apify | Scrapi Today |
|---|---|---|
| Job execution | Containerized actors, KEDA-autoscaled | asyncio tasks in one process, lost on restart |
| Job queue | DynamoDB-backed, 500K req/min, dedup | No queue — HTTP → immediate execution |
| Scheduling | Redis-backed, cluster-aware | APScheduler MemoryJobStore — erased on restart |
| Proxy | Millions of IPs, session-sticky | DB-cached, no session stickiness |
| Storage | Dataset + KV Store + Request Queue | MongoDB datasets only |
| Observability | Prometheus + custom dashboards | Nothing wired |

---

## Phase 1 — Distribute Scraping via Celery + Redis ⭐ HIGHEST ROI

> **Goal:** Every scraping job goes through Redis → Celery worker → no single point of failure.

### [NEW] `backend/services/browser_pool.py`

Move browser lifecycle from [ScraperEngine](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/scrapers/scraper_engine.py#16-273) (per-job) to a shared pool (per-worker).

```python
import asyncio
from playwright.async_api import async_playwright, Browser

class BrowserPool:
    """Singleton service to manage shared browser instances across Celery tasks."""
    _instance = None
    
    def __init__(self):
        self.pw = None
        self.browser = None
        self.context_count = 0
        self.max_contexts_per_browser = 500 # Rotate browser after 500 jobs to avoid leaks

    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def get_context(self, **options):
        if not self.browser:
            self.pw = await async_playwright().start()
            self.browser = await self.pw.chromium.launch(headless=True)
        
        self.context_count += 1
        if self.context_count > self.max_contexts_per_browser:
            await self.rotate_browser()
            
        return await self.browser.new_context(**options)

    async def rotate_browser(self):
        """Close and restart browser periodically."""
        if self.browser:
            await self.browser.close()
        self.browser = await self.pw.chromium.launch(headless=True)
        self.context_count = 0
```

### [NEW] `backend/celery_app.py`

The core Celery application with priority queues by plan tier.

```python
from celery import Celery
import os

celery_app = Celery(
    "scrapi",
    broker=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("REDIS_URL", "redis://localhost:6379/1"),
    include=["tasks.scrape_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    task_acks_late=True,               # Only ack AFTER task finishes (no job loss on crash)
    worker_prefetch_multiplier=1,      # One job per worker at a time
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
```

### [NEW] `backend/tasks/__init__.py` + `backend/tasks/scrape_tasks.py`

```python
# tasks/scrape_tasks.py
import asyncio
from celery_app import celery_app
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)
PLAN_QUEUE_MAP = {
    "free": "q_free", "starter": "q_standard",
    "pro": "q_priority", "scale": "q_premium"
}

@celery_app.task(
    bind=True, max_retries=3, default_retry_delay=60,
    name="tasks.scrape_tasks.run_actor"
)
def run_actor(self, run_id, actor_id, user_id, input_data):
    """Execute a scraping actor — runs in isolated Celery worker process."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_execute(run_id, actor_id, user_id, input_data))
    except Exception as exc:
        raise self.retry(exc=exc)

async def _execute(run_id, actor_id, user_id, input_data):
    from routes.routes import execute_scraping_job
    await execute_scraping_job(run_id, actor_id, user_id, input_data)
```

### [MODIFY] [backend/routes/runs.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/routes/runs.py)

Replace `task_manager.start_task()` with Celery dispatch:

```python
# BEFORE:
await task_manager.start_task(run.id, execute_scraping_job(run.id, actor_id, user_id, input_data))

# AFTER:
from tasks.scrape_tasks import run_actor
queue = PLAN_QUEUE_MAP.get(user.get("plan", "free"), "q_free")
run_actor.apply_async(
    kwargs={"run_id": run.id, "actor_id": actor_id, "user_id": user_id, "input_data": input_data},
    queue=queue,
    task_id=run.id
)
```

### [MODIFY] [backend/services/scheduler_service.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/services/scheduler_service.py)

Switch from MemoryJobStore to RedisJobStore:

```python
# BEFORE:
from apscheduler.jobstores.memory import MemoryJobStore
jobstores = {'default': MemoryJobStore()}

# AFTER:
from apscheduler.jobstores.redis import RedisJobStore
jobstores = {
    'default': RedisJobStore(
        host=os.environ.get('REDIS_HOST', 'localhost'),
        port=6379, db=2
    )
}
```

### [MODIFY] [docker-compose.yml](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/docker-compose.yml)

Replace single worker with tiered worker fleet:

```yaml
celery-worker-premium:
  build: ./backend
  command: celery -A celery_app worker -Q q_premium,q_priority -c 10 --loglevel=info
  deploy:
    replicas: 2
  environment: &worker_env
    MONGO_URL: mongodb://mongodb:27017
    REDIS_URL: redis://redis:6379/0
    DB_NAME: scrapi

celery-worker-standard:
  build: ./backend
  command: celery -A celery_app worker -Q q_standard -c 4 --loglevel=info
  deploy:
    replicas: 3
  environment: *worker_env

celery-worker-free:
  build: ./backend
  command: celery -A celery_app worker -Q q_free -c 1 --loglevel=info
  environment: *worker_env

celery-beat:
  build: ./backend
  command: celery -A celery_app beat --loglevel=info
  environment: *worker_env

celery-flower:
  image: mher/flower
  ports:
    - "5555:5555"
  environment:
    CELERY_BROKER_URL: redis://redis:6379/0
  depends_on: [redis, celery-worker-standard]

redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 4gb --maxmemory-policy allkeys-lru
  ports:
    - "6379:6379"
```

---

## Phase 2 — Redis Streams Request Queue (Deep Crawling)

> **Goal:** Enable actors to discover and queue millions of URLs without memory overflow.

### [NEW] `backend/services/request_queue.py`

```python
import redis, hashlib, json

class RequestQueue:
    """Persistent distributed URL queue backed by Redis Streams with deduplication."""
    
    def __init__(self, redis_client, run_id: str):
        self.r = redis_client
        self.stream_key = f"rq:stream:{run_id}"
        self.seen_key   = f"rq:seen:{run_id}"
        self.group_name = "workers"

    def enqueue_batch(self, urls: list[dict]) -> int:
        """Add URLs in batch. Returns count of newly added (deduped)."""
        added = 0
        pipe = self.r.pipeline()
        for item in urls:
            url_hash = hashlib.sha256(item["url"].encode()).hexdigest()
            if self.r.sadd(self.seen_key, url_hash):
                pipe.xadd(self.stream_key, {
                    "url": item["url"],
                    "method": item.get("method", "GET"),
                    "unique_key": url_hash,
                    "metadata": json.dumps(item.get("metadata", {}))
                })
                added += 1
        pipe.execute()
        return added

    def dequeue_batch(self, count=10, consumer_id="worker-1") -> list:
        """Claim next batch of URLs for processing."""
        try:
            self.r.xgroup_create(self.stream_key, self.group_name, id="0", mkstream=True)
        except Exception:
            pass
        messages = self.r.xreadgroup(
            self.group_name, consumer_id, {self.stream_key: ">"}, count=count, block=2000
        )
        return messages or []

    def ack(self, message_id: str):
        self.r.xack(self.stream_key, self.group_name, message_id)

    def pending_count(self) -> int:
        info = self.r.xpending(self.stream_key, self.group_name)
        return info.get("pending", 0) if info else 0

    def total_count(self) -> int:
        return self.r.xlen(self.stream_key)
```

### New REST Endpoints (add to [routes/runs.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/routes/runs.py) or new `routes/storage_routes.py`)

- `POST /api/request-queues` — create queue for a run
- `POST /api/request-queues/{id}/requests` — batch enqueue URLs
- `GET  /api/request-queues/{id}` — get queue status (pending, total, processed)
- `DELETE /api/request-queues/{id}` — purge queue

---

## Phase 3 — Key-Value Store (Screenshots, HTML, Binary Files)

> **Goal:** Give actors a place to store files between steps, like Apify's KV store.

### [NEW] `backend/storage/key_value_store.py`

```python
import boto3, os, hashlib
from motor.motor_asyncio import AsyncIOMotorDatabase

class KeyValueStore:
    """Tiered KV store: small values in MongoDB, large files in S3/local."""
    
    MONGO_SIZE_LIMIT = 64 * 1024  # 64KB → MongoDB
    # Larger → S3 or local filesystem
    
    async def set(self, db: AsyncIOMotorDatabase, run_id: str, key: str, value: bytes, content_type="application/json"):
        if len(value) <= self.MONGO_SIZE_LIMIT:
            await db.kv_store.update_one(
                {"run_id": run_id, "key": key},
                {"$set": {"value": value, "content_type": content_type, "storage": "mongo"}},
                upsert=True
            )
        else:
            s3_key = f"kv/{run_id}/{key}"
            await self._upload_to_s3(s3_key, value, content_type)
            await db.kv_store.update_one(
                {"run_id": run_id, "key": key},
                {"$set": {"s3_key": s3_key, "content_type": content_type, "storage": "s3"}},
                upsert=True
            )

    async def _upload_to_s3(self, key, data, content_type):
        s3 = boto3.client("s3")
        s3.put_object(Bucket=os.environ["S3_BUCKET"], Key=key, Body=data, ContentType=content_type)
```

### New REST Endpoints

- `PUT  /api/key-value-stores/{store_id}/records/{key}` — upload file/value
- `GET  /api/key-value-stores/{store_id}/records/{key}` — download
- `DELETE /api/key-value-stores/{store_id}/records/{key}` — delete
- `GET  /api/key-value-stores/{store_id}/keys` — list all keys

Each run auto-creates a KV store on start.

---

## Phase 4 — Plan-Based Resource Limits & Autoscaling

> **Goal:** Free users get 1 concurrent job, Scale users get unlimited workers.

### [NEW] `backend/services/resource_limiter.py`

```python
PLAN_LIMITS = {
    "free":    {"max_concurrent": 1,  "timeout_sec": 300,  "memory_mb": 512,  "max_contexts": 1},
    "starter": {"max_concurrent": 3,  "timeout_sec": 1800, "memory_mb": 1024, "max_contexts": 3},
    "pro":     {"max_concurrent": 10, "timeout_sec": 3600, "memory_mb": 2048, "max_contexts": 5},
    "scale":   {"max_concurrent": 50, "timeout_sec": 7200, "memory_mb": 4096, "max_contexts": 20},
}

async def check_concurrency_limit(db, redis_client, user_id: str, plan: str) -> bool:
    """Return True if user can start a new job."""
    limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["max_concurrent"]
    running = await db.runs.count_documents({"user_id": user_id, "status": "running"})
    return running < limit
```

### [MODIFY] [routes/runs.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/routes/runs.py) — gate job dispatch

```python
from services.resource_limiter import check_concurrency_limit, PLAN_LIMITS

# Before dispatching to Celery:
if not await check_concurrency_limit(db, redis, user_id, user["plan"]):
    raise HTTPException(429, f"Concurrency limit reached for {user['plan']} plan. Upgrade to run more jobs simultaneously.")

# Add time_limit to task dispatch:
run_actor.apply_async(
    kwargs={...},
    queue=queue,
    time_limit=PLAN_LIMITS[plan]["timeout_sec"]
)
```

### [MODIFY] [docker-compose.yml](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/docker-compose.yml) — Docker resource limits per worker

```yaml
celery-worker-free:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
celery-worker-premium:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 4G
```

---

## Phase 5 — Proxy Session Stickiness (Redis-Cached)

> **Goal:** Same domain → same IP for the duration of a session.

### [MODIFY] [backend/services/proxy_manager.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/services/proxy_manager.py)

Add `get_session_proxy()` method:

```python
async def get_session_proxy(self, redis_client, session_id: str, domain: str) -> Optional[dict]:
    """Return the same proxy for (session, domain) to avoid IP rotation mid-session."""
    cache_key = f"proxy_session:{session_id}:{domain}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    proxy = await self.get_best_proxy()
    if proxy:
        redis_client.setex(cache_key, 3600, json.dumps(proxy))
    return proxy

async def record_domain_result(self, redis_client, proxy_id: str, domain: str, success: bool):
    """Track per-proxy per-domain success rates for smarter routing."""
    key = f"proxy_domain:{proxy_id}:{domain}"
    redis_client.hincrby(key, "success" if success else "failure", 1)
    redis_client.expire(key, 86400)
```

### [MODIFY] [scrapers/scraper_engine.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/scrapers/scraper_engine.py) — use session proxy

```python
async def create_context(self, use_proxy=True, session_id=None, domain=None):
    # ...
    if use_proxy and self.proxy_manager and session_id:
        proxy_dict = await self.proxy_manager.get_session_proxy(
            self.redis, session_id=session_id, domain=domain
        )
```

---

## Phase 6 — Observability: Prometheus + Webhook Delivery

> **Goal:** Know exactly what's happening — queue depth, failure rates, durations.

### [NEW] `backend/metrics.py`

```python
from prometheus_client import Counter, Histogram, Gauge, make_asgi_app

JOBS_QUEUED     = Counter("scrapi_jobs_queued_total", "Jobs queued", ["plan", "actor"])
JOBS_COMPLETED  = Counter("scrapi_jobs_completed_total", "Jobs completed", ["status", "actor"])
JOB_DURATION    = Histogram("scrapi_job_duration_seconds", "Job duration", ["actor"])
QUEUE_DEPTH     = Gauge("scrapi_queue_depth", "Queue depth", ["queue_name"])
PROXY_HIT_RATE  = Gauge("scrapi_proxy_success_rate", "Proxy success rate")

# Mount in server.py:
from prometheus_client import make_asgi_app
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
```

### [NEW] `backend/services/webhook_service.py`

```python
import httpx, hashlib, hmac, json
from celery_app import celery_app

@celery_app.task(name="tasks.scrape_tasks.deliver_webhook", max_retries=5)
def deliver_webhook(webhook_url, secret, event_type, payload):
    """Deliver webhook with HMAC signing + exponential retry."""
    body = json.dumps({"event": event_type, "data": payload})
    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    try:
        resp = httpx.post(webhook_url, content=body, headers={
            "Content-Type": "application/json",
            "X-Scrapi-Signature": sig,
            "X-Scrapi-Event": event_type
        }, timeout=10)
        resp.raise_for_status()
    except Exception as exc:
        raise deliver_webhook.retry(exc=exc, countdown=2 ** deliver_webhook.request.retries * 60)
```

### Wire webhook triggers in run lifecycle

```python
# In execute_scraping_job, on completion:
webhooks = await db.webhooks.find({"user_id": user_id, "events": {"$in": [f"run.{status}"]}}).to_list(None)
for wh in webhooks:
    deliver_webhook.delay(wh["url"], wh["secret"], f"run.{status}", run_payload)
```

---

## Phase 7 — Actor SDK + API Keys + CLI

> **Goal:** Developer-friendly platform, just like Apify's SDK and CLI.

### [NEW] `backend/sdk/actor_sdk.py`

```python
class Actor:
    """Base class for all Scrapi actors — mirrors Apify SDK."""
    
    async def main(self, input_data: dict) -> None:
        raise NotImplementedError
    
    async def push_data(self, items: list[dict]):
        """Push results to dataset — callable from inside any actor."""
        ...
    
    async def get_input(self) -> dict:
        """Get actor input — resolved from API payload."""
        ...
    
    async def abort(self, message: str = ""):
        """Gracefully abort the current run."""
        ...
```

### [NEW] API Key model + routes

```python
# models.py addition
class APIKey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    name: str
    key_hash: str          # SHA-256 of the actual key — never store plaintext
    scopes: List[str]      # ["runs:read", "runs:write", "datasets:read", ...]
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

### [NEW] CLI via Typer (`typer` already installed)

```python
# backend/cli.py
import typer
app = typer.Typer()

@app.command()
def run_start(actor_id: str, input_file: str = None):
    """Start an actor run from CLI."""
    ...

@app.command()
def dataset_export(dataset_id: str, format: str = "json"):
    """Export a dataset via CLI."""
    ...
```

---

## Full Architecture After All Phases

```
User Request
     │
     ▼
FastAPI API (multiple instances behind nginx)
     │ validate plan limit
     │ dispatch job
     ▼
Redis Job Queue (priority lanes: premium / standard / free)
     │
     ├──► Worker Pod (q_premium, c=10) — Playwright + ScraperEngine
     ├──► Worker Pod (q_standard, c=4) — Playwright + ScraperEngine
     └──► Worker Pod (q_free, c=1)     — Playwright + ScraperEngine
              │
              ├──► Redis Streams Request Queue (URL dedup + deep crawl)
              ├──► KV Store (screenshots, HTML → S3/Mongo)
              └──► MongoDB (datasets, runs, logs)
                        │
                        ▼
                Webhook delivery (Celery q_webhooks, 5 retries)
                        │
                        ▼
                Prometheus /metrics → Grafana / Flower UI
```

---

## Verification Plan

### Phase 1 Verification (Celery)
```bash
# 1. Start all services
docker-compose up --build

# 2. Check Flower dashboard at http://localhost:5555
# You should see workers registered under each queue

# 3. Trigger a scrape run via API
curl -X POST http://localhost:8000/api/actors/{actor_id}/runs \
  -H "Authorization: Bearer {token}" \
  -d '{"input_data": {"search_terms": ["test"]}}'

# 4. Watch Flower dashboard — task should appear as "ACTIVE"
# 5. Server restart test:
docker-compose restart api
# Verify: in-progress jobs CONTINUE (not lost), check Flower still shows task running
```

### Phase 2 Verification (Request Queue)
```bash
# Enqueue 10,000 URLs
curl -X POST http://localhost:8000/api/request-queues/{id}/requests \
  -d '{"requests": [{"url": "https://example.com/page/1"}, ...]}'

# Check queue depth
curl http://localhost:8000/api/request-queues/{id}
# Expected: {"total": 10000, "pending": 9990, "processed": 10}
```

### Phase 6 Verification (Prometheus)
```bash
# Check metrics endpoint
curl http://localhost:8000/metrics | grep scrapi_
# Expected output includes: scrapi_jobs_queued_total, scrapi_queue_depth, etc.
```

### Phase 1 Regression Test (Jobs survive restart)
```bash
# Start a long-running job
curl -X POST .../runs -d '{"input_data": {"max_results": 1000}}'

# Immediately restart the API server
docker-compose restart api

# Check job status after 30 seconds
curl .../runs/{run_id}
# Status should be "running" or "succeeded", NOT "failed" or "queued"
```

---

## Scalability Numbers After Implementation

| Metric | Today | After Phase 1 | After Phase 4 |
|---|---|---|---|
| Max concurrent jobs | ~10 | 40–100 | 500+ (add workers) |
| Job persistence on restart | ❌ | ✅ | ✅ |
| Queue throughput | ~100/min | ~50K/min | ~500K/min |
| URL dedup for deep crawl | ❌ | — | ✅ (Phase 2) |
| Proxy session stickiness | ❌ | — | ✅ (Phase 5) |
| Real-time metrics | ❌ | — | ✅ (Phase 6) |
| Horizontal scaling | ❌ 1 server | ✅ N workers | ✅ K8s-ready |

---

## Quick Start (Fastest Path to Scale)

These three changes unlock 90% of the value with minimal risk:

1. **Create `backend/celery_app.py`** — takes 30 minutes
2. **Create `backend/tasks/scrape_tasks.py`** — takes 1 hour  
3. **Change `run_actor.apply_async()` call in [routes/runs.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/routes/runs.py)** — takes 30 minutes

Total: **~2 hours of code** to go from single-process to distributed.
