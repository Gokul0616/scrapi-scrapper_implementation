# 🚀 SCRAPI — Complete Apify-Scale Implementation Plan
> **Deep Analysis + Phased Roadmap** | Last Updated: March 2026

---

## 📌 Executive Summary

Scrapi is currently a **solid MVP-grade web scraping platform** with a FastAPI/Python backend, React frontend, MongoDB, Redis, and Playwright. After a full audit of all backend source files — 986-line `server.py`, 23 Pydantic models, 18 route modules, 22 service classes, and 4 scraper engines — this plan defines exactly what is needed to reach **Apify-level scalability, developer experience, and commercial viability**, broken into granular independent phases.

---

## 🔍 Current Architecture Audit

### Stack
| Layer | Technology |
|---|---|
| API Server | FastAPI (Python), single monolith |
| Background Jobs | `asyncio.create_task` via `TaskManager` (in-process) |
| Scheduling | APScheduler (in-memory `MemoryJobStore`) |
| Database | MongoDB via Motor (async) |
| Cache / Queue | Redis (auto-started via subprocess) |
| Scraping | Playwright (browser pool, per-process) |
| Auth | JWT + Google OAuth + GitHub OAuth |
| AI | Global Chat (GPT-4 function calling) |
| Billing | Stripe integration with plans |
| Frontend | React + TailwindCSS |
| Deployment | Docker Compose (single node) |

### What's Already Built ✅
- Actor CRUD + Marketplace (store, star, verify, feature)
- Run lifecycle: `queued → running → succeeded/failed/aborted`
- Parallel runs via `asyncio` `TaskManager`
- APScheduler cron scheduling (MemoryJobStore — **not persistent**!)
- Dataset management + JSON/CSV export
- Proxy rotation + health checks
- Billing (Stripe, plan limits)
- Organizations + multi-workspace support
- AI Global Chat with function calling
- Anti-bot detection layer (captcha, IP blocking)
- Admin console
- Email + Notification system

### Critical Gaps vs Apify ❌
| Gap | Severity |
|---|---|
| No distributed worker queue (Celery/RQ) — tasks die on restart | 🔴 CRITICAL |
| No persistent job store for scheduler (lost on restart) | 🔴 CRITICAL |
| No Key-Value Store (screenshots, HTML blobs, binary) | 🔴 CRITICAL |
| No Request Queue for URL crawl management | 🔴 CRITICAL |
| No Actor SDK / Actor API contract | 🔴 CRITICAL |
| No Webhooks | 🟠 HIGH |
| No API Key management (users have no API keys) | 🟠 HIGH |
| No actor versioning / build system | 🟠 HIGH |
| No real-time log streaming (WebSocket/SSE) | 🟠 HIGH |
| No actor environment variable secrets | 🟠 HIGH |
| No cloud storage export (S3/GCS) | 🟡 MEDIUM |
| No CLI tooling | 🟡 MEDIUM |
| No team RBAC (role-based access inside org) | 🟡 MEDIUM |
| Single-node deployment (no horizontal scaling) | 🔴 CRITICAL |
| No rate limiting per-API-key | 🟠 HIGH |

---

## 📐 Phased Implementation Roadmap

> Each phase and sub-phase is **independently deployable**. Implement them in order.

---

## ⚡ Phase 1 — Foundation: Distributed Execution Engine

> **Goal:** Replace in-process `asyncio.create_task` with a production-grade distributed worker queue so runs survive restarts and can scale horizontally.

### Phase 1.1 — Celery + Redis Worker Queue

**Problem:** `TaskManager` stores tasks as asyncio coroutines inside the FastAPI process. A server restart kills all running jobs.

**Solution:** Introduce **Celery** with Redis as both broker and result backend.

**Files to create/modify:**
```
backend/
├── celery_app.py             # NEW: Celery application factory
├── workers/
│   ├── __init__.py
│   ├── scraping_worker.py    # NEW: Celery task for executing scraper runs
│   └── webhook_worker.py     # NEW: Celery task for dispatching webhooks
├── services/task_manager.py  # MODIFY: replace asyncio tasks → celery.delay()
└── requirements.txt          # ADD: celery[redis]>=5.3, flower
```

**Implementation steps:**
1. `celery_app.py` — create Celery instance pointing at `REDIS_URL`
2. `workers/scraping_worker.py` — move `execute_scraping_job()` from `routes_legacy.py` into a `@celery_app.task(bind=True)` decorated function
3. Modify `routes/runs.py` — instead of `task_manager.start_task(...)` call `scraping_worker.delay(run_id, actor_id, user_id, input_data)`
4. Update `services/task_manager.py` — track Celery task IDs in Redis instead of asyncio task objects
5. Update Docker Compose — add `celery_worker` and `flower` services
6. Update startup event in `server.py` — remove asyncio subprocess Redis start, use docker service

**Environment variables to add:**
```env
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
CELERY_CONCURRENCY=4
```

**Verification:** Start a run → kill FastAPI process → restart → run should still complete (worker keeps running). Check Flower dashboard at `localhost:5555`.

---

### Phase 1.2 — Persistent Scheduler (Redis + APScheduler)

**Problem:** `SchedulerService` uses `MemoryJobStore` — all cron schedules are **lost** on server restart.

**Solution:** Switch to `RedisJobStore` so schedules survive restarts.

**Files to modify:**
```
backend/services/scheduler_service.py   # MODIFY: swap MemoryJobStore → RedisJobStore
```

**Code change:**
```python
# Before
from apscheduler.jobstores.memory import MemoryJobStore
jobstores = {'default': MemoryJobStore()}

# After
from apscheduler.jobstores.redis import RedisJobStore
jobstores = {
    'default': RedisJobStore(
        host=os.environ['REDIS_HOST'],
        port=int(os.environ.get('REDIS_PORT', 6379)),
        db=2  # dedicated DB for scheduler
    )
}
```

**Additional change:** When `_execute_scheduled_run` fires, dispatch via Celery (Phase 1.1) instead of `task_manager.start_task()`.

**Verification:** Add a schedule → restart server → check schedule still fires at correct time.

---

### Phase 1.3 — Run Concurrency Limits & Priority Queue

**Problem:** No enforcement of plan-based concurrent run limits.

**Solution:** Use Celery routing with priority queues + enforce at run creation time.

**Files to create/modify:**
```
backend/workers/queue_config.py         # NEW: Celery queue definitions
backend/routes/runs.py                  # MODIFY: check concurrent run count before dispatch
```

**Queues to define:**
- `high_priority` — paid plans (Pro/Business)
- `default` — free tier
- `scheduled` — scheduler-triggered runs

**Limit enforcement in `POST /api/runs`:**
```python
running_count = await db.runs.count_documents({
    "user_id": current_user["id"],
    "status": {"$in": ["queued", "running"]}
})
plan_limit = current_user["limits"]["concurrent_runs"]  # already in User model
if running_count >= plan_limit:
    raise HTTPException(429, "Concurrent run limit reached")
```

---

## ⚡ Phase 2 — Storage Layer Expansion

> **Goal:** Implement Apify's two primary storage backends: Key-Value Store and Request Queue.

### Phase 2.1 — Key-Value Store

**What:** Generic storage for screenshots, HTML snapshots, binary blobs, JSON data — persisted per-run or globally.

**Files to create:**
```
backend/
├── routes/storage_routes.py     # NEW: KV store API endpoints
├── services/kv_store_service.py # NEW: CRUD logic + GridFS for large files
└── models/kv_store.py           # NEW: Pydantic model
```

**MongoDB collections:**
```python
# kv_stores collection (metadata)
{
  "id": str,          # store ID
  "user_id": str,
  "run_id": str,      # optional, links to run
  "name": str,        # e.g. "OUTPUT", "SCREENSHOT"
  "created_at": datetime
}

# kv_store_items collection
{
  "store_id": str,
  "key": str,
  "value_type": str,  # "json" | "binary" | "text"
  "json_value": dict, # for JSON values
  "gridfs_id": str,   # for binary (images, HTML)
  "content_type": str,
  "size_bytes": int,
  "created_at": datetime
}
```

**API Endpoints:**
```
POST   /api/storage/kv-stores              # Create store
GET    /api/storage/kv-stores              # List user's stores
GET    /api/storage/kv-stores/{id}/records # List keys
GET    /api/storage/kv-stores/{id}/records/{key}  # Get value
PUT    /api/storage/kv-stores/{id}/records/{key}  # Set value
DELETE /api/storage/kv-stores/{id}/records/{key}  # Delete key
```

**Actor SDK Integration:** Actors can call `SCRAPI_KV_STORE_URL` env var to push screenshots/HTML during execution.

---

### Phase 2.2 — Request Queue

**What:** URL deduplication + crawl state management for actors (enables resumable crawls).

**Files to create:**
```
backend/
├── routes/queue_routes.py          # NEW: Request queue API
├── services/request_queue_service.py # NEW: Queue logic
└── models/request_queue.py         # NEW: Pydantic model
```

**MongoDB collection:**
```python
# request_queues collection
{
  "id": str,
  "user_id": str,
  "run_id": str,
  "name": str,
  "total_count": int,
  "handled_count": int,
  "pending_count": int,
  "created_at": datetime
}

# request_queue_items collection
{
  "queue_id": str,
  "url": str,
  "unique_key": str,    # SHA256 of URL for dedup
  "method": str,        # GET, POST
  "headers": dict,
  "payload": dict,
  "retries": int,
  "status": str,        # pending, handled, failed
  "added_at": datetime,
  "handled_at": datetime
}
```

**API Endpoints:**
```
POST /api/storage/request-queues                    # Create queue
POST /api/storage/request-queues/{id}/requests      # Add URLs
GET  /api/storage/request-queues/{id}/head          # Get next URL to process
POST /api/storage/request-queues/{id}/requests/{key}/mark-handled
GET  /api/storage/request-queues/{id}               # Queue stats
```

---

## ⚡ Phase 3 — Webhooks & Event System

> **Goal:** Build an event-driven notification system so external systems can react to run status changes.

### Phase 3.1 — Webhook Core (CRUD + Dispatch)

**Files to create:**
```
backend/
├── routes/webhook_routes.py         # NEW: Webhook management endpoints
├── services/webhook_service.py      # NEW: Delivery logic (httpx, retry, signing)
├── workers/webhook_worker.py        # NEW: Celery async delivery task
└── models/webhook.py                # NEW: Webhook model
```

**MongoDB collection:**
```python
{
  "id": str,
  "user_id": str,
  "actor_id": str,          # null = global (all actors)
  "url": str,               # Target URL
  "events": List[str],      # ["run.succeeded", "run.failed", "run.aborted"]
  "secret": str,            # HMAC-SHA256 signing secret
  "is_enabled": bool,
  "failure_count": int,
  "last_status": int,       # Last HTTP response code
  "created_at": datetime
}
```

**Events system:** After every run status change in `execute_scraping_job`, emit event:
```python
# In scraping_worker.py, after run completes:
await webhook_service.dispatch_event("run.succeeded", run_id, actor_id, user_id)
```

**Delivery with retry:** Celery task with `max_retries=3`, exponential backoff. HMAC-SHA256 signature in `X-Scrapi-Signature` header.

**API Endpoints:**
```
POST   /api/webhooks           # Create webhook
GET    /api/webhooks           # List
PATCH  /api/webhooks/{id}      # Update
DELETE /api/webhooks/{id}      # Delete
POST   /api/webhooks/{id}/test # Send test ping
```

---

### Phase 3.2 — Actor Chaining (Metamorph)

**What:** Allow one actor's output to trigger another actor as input (pipeline building).

**Files to create:**
```
backend/
├── routes/pipeline_routes.py      # NEW: Pipeline/chain management
├── services/pipeline_service.py   # NEW: Chain execution logic
└── models/pipeline.py             # NEW: Pipeline model
```

**MongoDB collection:**
```python
{
  "id": str,
  "user_id": str,
  "name": str,
  "steps": [
    {
      "order": 1,
      "actor_id": str,
      "input_mapping": dict,   # Maps prev output fields → this input
      "condition": str         # optional: only run if condition met
    }
  ],
  "is_enabled": bool,
  "created_at": datetime
}
```

---

## ⚡ Phase 4 — API Keys & Developer Access

> **Goal:** Let users authenticate via personal API tokens (not just JWT) so external tools and CLIs can access the platform.

### Phase 4.1 — API Key Management

**Problem:** Currently only JWT (session-based) auth exists. No API key auth for external integrations.

**Files to modify/create:**
```
backend/
├── routes/api_keys_routes.py    # NEW: CRUD for API keys
├── models/api_key.py            # EXISTS (668 bytes) — enhance with scopes + expiry
├── auth/__init__.py             # MODIFY: add API key extraction to dependency
└── middleware/                  # MODIFY: add API key auth middleware
```

**Model enhancement:**
```python
class APIKey(BaseModel):
    id: str
    user_id: str
    name: str                        # e.g. "CI/CD Pipeline Key"
    key_hash: str                    # bcrypt hash of actual key
    key_prefix: str                  # First 8 chars for display: "sk-abc12..."
    scopes: List[str]                # ["runs:read", "runs:write", "datasets:read"]
    expires_at: Optional[datetime]   # None = never
    last_used_at: Optional[datetime]
    usage_count: int = 0
    is_active: bool = True
    created_at: datetime
```

**Auth flow:** Add to `get_current_user` dependency:
```python
# Try JWT first, then API key from X-API-Key header
api_key_header = request.headers.get("X-API-Key")
if api_key_header:
    user = await verify_api_key(api_key_header, db)
    return user
```

**API Endpoints:**
```
POST   /api/auth/api-keys          # Create key → returns full key ONCE
GET    /api/auth/api-keys          # List (never returns full key)
DELETE /api/auth/api-keys/{id}     # Revoke
```

---

### Phase 4.2 — Rate Limiting Per API Key

**Files to create:**
```
backend/middleware/rate_limiter.py   # NEW: Redis-based sliding window rate limiter
```

**Implementation:** Use Redis `INCR` + `EXPIRE` pattern. Limits vary by plan:
```
Free:    60 req/min,  500 req/hour
Pro:     300 req/min, 5000 req/hour
Business: 1000 req/min, unlimited
```

Apply as FastAPI middleware — inspect `X-API-Key` or JWT, look up user plan, enforce limits.

---

## ⚡ Phase 5 — Actor Versioning & Build System

> **Goal:** Enable semantic versioning of actors with build history — like Apify's build system.

### Phase 5.1 — Actor Versions Model

**Files to create/modify:**
```
backend/
├── models/actor_version.py       # NEW
├── routes/actor_versions.py      # NEW: Version management endpoints  
└── models/actor.py               # MODIFY: add current_version field
```

**MongoDB collection:**
```python
# actor_versions collection
{
  "id": str,
  "actor_id": str,
  "version": str,          # "1.0.0", "1.0.1"
  "source_code": str,      # Python/JS source
  "dockerfile": str,       # optional
  "input_schema": dict,
  "env_vars": List[dict],  # [{name, value, is_secret}]
  "build_status": str,     # "pending" | "building" | "ready" | "failed"
  "build_log": List[str],
  "is_default": bool,
  "created_at": datetime
}
```

**API Endpoints:**
```
POST /api/actors/{id}/versions          # Create new version
GET  /api/actors/{id}/versions          # List versions
GET  /api/actors/{id}/versions/{ver}    # Get specific version
POST /api/actors/{id}/versions/{ver}/set-default
```

---

### Phase 5.2 — Actor Environment Variables (Secrets)

**Files to create:**
```
backend/
├── services/secrets_service.py     # NEW: AES-256 encrypted secret storage
└── routes/actor_env_routes.py      # NEW: Env var CRUD
```

**MongoDB collection:**
```python
# actor_env_vars collection
{
  "actor_id": str,
  "name": str,                # e.g. "OPENAI_API_KEY"
  "encrypted_value": bytes,   # AES-256-GCM encrypted
  "is_secret": bool,          # True = never returned in API responses
  "created_at": datetime
}
```

**Encryption:** Use Python `cryptography` library, Fernet symmetric encryption. Key stored in `ENCRYPTION_KEY` env var.

**Injection:** When `execute_scraping_job` runs, decrypt env vars and inject into scraper subprocess `os.environ`.

---

## ⚡ Phase 6 — Real-Time Log Streaming

> **Goal:** Stream actor run logs to the frontend in real time (like Apify's live log view).

### Phase 6.1 — Server-Sent Events (SSE) Log Stream

**Files to create/modify:**
```
backend/
├── routes/log_streaming_routes.py  # NEW: SSE endpoint for log stream
└── workers/scraping_worker.py      # MODIFY: publish logs to Redis channel
```

**Architecture:**
1. During `execute_scraping_job`, publish each log line to a Redis Pub/Sub channel: `run_logs:{run_id}`
2. SSE endpoint subscribes to that channel and streams to browser

**SSE Endpoint:**
```python
@router.get("/api/runs/{run_id}/logs/stream")
async def stream_logs(run_id: str, current_user = Depends(get_current_user)):
    async def event_generator():
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"run_logs:{run_id}")
        async for message in pubsub.listen():
            if message["type"] == "message":
                yield f"data: {message['data']}\n\n"
    return EventSourceResponse(event_generator())
```

**Frontend:** Update `RunDetail` page to use `EventSource` API instead of polling.

---

## ⚡ Phase 7 — Horizontal Scaling & Infrastructure

> **Goal:** Make Scrapi deployable across multiple nodes behind a load balancer.

### Phase 7.1 — Stateless API Layer

**Problem:** Several things are stored in process memory (task locks, captcha service state). Must be moved to Redis.

**Changes:**
- `TaskManager`: replace `self.running_tasks: Dict` → Redis hash `running_tasks`
- `SecurityService`: already uses MongoDB — good
- `CaptchaService`: already uses MongoDB — good
- Session store: move to Redis if any local session storage

---

### Phase 7.2 — Docker Compose → Kubernetes-Ready

**Files to create/modify:**
```
docker-compose.yml              # MODIFY: add celery_worker, flower, nginx
k8s/                            # NEW: Kubernetes manifests
├── api-deployment.yaml
├── worker-deployment.yaml
├── scheduler-deployment.yaml
├── redis-statefulset.yaml
├── mongodb-statefulset.yaml
└── ingress.yaml
```

**Services in updated docker-compose:**
```yaml
services:
  api:          # FastAPI - scale horizontally
  celery_worker: # Scraping workers - scale based on queue depth
  celery_beat:   # Scheduler (single instance only)
  flower:        # Celery monitoring UI
  redis:         # Broker + cache
  mongodb:       # Primary DB
  nginx:         # Load balancer / reverse proxy
```

**Scaling rule:** `celery_worker` can be scaled independently: `docker compose up --scale celery_worker=8`

---

### Phase 7.3 — MongoDB Read Replicas & Indexing Audit

**Problem:** No explicit MongoDB indexes defined in code — will be slow at scale.

**Files to create:**
```
backend/scripts/create_indexes.py   # NEW: Index creation script
```

**Critical indexes:**
```python
# runs collection
await db.runs.create_index([("user_id", 1), ("status", 1), ("created_at", -1)])
await db.runs.create_index([("actor_id", 1), ("status", 1)])

# dataset_items collection  
await db.dataset_items.create_index([("dataset_id", 1), ("created_at", 1)])
await db.dataset_items.create_index([("run_id", 1)])

# actors collection
await db.actors.create_index([("status", 1), ("is_public", 1), ("category", 1)])

# schedules collection
await db.schedules.create_index([("is_enabled", 1), ("next_run", 1)])

# kv_store_items collection
await db.kv_store_items.create_index([("store_id", 1), ("key", 1)], unique=True)

# request_queue_items collection
await db.rq_items.create_index([("queue_id", 1), ("status", 1), ("added_at", 1)])
await db.rq_items.create_index([("queue_id", 1), ("unique_key", 1)], unique=True)
```

---

## ⚡ Phase 8 — Actor SDK & CLI

> **Goal:** Enable developers to build Scrapi actors locally and push them.

### Phase 8.1 — Python Actor SDK

**Files to create:**
```
scrapi-sdk/                     # NEW: Separate package
├── setup.py
├── scrapi/
│   ├── __init__.py
│   ├── actor.py                # Actor base class
│   ├── dataset.py              # Dataset push helpers
│   ├── kv_store.py             # KV store helpers
│   ├── request_queue.py        # Request queue helpers
│   ├── proxy.py                # Proxy configuration helpers
│   └── config.py               # Read from SCRAPI_* env vars
```

**Actor SDK contract:**
```python
import scrapi

async def main():
    async with scrapi.Actor() as actor:
        # Read input
        input_data = await actor.get_input()
        
        # Push to dataset
        await actor.push_data({"key": "value"})
        
        # Use KV store
        await actor.set_value("OUTPUT", {"results": [...]})
        
        # Use request queue
        queue = await actor.open_request_queue()
        await queue.add_request({"url": "https://example.com"})
        
        # Log
        actor.log.info("Scraping started...")

scrapi.Actor.main(main)
```

---

### Phase 8.2 — CLI Tool (`scrapi-cli`)

**Files to create:**
```
scrapi-cli/                     # NEW: Separate package
├── setup.py
├── scrapi_cli/
│   ├── __init__.py
│   ├── main.py                 # Click CLI entry point
│   ├── commands/
│   │   ├── auth.py             # login, logout, whoami
│   │   ├── actors.py           # actor ls, actor push, actor pull
│   │   ├── runs.py             # run start, run get, run logs, run abort
│   │   └── datasets.py         # dataset get, dataset export
```

**Commands:**
```bash
scrapi login                         # Authenticate, save token
scrapi actor push                    # Push local actor to platform
scrapi run start <actor-id>          # Start a run
scrapi run logs <run-id> --follow    # Stream logs
scrapi dataset export <id> --format csv
```

---

## ⚡ Phase 9 — Marketplace & Monetization

### Phase 9.1 — Actor Reviews & Ratings (Functional)

**Problem:** Rating field exists in Actor model but no review collection/endpoints exist.

**Files to create:**
```
backend/
├── routes/review_routes.py     # NEW
└── models/review.py            # NEW
```

**MongoDB collection:**
```python
{
  "id": str,
  "actor_id": str,
  "user_id": str,
  "rating": int,       # 1-5
  "title": str,
  "body": str,
  "helpful_count": int,
  "is_verified": bool, # True if user has actually run the actor
  "created_at": datetime
}
```

---

### Phase 9.2 — Pay-Per-Run Monetization

**Files to modify:**
```
backend/
├── services/billing_service.py     # MODIFY: add actor revenue tracking
├── routes/billing_routes.py        # MODIFY: creator payout endpoints
└── models/billing.py               # MODIFY: add ActorEarnings model
```

**Flow:**
1. Actor creator sets price per 1000 results (e.g. $0.50)
2. On run completion, calculate `cost = results_count / 1000 * price_per_thousand`
3. Charge consumer via Stripe (existing billing service)
4. Credit 70% to creator's account balance
5. Payout via Stripe Connect (monthly threshold)

---

## ⚡ Phase 10 — Observability & Monitoring

### Phase 10.1 — Structured Metrics Collection

**Files to create:**
```
backend/
├── services/metrics_service.py     # NEW: actor/run stats aggregation
└── routes/metrics_routes.py        # NEW: metrics API
```

**Metrics to track per actor:**
- Total runs, success rate, avg duration
- P50/P95/P99 duration
- Total results scraped
- Error breakdown by type

**Implementation:** MongoDB aggregation pipeline triggered on run completion, results stored in `actor_stats` collection.

---

### Phase 10.2 — Performance Monitoring (CPU/Memory per Run)

**Files to modify:**
```
backend/workers/scraping_worker.py  # MODIFY: sample resource usage during execution
```

**Method:** Use Python `psutil` to sample CPU/memory every 5 seconds during scraping execution. Store samples in `run_metrics` collection. Display as sparkline charts in Run Detail page.

---

## ⚡ Phase 11 — True Docker-Per-Run Actor Isolation (Apify's Core Model)

> **Goal:** Execute every actor run inside its own Docker container — full process, filesystem, and network isolation. This is how Apify actually works.

### Phase 11.1 — Docker Executor Service

**What:** When a run is triggered, instead of calling a Python function, spin up a Docker container with the actor's image, pass input via env vars, and collect results via the Scrapi API.

**Files to create:**
```
backend/
├── services/docker_executor.py       # NEW: Docker container lifecycle manager
├── workers/docker_run_worker.py      # NEW: Celery task that orchestrates container runs
└── routes/actor_build_routes.py      # NEW: Build trigger + status endpoints
```

**How it works:**
```
User triggers run
       ↓
Celery worker picks up task
       ↓
docker_executor.run_actor_container(
    image="scrapi-actor-{actor_id}:{version}",
    env={
        "SCRAPI_TOKEN": run_token,          # temp auth token for this run
        "SCRAPI_RUN_ID": run_id,
        "SCRAPI_INPUT": json.dumps(input),
        "SCRAPI_API_URL": "https://api.scrapi.io",
        "SCRAPI_DATASET_ID": dataset_id,
    },
    memory_limit="1g",     # from plan limits
    cpu_quota=50000,        # 50% of one CPU
    timeout=3600            # 1 hour max
)
       ↓
Container runs actor code using Scrapi SDK
Actor calls POST /api/runs/{id}/push-data    ← results streamed in real time
Actor calls POST /api/runs/{id}/set-status   ← status updates
       ↓
Container exits (0 = success, non-zero = failed)
       ↓
docker_executor.cleanup_container()
```

**Python implementation sketch:**
```python
import docker
import asyncio

class DockerExecutor:
    def __init__(self):
        self.client = docker.from_env()

    async def run_actor(self, image: str, env: dict, limits: dict, run_id: str):
        container = self.client.containers.run(
            image=image,
            environment=env,
            mem_limit=limits["memory"],
            nano_cpus=limits["cpu_nano"],
            network_mode="bridge",
            detach=True,
            remove=False,           # keep for log retrieval
            labels={"scrapi_run_id": run_id}
        )
        # Stream logs to Redis pub/sub for SSE
        for log_line in container.logs(stream=True, follow=True):
            await redis.publish(f"run_logs:{run_id}", log_line.decode())

        result = container.wait()
        exit_code = result["StatusCode"]
        container.remove()
        return exit_code
```

**Run token system:** Each run gets a short-lived JWT (1hr TTL) scoped only to that run's resources — so the container can call back to the API safely.

---

### Phase 11.2 — Actor Image Registry

**What:** Store built Docker images in a private registry. Each actor version = one image tag.

**Options (pick one):**
| Registry | Cost | Self-hosted? |
|---|---|---|
| Docker Hub (private) | $5/mo | No |
| GitHub Container Registry | Free for public | No |
| Self-hosted Harbor | Free | Yes |
| AWS ECR | ~$0.10/GB | No |

**Files to create:**
```
backend/
├── services/registry_service.py    # NEW: push/pull/delete image operations
└── config/registry.py              # NEW: registry URL + auth config
```

**ENV vars to add:**
```env
DOCKER_REGISTRY_URL=registry.scrapi.io
DOCKER_REGISTRY_USER=scrapi
DOCKER_REGISTRY_PASSWORD=<secret>
```

---

### Phase 11.3 — Fallback: Subprocess Isolation (Intermediate Step)

> If full Docker-per-run is too heavy initially, use this as a **stepping stone**.

**What:** Instead of Docker containers, run actors as **isolated subprocesses** with resource limits.

```python
import subprocess, resource

proc = subprocess.Popen(
    ["python", "actor_script.py"],
    env={**os.environ, **actor_env_vars},
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    preexec_fn=lambda: resource.setrlimit(
        resource.RLIMIT_AS, (512*1024*1024, 512*1024*1024)  # 512MB RAM limit
    )
)
```

**Pros:** Simple, no Docker daemon needed.  
**Cons:** Not as isolated as containers, no custom Dockerfiles.

**Recommendation:** Implement 11.3 first (2 days), then graduate to 11.1 (5 days) once SDK is ready.

---

## ⚡ Phase 12 — Actor Build Pipeline (CI/CD for Actors)

> **Goal:** When a user pushes actor code, automatically build a Docker image and make it available for execution — like Apify's build system.

### Phase 12.1 — Build Queue & Builder Service

**Files to create:**
```
backend/
├── services/build_service.py         # NEW: Orchestrates Docker image builds
├── workers/build_worker.py           # NEW: Celery build task
└── models/build.py                   # EXISTS (stub) → fully implement
```

**Build flow:**
```
User pushes code via API or CLI (scrapi actor push)
       ↓
POST /api/actors/{id}/builds
       ↓
Build Celery task queued (separate "build" queue)
       ↓
build_worker:
  1. Pull base image (FROM scrapi/actor-base:latest)
  2. docker build -t scrapi-actor-{id}:{version} .
  3. Stream build logs → Redis → SSE to frontend
  4. On success: push to registry → update actor_version.build_status = "ready"
  5. On failure: store error logs → build_status = "failed"
```

**Base Docker image** (`scrapi/actor-base:latest`):
```dockerfile
FROM python:3.11-slim
RUN pip install scrapi-sdk playwright
RUN playwright install chromium --with-deps
WORKDIR /actor
COPY . .
CMD ["python", "main.py"]
```

**Build API endpoints:**
```
POST /api/actors/{id}/builds              # Trigger build
GET  /api/actors/{id}/builds             # List builds
GET  /api/actors/{id}/builds/{build_id}   # Get build + logs
GET  /api/actors/{id}/builds/{build_id}/log/stream  # SSE build log stream
```

---

### Phase 12.2 — Git Integration (Push-to-Deploy)

**What:** Users link a GitHub/GitLab repo to their actor. Any push to `main` automatically triggers a build.

**Files to create:**
```
backend/
├── routes/git_integration_routes.py    # NEW: GitHub webhook receiver
└── services/git_service.py             # NEW: clone repo, parse code
```

**Flow:**
```
GitHub push to main branch
       ↓
POST /api/actors/{id}/git-webhook
       ↓
Verify GitHub webhook signature (X-Hub-Signature-256)
       ↓
Clone repo → trigger build → deploy new version
```

---

## ⚡ Phase 13 — Auto-Scaling Workers

> **Goal:** Automatically scale the number of Celery workers based on queue depth — just like Apify scales containers based on run demand.

### Phase 13.1 — Queue-Depth Based Auto-Scaling

**Files to create:**
```
backend/
├── services/autoscaler_service.py     # NEW: Scale workers based on queue depth
└── scripts/autoscale_loop.py          # NEW: Background daemon
```

**Algorithm:**
```python
async def autoscale_loop():
    while True:
        queue_depth = await get_celery_queue_depth("default")
        running_workers = get_running_worker_count()

        desired = min(MAX_WORKERS, max(MIN_WORKERS, queue_depth // TASKS_PER_WORKER))

        if desired > running_workers:
            scale_up(desired - running_workers)
        elif desired < running_workers:
            scale_down(running_workers - desired)

        await asyncio.sleep(30)  # check every 30s
```

**Scaling backends:**
| Environment | Scale Mechanism |
|---|---|
| Docker Compose | `docker compose up --scale celery_worker=N` |
| Kubernetes | Patch `Deployment.spec.replicas` via K8s API |
| AWS ECS | Update ECS service desired count |

---

### Phase 13.2 — KEDA (Kubernetes Event-Driven Autoscaling)

**What:** If deploying on Kubernetes, use KEDA to auto-scale Celery workers based on Redis queue length — fully automatic, no daemon needed.

**Files to create:**
```
k8s/
├── keda-scaledobject.yaml    # NEW: KEDA ScaledObject for celery_worker
└── keda-triggerauthentication.yaml
```

**KEDA config:**
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: celery-worker-scaler
spec:
  scaleTargetRef:
    name: celery-worker
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: redis
    metadata:
      address: redis:6379
      listName: celery      # Celery default queue
      listLength: "5"       # scale up when 5+ tasks per replica
```

**Result:** Workers auto-scale from 1→50 pods automatically. Zero manual intervention.

---

## ⚡ Phase 14 — Cloud Storage Export & Dataset Streaming

> **Goal:** Let users export datasets directly to S3, GCS, or Azure — and stream results in real time as actors run.

### Phase 14.1 — Cloud Export (S3, GCS, Azure)

**Files to create:**
```
backend/
├── services/cloud_export_service.py   # NEW: boto3, google-cloud-storage, azure-storage-blob
└── routes/export_routes.py            # NEW: Export trigger endpoints
```

**Supported destinations:**
```python
EXPORT_PROVIDERS = {
    "s3":    S3Exporter,      # boto3
    "gcs":   GCSExporter,     # google-cloud-storage
    "azure": AzureExporter,   # azure-storage-blob
    "drive": GoogleDriveExporter,  # google-api-python-client
}
```

**API Endpoints:**
```
POST /api/datasets/{id}/export/cloud
Body: {
  "provider": "s3",
  "bucket": "my-bucket",
  "key_prefix": "scrapi-exports/",
  "credentials": { "access_key": "...", "secret_key": "..." },
  "format": "json"  // or "csv", "jsonl"
}
```

**Async export:** Dispatch as Celery task, notify via webhook when complete.

---

### Phase 14.2 — Real-Time Dataset Streaming (WebSocket)

**What:** As an actor pushes data, stream each result to the frontend in real time — no polling.

**Files to create:**
```
backend/
└── routes/dataset_stream_routes.py    # NEW: WebSocket endpoint
```

**Implementation:**
```python
@router.websocket("/api/datasets/{id}/stream")
async def dataset_stream(websocket: WebSocket, dataset_id: str):
    await websocket.accept()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"dataset_items:{dataset_id}")
    async for message in pubsub.listen():
        if message["type"] == "message":
            await websocket.send_text(message["data"])
```

**Actor SDK integration:** When actor calls `actor.push_data(item)`, the API publishes to `dataset_items:{dataset_id}` Redis channel simultaneously.

---

## ⚡ Phase 15 — Team RBAC & Enterprise Features

> **Goal:** Full role-based access control within organizations — who can run actors, who can see datasets, who can manage billing.

### Phase 15.1 — Team Roles & Permissions

**Current state:** Organizations exist (`organization_routes.py`, `organization.py` model) but all members have equal access.

**Files to modify/create:**
```
backend/
├── models/organization.py           # MODIFY: add member roles
├── services/rbac_service.py         # NEW: permission check helpers
└── middleware/rbac_middleware.py    # NEW: route-level permission enforcement
```

**Role definitions:**
```python
ROLES = {
    "owner":     ["*"],                                    # Full access
    "admin":     ["actors:*", "runs:*", "datasets:*", "billing:read"],
    "developer": ["actors:read", "actors:write", "runs:*", "datasets:*"],
    "analyst":   ["runs:read", "datasets:read", "datasets:export"],
    "viewer":    ["actors:read", "runs:read", "datasets:read"],
}
```

**Permission check decorator:**
```python
@require_permission("runs:write")
async def create_run(current_user, org_id):
    ...
```

---

### Phase 15.2 — Input Schema Auto-Generated UI

**What:** Actors define a JSON Schema for their inputs, and the platform auto-generates a form UI — exactly like Apify's actor input forms.

**Files to create:**
```
frontend/src/components/
└── ActorInputForm.js    # NEW: Dynamic form from JSON schema

backend/
└── services/schema_validator.py    # NEW: Validate run input against actor schema
```

**Schema → Form mapping:**
```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "title": "Start URL",
      "editor": "textfield",
      "description": "The URL to start scraping from"
    },
    "max_pages": {
      "type": "integer",
      "title": "Max Pages",
      "editor": "number",
      "default": 100,
      "minimum": 1,
      "maximum": 10000
    },
    "proxy_config": {
      "type": "object",
      "title": "Proxy Configuration",
      "editor": "proxy"
    }
  }
}
```

**Frontend renders** a fully interactive form from this schema — no hardcoded UI per actor.

---

### Phase 15.3 — SSO (Single Sign-On)

**Files to create:**
```
backend/
├── services/sso_service.py          # NEW: SAML 2.0 + OAuth provider
└── routes/sso_routes.py             # NEW: SSO callback endpoints
```

**Supported providers:**
- Google Workspace (OAuth 2.0) — already partially built (`google_auth.py`)
- GitHub (OAuth 2.0) — already partially built (`github_auth.py`)  
- SAML 2.0 (Okta, Azure AD, any enterprise IdP) — **NEW**

---

## 📊 Complete Priority & Timeline Summary (All Phases)

| Phase | Sub-Phase | Priority | Est. Days | Requires |
|---|---|---|---|---|
| 1 | 1.1 Celery Worker Queue | 🔴 CRITICAL | 3 | — |
| 1 | 1.2 Persistent Scheduler | 🔴 CRITICAL | 1 | 1.1 |
| 1 | 1.3 Concurrency Limits | 🔴 CRITICAL | 1 | — |
| 2 | 2.1 Key-Value Store | 🔴 CRITICAL | 3 | — |
| 2 | 2.2 Request Queue | 🔴 CRITICAL | 3 | — |
| 3 | 3.1 Webhooks | 🟠 HIGH | 3 | 1.1 |
| 3 | 3.2 Actor Chaining | 🟡 MEDIUM | 4 | 3.1 |
| 4 | 4.1 API Keys | 🟠 HIGH | 2 | — |
| 4 | 4.2 Rate Limiting | 🟠 HIGH | 2 | 4.1 |
| 5 | 5.1 Actor Versioning | 🟠 HIGH | 3 | — |
| 5 | 5.2 Actor Env Secrets | 🟠 HIGH | 2 | — |
| 6 | 6.1 SSE Log Streaming | 🟠 HIGH | 2 | 1.1 |
| 7 | 7.1 Stateless API | 🔴 CRITICAL | 2 | — |
| 7 | 7.2 Docker/K8s | 🔴 CRITICAL | 4 | 7.1 |
| 7 | 7.3 MongoDB Indexes | 🟠 HIGH | 1 | — |
| 8 | 8.1 Python SDK | 🟠 HIGH | 5 | 2.1, 2.2 |
| 8 | 8.2 CLI Tool | 🟡 MEDIUM | 4 | 4.1 |
| 9 | 9.1 Actor Reviews | 🟡 MEDIUM | 2 | — |
| 9 | 9.2 Monetization | 🟡 MEDIUM | 7 | billing |
| 10 | 10.1 Metrics | 🟡 MEDIUM | 3 | — |
| 10 | 10.2 Perf Monitoring | 🟡 LOW | 3 | 10.1 |
| **11** | **11.1 Docker Executor** | **🔴 CRITICAL** | **5** | **1.1, 8.1** |
| **11** | **11.2 Image Registry** | **🔴 CRITICAL** | **2** | **11.1** |
| **11** | **11.3 Subprocess Isolation** | **🔴 CRITICAL** | **2** | **1.1** |
| **12** | **12.1 Build Pipeline** | **🔴 CRITICAL** | **4** | **11.1, 5.1** |
| **12** | **12.2 Git Integration** | **🟠 HIGH** | **3** | **12.1** |
| **13** | **13.1 Auto-Scaling Workers** | **🔴 CRITICAL** | **3** | **1.1** |
| **13** | **13.2 KEDA K8s Scaling** | **🟠 HIGH** | **2** | **7.2, 13.1** |
| **14** | **14.1 Cloud Export S3/GCS** | **🟠 HIGH** | **3** | **—** |
| **14** | **14.2 Dataset WebSocket Stream** | **🟠 HIGH** | **2** | **1.1** |
| **15** | **15.1 Team RBAC** | **🟠 HIGH** | **4** | **—** |
| **15** | **15.2 Input Schema UI** | **🟠 HIGH** | **4** | **5.1** |
| **15** | **15.3 SSO (SAML)** | **🟡 MEDIUM** | **4** | **—** |

**Total Estimate: ~105 development days (~21 weeks / 5 months)**

---

## 🗓️ Updated Sprint Plan

### Sprint 1 (Week 1-2): Distributed Execution Foundation
- 1.1 Celery + 1.2 Persistent Scheduler + 1.3 Limits + 7.1 Stateless + 7.3 Indexes

### Sprint 2 (Week 3-4): Storage & APIs
- 2.1 KV Store + 2.2 Request Queue + 4.1 API Keys + 4.2 Rate Limiting

### Sprint 3 (Week 5-6): Actor Features & Streaming
- 5.1 Versioning + 5.2 Secrets + 6.1 SSE Logs + 3.1 Webhooks

### Sprint 4 (Week 7-9): Docker Isolation (The Apify Core)
- 11.3 Subprocess Isolation → 11.1 Docker Executor → 11.2 Image Registry

### Sprint 5 (Week 10-12): Build Pipeline & SDK
- 12.1 Build Pipeline + 8.1 Python SDK + 8.2 CLI + 12.2 Git Integration

### Sprint 6 (Week 13-14): Auto-Scaling & Infrastructure
- 7.2 Kubernetes + 13.1 Auto-scaling + 13.2 KEDA

### Sprint 7 (Week 15-16): Data & Exports
- 14.1 Cloud Export + 14.2 WebSocket Streaming + 10.1 Metrics + 10.2 Perf

### Sprint 8 (Week 17-18): Enterprise & Marketplace
- 15.1 RBAC + 15.2 Input Schema UI + 9.1 Reviews + 9.2 Monetization

### Sprint 9 (Week 19-21): Hardening, QA & Launch
- 15.3 SSO + 3.2 Chaining + load testing + security audit + documentation

---

## 🏗️ Final Target Architecture (Full Apify Parity)

```
                        ┌─────────────────────────────┐
                        │     SCRAPI PLATFORM          │
                        │                              │
  Browser/CLI ─────────▶│  Nginx (Load Balancer)       │
                        │       ↓                      │
                        │  FastAPI Cluster (3+ pods)   │
                        │       ↓                      │
                        │  Redis (Broker + Cache)      │
                        │       ↓                      │
   ┌────────────────────▼──────────────────────┐       │
   │            Celery Workers                 │       │
   │  ┌──────────┐  ┌──────────┐  ┌─────────┐ │       │
   │  │ Scraping │  │ Webhooks │  │ Builder │ │       │
   │  │ Worker   │  │ Worker   │  │ Worker  │ │       │
   │  └────┬─────┘  └──────────┘  └────┬────┘ │       │
   └───────┼────────────────────────────┼──────┘       │
           ↓                            ↓              │
   ┌───────────────┐          ┌──────────────────┐     │
   │ Docker Engine │          │  Image Registry  │     │
   │               │          │ (Harbor/ECR)     │     │
   │  ┌──────────┐ │          └──────────────────┘     │
   │  │ Actor    │ │                                    │
   │  │Container │ │◀── SCRAPI_TOKEN (run-scoped JWT)   │
   │  │ (1 run)  │ │                                    │
   │  └────┬─────┘ │    Calls back to API:              │
   └───────┼───────┘    POST /api/runs/{id}/push-data   │
           │            POST /api/runs/{id}/set-status   │
           ↓                                            │
   MongoDB (results) + Redis PubSub (live logs)        │
           ↓                                            │
   Frontend receives results via WebSocket/SSE ────────┘

   KEDA monitors Redis queue depth
   → auto-scales Celery workers 1→50 pods automatically
```

---

## 🔧 Quick Wins (This Week — Zero Risk)

1. **MongoDB indexes** (7.3) — 1 day, instant perf boost
2. **Concurrency limit check** (1.3) — 1 day, just a DB count
3. **API key CRUD** (4.1) — 2 days
4. **Actor reviews** (9.1) — 2 days
5. **Subprocess isolation** (11.3) — 2 days, first step toward Docker exec

---

---

## ⚡ Phase 16 — Actor Tasks (Saved Run Configurations)

> **What Apify calls "Tasks":** A saved preset of inputs for an actor. Instead of re-entering inputs every time, users save a Task with pre-filled configuration and run it with one click. Tasks can also be scheduled independently of the actor definition.

### Phase 16.1 — Actor Task Model & CRUD

**Gap:** No concept of saved run configurations in the current codebase — users must re-enter all inputs on every run.

**Files to create:**
```
backend/
├── models/task.py              # NEW: ActorTask model
├── routes/task_routes.py       # NEW: Task CRUD + run-from-task
```

**MongoDB collection:**
```python
# actor_tasks collection
{
  "id": str,
  "user_id": str,
  "actor_id": str,
  "organization_id": str,       # optional
  "name": str,                  # e.g. "Daily NYC Restaurants Scrape"
  "description": str,
  "input_data": dict,           # pre-filled inputs (overrides actor defaults)
  "memory_mb": int,             # run memory override
  "timeout_secs": int,          # run timeout override
  "is_public": bool,
  "run_count": int,
  "last_run_id": str,
  "created_at": datetime
}
```

**API Endpoints:**
```
POST   /api/actors/{id}/tasks          # Create task for actor
GET    /api/actors/{id}/tasks          # List actor's tasks
GET    /api/tasks                      # All user tasks
GET    /api/tasks/{id}                 # Get task
PATCH  /api/tasks/{id}                 # Update task input/name
DELETE /api/tasks/{id}                 # Delete task
POST   /api/tasks/{id}/runs            # Run this task (creates a run with task's saved input)
GET    /api/tasks/{id}/runs            # Task run history
```

**Frontend:** "Tasks" tab on each actor detail page. "My Tasks" section in sidebar. One-click "Run Task" button.

**Schedule integration:** Tasks can be independently scheduled (Phase 1.2) — schedule a task, not just an actor.

---

## ⚡ Phase 17 — Actor Standby Mode (Always-On HTTP Server)

> **What Apify calls "Standby":** Instead of running and exiting, an actor can listen as an HTTP server and respond to requests in real time — like a serverless function but with full browser/Playwright access. Ideal for on-demand scraping APIs.

### Phase 17.1 — Standby Actor Execution Mode

**Gap:** All current runs are fire-and-forget batch jobs. No HTTP-server actor mode exists.

**How it works in Apify:**
```
Actor starts in standby mode
→ Platform keeps container alive
→ Requests to: GET https://api.apify.com/v2/acts/{id}/standby/...
→ Platform proxies request to running container
→ Container responds with scraped data
→ Container stays alive for next request
```

**Files to create:**
```
backend/
├── services/standby_service.py         # NEW: Container lifecycle manager for standby actors
├── routes/standby_routes.py            # NEW: HTTP proxy endpoint to standby containers
└── workers/standby_worker.py           # NEW: Maintain warm container pool
```

**Actor model addition:**
```python
# Add to actor.py model
"mode": str,          # "run" (default, current behavior) | "standby"
"standby_config": {
  "warmup_runs": int, # containers to keep warm
  "idle_timeout_secs": int,  # kill container after N seconds idle
  "max_concurrency": int     # max parallel requests per container
}
```

**Request routing:**
```
GET /api/actors/{id}/standby/{path}
→ StandbyService finds/starts warm container
→ Proxies HTTP request to container's internal server
→ Returns response to caller
→ Billing: per-second of standby time (not per-run)
```

**Use case example:** User builds a "Scrape any URL on demand" actor. Instead of creating a run each time, they call `GET /api/actors/my-scraper/standby?url=https://example.com` and get results in seconds.

---

## ⚡ Phase 18 — Managed Proxy Service

> **What Apify has:** A built-in, managed proxy network with datacenter IPs, residential IPs, and Google SERP proxies — billed per GB of traffic. Users don't need to source their own proxies.

### Phase 18.1 — Proxy Tiers & Traffic Billing

**Current state:** `proxy_manager.py` handles user-provided proxies with basic rotation. No managed/paid proxy pools exist.

**Gap:** No managed residential proxy pool, no per-GB billing for proxy traffic.

**Files to create:**
```
backend/
├── services/managed_proxy_service.py    # NEW: Managed proxy pool integration
├── routes/proxy_pool_routes.py          # NEW: Proxy pool selection API
```

**Proxy tier model:**
```python
PROXY_TIERS = {
  "datacenter": {
    "providers": ["brightdata", "oxylabs", "smartproxy"],
    "price_per_gb": 0.60,
    "countries": ["US", "EU", "ASIA"]
  },
  "residential": {
    "providers": ["brightdata", "oxylabs"],
    "price_per_gb": 8.00,
    "countries":  ["US", "GB", "DE", ...]  # 195+ countries
  },
  "google_serp": {
    "price_per_request": 0.001,
    "supported_countries": ["US", "UK", "DE", ...]
  }
}
```

**Actor input integration:** Actors specify `"proxyConfig": {"useApifyProxy": true, "proxyGroups": ["RESIDENTIAL"]}` → Scrapi SDK resolves to correct pool.

**Billing integration:** Track proxy GB per run → add to `run.cost` → charge via existing Stripe billing (`billing_service.py`).

### Phase 18.2 — Proxy Session Pinning

**What:** Maintain the same IP for multi-page scraping sessions (login flows, pagination). Apify calls these "sessions."

```python
# Actor SDK usage
proxy = await actor.create_proxy_configuration(
    groups=["RESIDENTIAL"],
    session_id="user_login_session_42"  # always same IP for this session
)
```

**Backend:** Store `proxy_sessions` in Redis (IP → session_id mapping, TTL = 10min).

---

## ⚡ Phase 19 — Multi-Language Actor Support (Node.js / JavaScript)

> **What Apify has:** Actors can be written in Python OR Node.js/TypeScript. Both have first-class SDKs and base Docker images. This dramatically expands the developer ecosystem.

### Phase 19.1 — Node.js Actor Runtime

**Gap:** All scraper code is Python-only. The entire `scrapers/` directory uses Python/Playwright. No JS runtime support.

**Files to create:**
```
scrapi-sdk-js/             # NEW: JavaScript/TypeScript SDK
├── package.json
├── src/
│   ├── Actor.ts           # Actor class (same API as Python SDK)
│   ├── Dataset.ts
│   ├── KeyValueStore.ts
│   ├── RequestQueue.ts
│   └── ProxyConfiguration.ts

docker/
├── actor-base-python/
│   └── Dockerfile         # Python 3.11 + Playwright base image
└── actor-base-node/       # NEW
    └── Dockerfile         # Node 20 + Playwright base image
```

**Node.js base Dockerfile:**
```dockerfile
FROM node:20-slim
RUN npx playwright install chromium --with-deps
WORKDIR /actor
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "main.js"]
```

**Build system change (Phase 12.1):** Detect language from `actor.source_type` or `Dockerfile`, pick correct base image automatically.

**JS SDK actor contract:**
```javascript
import { Actor } from 'scrapi';

await Actor.init();

const input = await Actor.getInput();
// ... scrape ...
await Actor.pushData({ result: 'value' });

await Actor.exit();
```

### Phase 19.2 — Multi-Language Syntax Validation

**Files to modify:**
```
backend/routes/actors.py    # MODIFY: validate code based on actor.language field
```

Add `language` field to Actor model (`"python"` | `"nodejs"` | `"docker"`). Validation: Python → `py_compile`, Node.js → `node --check`, Docker → parse Dockerfile syntax.

---

## ⚡ Phase 20 — Integrations, Notifications & Developer Portal

> **Goal:** Connect Scrapi to the wider automation ecosystem — Zapier, Make (formerly Integromat), Slack, Email — and provide a public developer portal with API documentation.

### Phase 20.1 — Slack & Email Run Notifications

**Gap:** Email service exists (`email_service.py`) and notification model exists (`notification.py`) but no run-completion notifications are sent.

**Files to modify:**
```
backend/
├── services/notification_service.py    # MODIFY: add Slack + email dispatch
├── workers/notification_worker.py      # NEW: Celery async notification task
└── models/user.py                      # MODIFY: add notification_preferences field
```

**Notification preferences model (add to User):**
```python
"notification_preferences": {
  "email": {
    "run_succeeded": bool,
    "run_failed": bool,
    "weekly_summary": bool
  },
  "slack": {
    "webhook_url": str,   # user's Slack incoming webhook
    "run_failed": bool,
    "run_succeeded": bool
  }
}
```

**Trigger:** After run completes in Celery worker → check user preferences → dispatch `notification_worker.delay(...)`.

### Phase 20.2 — Zapier & Make (Integromat) Integration

**What:** Apify has official Zapier and Make integrations so users can chain scraping with thousands of other apps (Google Sheets, Airtable, Notion, etc.)

**Files to create:**
```
backend/
├── routes/integration_routes.py    # NEW: Zapier/Make trigger + polling endpoints
```

**Zapier integration architecture** (Zapier polling trigger):
```
GET /api/integrations/zapier/runs/new    # Zapier polls this every 5 min
→  Returns runs completed since last_poll
→  Zapier sends data to next step (Google Sheets, Airtable, etc.)
```

**Make (Integromat) uses webhooks (Phase 3.1 already covers this)** — just needs a Make module definition published to Make's app store.

**Required endpoints:**
```
GET  /api/integrations/zapier/runs/new   # Polling trigger: new completed runs
GET  /api/integrations/zapier/datasets/{id}/items  # Dataset items trigger
POST /api/integrations/zapier/runs       # Action: start a run
GET  /api/integrations/me               # Auth test endpoint
```

### Phase 20.3 — Public Developer Portal & API Docs

**Gap:** API docs exist (`/api/docs`) but require admin login. There's no public-facing developer portal for third-party developers.

**Files to create:**
```
landing-site/                         # MODIFY: add developer portal pages
├── pages/
│   ├── developers.html               # Developer landing page
│   ├── api-reference.html            # Public API reference (subset of endpoints)
│   └── sdk-docs.html                 # SDK documentation

backend/routes/           
└── public_api_routes.py              # NEW: Public (no-auth) API reference endpoints
```

**Public API reference:** Subset of endpoints available without auth (actor store browsing, actor details) — rest requires API key. Rendered with Redoc from a curated OpenAPI spec.

**Developer portal sections:**
- Quickstart guide (authenticate → create run → fetch results in 3 steps)
- SDK docs (Python + Node.js)
- CLI reference
- Webhook reference
- Code examples (curl, Python, JavaScript)
- API changelog

### Phase 20.4 — Compute Unit (CU) Based Billing

**Gap:** Current billing is plan-subscription based. Apify bills primarily on **compute units** (CPU × time × memory) — pay-as-you-go on top of a base plan.

**1 Compute Unit = 1 GB RAM × 1 hour runtime**

**Files to modify:**
```
backend/
├── services/billing_service.py    # MODIFY: add CU calculation + overage billing
├── models/billing.py              # MODIFY: add compute_units_used to plans
└── workers/scraping_worker.py     # MODIFY: calculate CUs used after each run
```

**CU calculation (add to run completion):**
```python
duration_hours = run.duration_seconds / 3600
ram_gb = run.ram_mb / 1024
compute_units = duration_hours * ram_gb

# Store + bill overage above plan's included CUs
run.compute_units_used = compute_units  # already in Run model!
```

**Run model already has `compute_units_used: float = 0.0`** — just needs the calculation wired in.

**Usage dashboard:** Show monthly CU consumption as a chart (integrate with Phase 10.1 metrics).

---

## 📊 Additional Gaps Summary (Phases 16–20)

| Gap Added | Phase | Priority | Est. Days |
|---|---|---|---|
| No Actor Tasks (saved configurations) | 16.1 | 🟠 HIGH | 3 |
| No Actor Standby / HTTP server mode | 17.1 | 🟠 HIGH | 5 |
| No managed residential proxy pool | 18.1 | 🟡 MEDIUM | 4 |
| No proxy session pinning | 18.2 | 🟡 MEDIUM | 2 |
| No Node.js / JS actor runtime | 19.1 | 🟠 HIGH | 5 |
| No multi-language code validation | 19.2 | 🟡 MEDIUM | 1 |
| No Slack/email run notifications | 20.1 | 🟠 HIGH | 2 |
| No Zapier/Make integration | 20.2 | 🟡 MEDIUM | 3 |
| No public developer portal | 20.3 | 🟠 HIGH | 4 |
| No compute unit (CU) billing | 20.4 | 🟠 HIGH | 2 |

**Additional estimate: ~31 days**

---

## 📊 FINAL Complete Summary (All 20 Phases)

| Phase | Focus Area | Priority | Total Days |
|---|---|---|---|
| 1 | Distributed Execution (Celery) | 🔴 CRITICAL | 5 |
| 2 | Storage: KV Store + Request Queue | 🔴 CRITICAL | 6 |
| 3 | Webhooks + Actor Chaining | 🟠 HIGH | 7 |
| 4 | API Keys + Rate Limiting | 🟠 HIGH | 4 |
| 5 | Actor Versioning + Env Secrets | 🟠 HIGH | 5 |
| 6 | Real-Time SSE Log Streaming | 🟠 HIGH | 2 |
| 7 | Horizontal Scaling + K8s + Indexes | 🔴 CRITICAL | 7 |
| 8 | Python SDK + CLI Tool | 🟠 HIGH | 9 |
| 9 | Marketplace + Monetization | 🟡 MEDIUM | 9 |
| 10 | Observability + Metrics | 🟡 MEDIUM | 6 |
| 11 | Docker-Per-Run Actor Isolation | 🔴 CRITICAL | 9 |
| 12 | Actor Build Pipeline + Git CI/CD | 🔴 CRITICAL | 7 |
| 13 | Auto-Scaling (KEDA) | 🔴 CRITICAL | 5 |
| 14 | Cloud Export + Dataset Streaming | 🟠 HIGH | 5 |
| 15 | Team RBAC + Input Schema UI + SSO | 🟠 HIGH | 12 |
| 16 | Actor Tasks (Saved Configurations) | 🟠 HIGH | 3 |
| 17 | Actor Standby / HTTP Server Mode | 🟠 HIGH | 5 |
| 18 | Managed Proxy Service + Sessions | 🟡 MEDIUM | 6 |
| 19 | Node.js Actor Runtime + JS SDK | 🟠 HIGH | 6 |
| 20 | Integrations + Developer Portal + CU Billing | 🟠 HIGH | 11 |

**🎯 Grand Total: ~135 development days (~27 weeks / ~7 months)**

---

## 🗓️ Full Sprint Plan (All 20 Phases)

| Sprint | Weeks | Deliverables |
|---|---|---|
| 1 | 1-2 | Phase 1 + 7.1 + 7.3 (Celery + Stateless + Indexes) |
| 2 | 3-4 | Phase 2 + 4 (Storage + API Keys) |
| 3 | 5-6 | Phase 3 + 5 + 6 (Webhooks + Versioning + SSE) |
| 4 | 7-9 | Phase 11 (Docker Isolation — subprocess → full Docker) |
| 5 | 10-12 | Phase 12 + 8 (Build Pipeline + SDK + CLI) |
| 6 | 13-14 | Phase 13 + 7.2 (Auto-scaling + Kubernetes) |
| 7 | 15-16 | Phase 14 + 10 + 16 (Cloud Export + Metrics + Tasks) |
| 8 | 17-18 | Phase 15 + 20.1 + 20.3 (RBAC + Notifications + Dev Portal) |
| 9 | 19-20 | Phase 19 + 18 (Node.js SDK + Managed Proxy) |
| 10 | 21-22 | Phase 9 + 20.2 + 20.4 (Marketplace + Zapier + CU Billing) |
| 11 | 23-24 | Phase 17 + 3.2 (Standby Mode + Actor Chaining) |
| 12 | 25-27 | Load testing, security audit, public launch, docs |

---

---

## ⚡ Phase 21 — Remaining Apify Features (Final Parity)

> **Context:** Building everything from scratch — no third-party wrappers. Each sub-phase below describes the complete internal implementation.

---

### Phase 21.1 — Two-Factor Authentication (2FA / MFA)

**Gap:** No 2FA exists. Apify supports TOTP authenticator apps (Google Authenticator, Authy).

**Build plan (from scratch):**
```
backend/
├── services/totp_service.py         # NEW: TOTP secret generation + OTP verify
├── routes/auth_2fa_routes.py        # NEW: 2FA setup + verify endpoints
└── models/user.py                   # MODIFY: add totp_secret, is_2fa_enabled fields
```

**How to build TOTP from scratch:**
1. Generate a random 160-bit base32 secret per user using Python `secrets` module
2. Encode it as a `otpauth://` URI → convert to QR code (use `qrcode` library) → return as base64 PNG to frontend
3. User scans QR in authenticator app
4. On login: after password check, if `is_2fa_enabled=True` → require 6-digit TOTP code
5. Verify with `pyotp.TOTP(secret).verify(code)` — built from scratch using HMAC-SHA1 (RFC 6238)

**API Endpoints:**
```
POST /api/auth/2fa/setup          # Generate secret + QR code
POST /api/auth/2fa/verify-setup   # Confirm code to activate 2FA
POST /api/auth/2fa/verify         # Submit code during login
DELETE /api/auth/2fa/disable      # Disable (requires password + current code)
GET  /api/auth/2fa/backup-codes   # Generate one-time backup codes
```

**Backup codes:** Generate 10 random 8-char alphanumeric codes, store as hashed values, each usable once.

**IP Whitelisting (enterprise add-on):**
```
backend/
├── services/ip_whitelist_service.py    # NEW: CIDR-based IP allowlist check
└── models/organization.py              # MODIFY: add ip_whitelist field
```
Store CIDR ranges per organization (`["203.0.113.0/24", "198.51.100.5/32"]`). Check on every API request in middleware — reject non-matching IPs with `403`.

---

### Phase 21.2 — Run Replay (Re-Run with Same Input)

**Gap:** No one-click "re-run this run" feature. Users must manually copy inputs.

**Build plan:**
```
backend/routes/runs.py    # MODIFY: add POST /api/runs/{id}/rerun endpoint
```

**Implementation (very simple — 1 day):**
```python
@router.post("/runs/{run_id}/rerun")
async def rerun(run_id: str, current_user = Depends(get_current_user)):
    original_run = await db.runs.find_one({"id": run_id, "user_id": current_user["id"]})
    if not original_run:
        raise HTTPException(404)
    
    # Create new run with same actor + input
    new_run = Run(
        user_id=original_run["user_id"],
        actor_id=original_run["actor_id"],
        actor_name=original_run["actor_name"],
        input_data=original_run["input_data"],  # exact same input
        origin=f"Rerun of {run_id}"
    )
    await db.runs.insert_one(new_run.model_dump())
    scraping_worker.delay(new_run.id, ...)
    return new_run
```

**Frontend:** "Re-run" button on each run row in the Runs table and Run Detail page.

---

### Phase 21.3 — Dataset Deduplication

**Gap:** No deduplication of dataset items. If an actor scrapes the same record twice, both get stored.

**Build plan:**
```
backend/
├── routes/routes_legacy.py    # MODIFY: check uniqueKey on dataset push
└── models/dataset.py          # MODIFY: add dedup_key field to Dataset
```

**How it works:**
- Dataset has a configurable `dedup_key` field (e.g. `"url"`, `"product_id"`)
- When actor pushes an item via `POST /api/runs/{id}/push-data`, the service:
  1. Computes a fingerprint: `SHA256(str(item[dedup_key]))`
  2. Checks Redis SET `dataset_dedup:{dataset_id}` — member already? → skip
  3. Not present → add to Redis SET + insert into MongoDB

**Redis SET approach** (fast, O(1) per item):
```python
key = f"dataset_dedup:{dataset_id}"
fingerprint = hashlib.sha256(str(item.get(dedup_key, item)).encode()).hexdigest()
is_new = await redis.sadd(key, fingerprint)   # returns 1 if new, 0 if duplicate
if is_new:
    await db.dataset_items.insert_one(item)
```

**Dataset model addition:**
```python
"dedup_key": Optional[str]   # field name to deduplicate on, e.g. "url"
"dedup_count": int           # how many items were dropped as duplicates
```

---

### Phase 21.4 — Additional Export Formats (JSONL, XML, Excel)

**Gap:** Only JSON and CSV export. Apify supports JSONL, XML, Excel, RSS, and HTML table.

**Build plan:**
```
backend/routes/routes_legacy.py    # MODIFY: add format options to export endpoint
```

**Implementation per format (build from scratch, no external libs except openpyxl for Excel):**

```python
# JSONL — one JSON object per line
async def export_jsonl(items):
    return "\n".join(json.dumps(item) for item in items)

# XML — wrap each item in <item> tags
async def export_xml(items):
    root = ET.Element("dataset")
    for item in items:
        elem = ET.SubElement(root, "item")
        for k, v in item.items():
            child = ET.SubElement(elem, k)
            child.text = str(v)
    return ET.tostring(root, encoding="unicode", xml_declaration=True)

# Excel — use openpyxl (pure Python, no C deps)
async def export_excel(items):
    wb = openpyxl.Workbook()
    ws = wb.active
    headers = list(items[0].keys()) if items else []
    ws.append(headers)
    for item in items:
        ws.append([item.get(h, "") for h in headers])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
```

**Updated export endpoint:**
```
GET /api/datasets/{id}/export?format=json|csv|jsonl|xml|xlsx
```

---

### Phase 21.5 — Shared Dataset Links (Public Read Access)

**Gap:** No way to share a dataset with someone who doesn't have an account.

**Build plan:**
```
backend/
├── routes/routes_legacy.py          # MODIFY: add share token generation
└── models/dataset.py                # MODIFY: add share_token, share_expires_at
```

**Implementation:**
```python
# Generate share link
share_token = secrets.token_urlsafe(32)
await db.datasets.update_one(
    {"id": dataset_id},
    {"$set": {
        "share_token": share_token,
        "share_expires_at": datetime.utcnow() + timedelta(days=expiry_days)
    }}
)
return {"share_url": f"https://scrapi.io/shared/datasets/{share_token}"}

# Public read endpoint (no auth)
GET /api/shared/datasets/{share_token}           # Dataset metadata
GET /api/shared/datasets/{share_token}/items     # Paginated items
GET /api/shared/datasets/{share_token}/export    # Download
```

**Frontend:** Shared dataset view page (`/shared/datasets/:token`) with read-only grid, no sidebar, no auth required.

---

### Phase 21.6 — Run Memory Auto-Tuning

**Gap:** Actors always run with their configured memory limit. Apify suggests the optimal memory based on historical usage.

**Build plan:**
```
backend/
├── services/memory_advisor_service.py    # NEW: Analyze run history → suggest memory
└── routes/runs.py                        # MODIFY: return memory suggestion pre-run
```

**Algorithm:**
```python
async def suggest_memory(actor_id: str, db) -> int:
    # Get last 20 successful runs for this actor
    runs = await db.runs.find(
        {"actor_id": actor_id, "status": "succeeded"},
        {"ram_mb": 1, "compute_units_used": 1}
    ).sort("created_at", -1).limit(20).to_list(20)

    if not runs:
        return 1024  # default 1GB

    peak_usages = [r.get("peak_ram_mb", r["ram_mb"] * 0.7) for r in runs]
    p95 = sorted(peak_usages)[int(len(peak_usages) * 0.95)]

    # Round up to nearest 256MB, add 25% headroom
    suggested = math.ceil((p95 * 1.25) / 256) * 256
    return max(256, min(suggested, 32768))  # clamp 256MB – 32GB
```

**Frontend:** Show "💡 Suggested: 512 MB based on last 20 runs" badge on run input form.

---

### Phase 21.7 — Actor Changelog & Release Notes

**Gap:** No way for actor developers to document what changed between versions.

**Build plan:**
```
backend/
└── models/actor_version.py    # MODIFY: add changelog field
```

```python
# In actor_versions collection
"changelog": str    # Markdown text — "## v1.2.0\n- Fixed pagination\n- Added retry logic"
```

**API:** `PATCH /api/actors/{id}/versions/{ver}` accepts `changelog` field.

**Frontend:** Show collapsible changelog accordion on the Actor detail page and Marketplace listing. Display "What's new in v1.2" badge on recently updated actors.

---

### Phase 21.8 — Actor Deprecation

**Gap:** No way to mark an actor as deprecated and guide users toward a replacement.

**Build plan:**
```
backend/
└── models/actor.py    # MODIFY: add deprecation fields
```

```python
# Add to Actor model
"is_deprecated": bool = False
"deprecated_message": Optional[str]    # e.g. "Use Google Maps Scraper V3 instead"
"deprecated_replacement_actor_id": Optional[str]
"deprecated_at": Optional[datetime]
```

**API:** `POST /api/actors/{id}/deprecate` — sets `is_deprecated=True`, stores message + replacement.

**Behavior:**
- Deprecated actors still work — existing runs are not affected
- Marketplace shows a yellow ⚠️ "Deprecated" badge
- Run creation returns a warning header: `X-Scrapi-Warning: This actor is deprecated. Use actor/xyz instead`
- After 6 months: can set `status="archived"` to fully hide from store

---

### Phase 21.9 — Actor Source: ZIP / Tarball Upload

**Gap:** Actor code can only be entered inline or linked from Git. No file upload support.

**Build plan:**
```
backend/
├── routes/actor_source_routes.py    # NEW: Handle ZIP upload + extraction
└── services/source_service.py       # NEW: Extract, validate, store actor source
```

**Upload flow:**
```
POST /api/actors/{id}/source/upload
Content-Type: multipart/form-data
Body: zip_file (max 50MB)
       ↓
Extract ZIP to temp dir
Validate: must contain main.py (Python) or main.js (Node.js)
Scan for dangerous imports (subprocess calling rm -rf, etc.)
Store source files in MongoDB GridFS or S3
Trigger build (Phase 12.1)
```

**Source type model (add to actor_version):**
```python
"source_type": str    # "inline" | "git" | "zip" | "docker_image"
"source_zip_id": str  # GridFS file ID of uploaded ZIP
```

---

### Phase 21.10 — HTTP-Only / Cheerio Scraper Mode (No Browser)

**Gap:** All Scrapi scrapers use Playwright (full browser). For simple HTML sites, this is 10x slower and more expensive than needed. Apify's `CheerioCrawler` uses plain HTTP + HTML parsing — no browser launched.

**Build plan:**
```
backend/
├── scrapers/http_scraper.py         # NEW: HTTP-only scraping engine (no Playwright)
└── scrapers/scraper_registry.py     # MODIFY: add HTTP mode selection
```

**HTTP scraper (built from scratch using httpx + lxml):**
```python
import httpx
from lxml import html

class HTTPScraper:
    """Lightweight scraper — no browser, just HTTP + HTML parsing."""

    def __init__(self, proxy=None, headers=None):
        self.client = httpx.AsyncClient(
            proxies=proxy,
            headers=headers or self._default_headers(),
            timeout=30,
            follow_redirects=True
        )

    def _default_headers(self):
        return {
            "User-Agent": "Mozilla/5.0 (compatible; Scrapibot/1.0)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        }

    async def get(self, url: str) -> html.HtmlElement:
        response = await self.client.get(url)
        return html.fromstring(response.text)

    async def extract(self, tree, xpath: str):
        return tree.xpath(xpath)
```

**Actor input toggle:** Add `"scraper_mode": "browser" | "http"` to run input. HTTP mode: free tier can run unlimited (no Playwright license needed). Browser mode: charged normally.

**Performance comparison to document:**
| Mode | Avg Speed | Memory | Cost |
|---|---|---|---|
| HTTP (Cheerio) | ~500 pages/min | 64MB | ~0.01 CU/1000 pages |
| Browser (Playwright) | ~30 pages/min | 512MB | ~1 CU/1000 pages |

---

### Phase 21.11 — Custom Webhook Payload Templates

**Gap:** Webhooks (Phase 3.1) send a fixed JSON structure. Apify lets users customize the payload using Handlebars-style templates.

**Build plan:**
```
backend/
├── models/webhook.py              # MODIFY: add payload_template field
└── services/webhook_service.py   # MODIFY: render template before dispatching
```

**Template system (build from scratch using Python string formatting):**
```python
# User defines custom template:
{
  "payload_template": {
    "run_id": "{{runId}}",
    "status": "{{run.status}}",
    "results": "{{run.results_count}}",
    "my_custom_field": "Scraping done for {{actor.name}}"
  }
}

# Render (built using jinja2 or simple dict traversal):
def render_template(template: dict, context: dict) -> dict:
    rendered = json.dumps(template)
    for key, value in context.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
    return json.loads(rendered)
```

**Available template variables:** `runId`, `run.status`, `run.results_count`, `run.duration_seconds`, `run.cost`, `actor.id`, `actor.name`, `dataset.id`.

---

### Phase 21.12 — Output Schema Validation

**Gap:** No output schema validation. Actors can push any data structure — no contract enforced.

**Build plan:**
```
backend/
├── services/schema_validator.py    # NEW: JSON Schema validation on dataset push
└── models/actor.py                 # MODIFY: add output_schema field
```

**Actor model addition:**
```python
"output_schema": Optional[dict]   # JSON Schema defining expected output fields
```

**Validation on push-data:**
```python
from jsonschema import validate, ValidationError

async def push_dataset_item(run_id, item, db):
    actor = await db.actors.find_one({"id": run["actor_id"]})
    schema = actor.get("output_schema")

    if schema:
        try:
            validate(instance=item, schema=schema)
        except ValidationError as e:
            # Log warning but don't block (soft validation)
            await log_warning(run_id, f"Output validation warning: {e.message}")
            item["_validation_warning"] = e.message

    await db.dataset_items.insert_one(item)
```

**Soft vs hard validation:** Default = soft (warn but store). Actor creator can set `"strict_output_schema": true` = hard (reject invalid items, increment a `dropped_count` counter).

---

## 📊 Phase 21 Summary

| Sub-Phase | Feature | Est. Days |
|---|---|---|
| 21.1 | 2FA/MFA (TOTP) + IP Whitelisting | 3 |
| 21.2 | Run Replay / Re-Run | 1 |
| 21.3 | Dataset Deduplication | 2 |
| 21.4 | JSONL / XML / Excel Export | 2 |
| 21.5 | Shared Dataset Links | 2 |
| 21.6 | Run Memory Auto-Tuning | 2 |
| 21.7 | Actor Changelog / Release Notes | 1 |
| 21.8 | Actor Deprecation | 1 |
| 21.9 | ZIP / Tarball Source Upload | 2 |
| 21.10 | HTTP-Only Scraper Mode (no browser) | 3 |
| 21.11 | Custom Webhook Payload Templates | 2 |
| 21.12 | Output Schema Validation | 2 |

**Phase 21 total: ~23 days**

---

## 🎯 GRAND TOTAL — All 21 Phases (Complete Apify Parity)

| Phases | Focus | Days |
|---|---|---|
| 1–7 | Core distributed infrastructure | 36 |
| 8–10 | SDK, CLI, Marketplace, Monitoring | 24 |
| 11–13 | Docker isolation + Build + Auto-scale | 21 |
| 14–15 | Cloud export + RBAC + SSO | 17 |
| 16–18 | Tasks + Standby + Managed Proxy | 14 |
| 19–20 | Node.js + Integrations + Dev Portal | 17 |
| **21** | **Final parity: 2FA, dedup, exports, HTTP scraper, etc.** | **23** |

**🏁 Total: ~152 development days (~30 weeks / 7.5 months)**

> **Built 100% from scratch.** No Apify SDK dependency. No third-party scraping SaaS. Full ownership of every layer — auth, execution, storage, billing, SDK, CLI, and infrastructure.

---

*Complete Apify feature parity plan — 21 phases, 152 days. Built from scratch on FastAPI + MongoDB + Redis + Playwright + Celery + Docker + Kubernetes. March 2026.*


