# 🚀 Scrapi → Apify-Scale: Deep Scalability Analysis

> **Goal**: Handle millions of web scraping requests like Apify does.  
> **Current state**: FastAPI monolith + asyncio + MongoDB + APScheduler (in-memory).  
> **Target state**: Distributed, horizontally-scalable actor platform.

---

## How Apify Handles Millions of Requests

Apify isn't just a scraper — it's a **distributed serverless execution platform**. Here's how they do it, layer by layer:

### 1. 🎭 Actors = Isolated Serverless Containers

Every scraping job runs inside a **Docker container** (called an Actor). Containers are:
- Spun up on-demand, killed when done (pay per compute unit)
- Stateless — any node can run any actor
- Auto-scaled by Kubernetes HPA/KEDA based on queue depth

**Your equivalent**: Python functions running as `asyncio` tasks inside a single process. No isolation, no horizontal scaling.

### 2. 📬 Request Queue = Distributed, Durable URL Queue

Apify's Request Queue (updated May 2024):
- **Backed by AWS DynamoDB** (not Redis, not Mongo)
- Handles **80,000–500,000 API requests/min** for write operations
- **Stores ~500 million requests/month**
- Supports **batch enqueue/dequeue** (reduces network round trips)
- Built-in **locking** to prevent two workers from processing the same URL simultaneously
- Supports BFS and DFS crawl strategies

**Your equivalent**: No persistent queue. [task_manager.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/services/task_manager.py) uses an in-memory Python `dict` of asyncio tasks. If the server restarts, **all queued work is lost**.

### 3. ⚡ KEDA (Kubernetes Event-Driven Autoscaling)

Apify's worker fleet scales based on queue depth:
- When queue grows → spawn more Actor containers
- When queue drains → scale to zero (save cost)
- KEDA watches queue length as the scaling metric
- Cluster Autoscaler adds/removes cloud nodes as needed

**Your equivalent**: Single-process, single-machine. Cannot scale horizontally.

### 4. 🔄 Proxy Infrastructure at Scale

Apify routes all requests through a **super-proxy layer**:
- Millions of rotating residential/datacenter IPs
- Automatic failover between proxy providers
- Session stickiness (same IP for same domain session)
- Country/city targeting

**Your equivalent**: [proxy_manager.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/services/proxy_manager.py) loads proxies from MongoDB with a 5-minute cache. Limited pool, no session stickiness, no failover routing.

### 5. 🗄️ Tiered Storage for Outputs

Apify uses three storage tiers:
| Storage | Purpose | Equivalent |
|---|---|---|
| **Datasets** | Structured JSON output, paginated | MongoDB `dataset_items` |
| **Key-Value Stores** | Screenshots, files, state blobs | Local filesystem / S3 |
| **Request Queues** | URLs to crawl | ❌ Missing |

**Your equivalent**: All results go to MongoDB directly. No streaming, no chunked pagination, potential memory issues at scale.

---

## Current System — Critical Bottlenecks

### ❌ Bottleneck 1: Single-Process Task Manager

```python
# services/task_manager.py
class TaskManager:
    def __init__(self):
        self.running_tasks: Dict[str, asyncio.Task] = {}  # IN-MEMORY ONLY
```

- **Problem**: All jobs run in one Python event loop. CPU-bound scraping (Playwright) blocks I/O.
- **Problem**: No persistence — server restart = lost jobs.
- **Problem**: Cannot scale to multiple servers (jobs don't share state).
- **Impact**: **Maximum ~10–20 concurrent real-browser jobs** before memory/CPU collapses.

### ❌ Bottleneck 2: No Distributed Queue

- Jobs go directly from HTTP request → asyncio task with no buffer.
- If 1,000 users trigger scrapes simultaneously, all 1,000 tasks compete for CPU/memory on one machine.
- No back-pressure, no rate limiting at the job level.

### ❌ Bottleneck 3: APScheduler with Memory-Only Job Store

```python
# services/scheduler_service.py
jobstores = {
    'default': MemoryJobStore()  # LOST ON RESTART
}
```

- Scheduled runs disappear if the server crashes.
- Cannot distribute scheduled jobs across multiple servers.

### ❌ Bottleneck 4: Celery is Installed but NOT Used for Scraping

[requirements.txt](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/requirements.txt) shows `celery==5.6.2`, `kombu==5.6.2`, and `redis==4.6.0` are already installed. However, no scraping code uses Celery workers. **The infrastructure exists but is not wired up.**

### ❌ Bottleneck 5: Playwright in the Same Process as FastAPI

Running Playwright (a real browser) inside the FastAPI event loop:
- Each Playwright instance consumes ~200–500MB RAM
- Chromium is CPU-heavy; runs block the async event loop
- Cannot be safely parallelized beyond ~5–10 browsers on one machine

### ❌ Bottleneck 6: MongoDB as the Only Data Layer

- No caching layer (Redis caching exists via `fastapi-cache2` but proxy data is not cached this way)
- Results streamed directly to MongoDB; no buffered write pipeline
- At 1M requests/day, unbatched MongoDB writes become a bottleneck

### ❌ Bottleneck 7: No Observability / Back-pressure Signals

- No metrics on queue depth, worker saturation, or job failure rates
- `prometheus_client` is installed but no metrics are exported
- No circuit breakers on scrapers

---

## 🏗️ Proposed Architecture: Apify-Style for Scrapi

```
                        ┌─────────────────────────────────────────────┐
                        │               API GATEWAY                    │
                        │      FastAPI (multiple instances)            │
                        │      Rate limiting via slowapi               │
                        └──────────────────┬──────────────────────────┘
                                           │ enqueue job
                                           ▼
                        ┌─────────────────────────────────────────────┐
                        │           DISTRIBUTED JOB QUEUE              │
                        │   Redis Streams (or Celery + Redis broker)   │
                        │   • Priority queues (Free / Pro / Scale)     │
                        │   • Dead-letter queue for failed jobs        │
                        │   • Job deduplication via uniqueKey          │
                        └──────────────────┬──────────────────────────┘
                                           │ consume
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                    │  Worker Pod  │ │  Worker Pod  │ │  Worker Pod  │
                    │  (Celery)    │ │  (Celery)    │ │  (Celery)    │
                    │  Playwright  │ │  Playwright  │ │  Playwright  │
                    │  +Stealth    │ │  +Stealth    │ │  +Stealth    │
                    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                           │                │                │
                           ▼                ▼                ▼
                    ┌─────────────────────────────────────────────────┐
                    │                STORAGE LAYER                     │
                    │  MongoDB (results) + Redis (cache + queue state) │
                    │  S3 / MinIO (screenshots, exports)               │
                    └─────────────────────────────────────────────────┘
                                           │
                                           ▼
                    ┌─────────────────────────────────────────────────┐
                    │              OBSERVABILITY                       │
                    │    Prometheus metrics + Flower (Celery UI)       │
                    │    Grafana dashboards                            │
                    └─────────────────────────────────────────────────┘
```

---

## 📋 Phased Implementation Roadmap

### Phase 1: Wire Up Celery (Days 1–3) — HIGHEST PRIORITY

**Celery + Redis is already installed. You just need to use it.**

#### 1a. Create `celery_app.py`
```python
# backend/celery_app.py
from celery import Celery

celery_app = Celery(
    "scrapi",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
    include=["tasks.scrape_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    task_acks_late=True,               # Only ack after task completes (no job loss on crash)
    worker_prefetch_multiplier=1,      # Don't pre-fetch — let workers grab one at a time
    task_reject_on_worker_lost=True,   # Re-queue if worker dies
    task_routes={
        "tasks.scrape_tasks.run_actor": {"queue": "scraping"},
        "tasks.scrape_tasks.run_scheduled": {"queue": "scheduled"},
    }
)
```

#### 1b. Create `tasks/scrape_tasks.py`
```python
# backend/tasks/scrape_tasks.py
from celery_app import celery_app
from scrapers.scraper_engine import ScraperEngine

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="tasks.scrape_tasks.run_actor"
)
def run_actor(self, run_id: str, actor_id: str, user_id: str, input_data: dict):
    """Execute a scraping actor as a Celery task."""
    try:
        engine = ScraperEngine()
        engine.execute(run_id, actor_id, user_id, input_data)
    except Exception as exc:
        raise self.retry(exc=exc)
```

#### 1c. Replace `task_manager.start_task()` → `run_actor.delay()`
```python
# Before (in-memory, single process):
await task_manager.start_task(run.id, execute_scraping_job(...))

# After (distributed, persistent):
run_actor.delay(run_id=run.id, actor_id=actor_id, user_id=user_id, input_data=input_data)
```

#### 1d. Fix APScheduler to Use Redis-backed Job Store
```python
from apscheduler.jobstores.redis import RedisJobStore

jobstores = {
    'default': RedisJobStore(host='localhost', port=6379, db=2)
}
```

---

### Phase 2: Priority Queues by Plan Tier (Days 4–5)

Map subscription tiers to separate Celery queues with dedicated workers:

```python
# Queue routing based on user plan
def get_queue_for_plan(plan: str) -> str:
    return {
        "free": "queue_free",
        "starter": "queue_standard",
        "pro": "queue_priority",
        "scale": "queue_premium",
    }.get(plan, "queue_free")

# Dispatch with priority
run_actor.apply_async(
    kwargs={...},
    queue=get_queue_for_plan(user.plan),
    priority=PLAN_PRIORITIES[user.plan]
)
```

Workers per queue:
| Queue | Concurrency | Plans |
|---|---|---|
| `queue_premium` | 20 workers | Scale |
| `queue_priority` | 10 workers | Pro |
| `queue_standard` | 5 workers | Starter |
| `queue_free` | 2 workers | Free |

---

### Phase 3: Redis-Backed Request Queue for Deep Crawling (Days 6–10)

For actors that need to crawl links (like Google Maps discovering paginated results), implement a **Redis Streams–based URL queue**:

```python
# backend/services/request_queue.py
import redis
import json
import hashlib

class RequestQueue:
    """Persistent, distributed URL queue backed by Redis Streams."""
    
    def __init__(self, redis_client, queue_name: str):
        self.r = redis_client
        self.stream_key = f"rq:{queue_name}"
        self.seen_key = f"rq:{queue_name}:seen"
    
    def enqueue(self, url: str, metadata: dict = None) -> bool:
        """Add URL to queue. Returns False if already seen (dedup)."""
        url_hash = hashlib.sha256(url.encode()).hexdigest()
        if self.r.sadd(self.seen_key, url_hash) == 0:
            return False  # Already queued/processed
        
        self.r.xadd(self.stream_key, {
            "url": url,
            "metadata": json.dumps(metadata or {}),
            "unique_key": url_hash
        })
        return True
    
    def dequeue_batch(self, count: int = 10) -> list:
        """Get next batch of URLs to process."""
        messages = self.r.xread(
            {self.stream_key: "0"},
            count=count,
            block=1000
        )
        return messages
```

---

### Phase 4: Horizontal Worker Scaling with Docker Compose (Days 11–14)

Update [docker-compose.yml](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/docker-compose.yml) to run multiple Celery worker nodes:

```yaml
# docker-compose.yml additions

celery-worker-scraping:
  build: ./backend
  command: celery -A celery_app worker -Q scraping -c 4 --loglevel=info
  environment:
    - MONGO_URL=${MONGO_URL}
    - REDIS_URL=redis://redis:6379/0
  deploy:
    replicas: 3       # Scale to 3 workers → 12 concurrent browsers
  depends_on:
    - redis
    - mongodb

celery-worker-scheduled:
  build: ./backend
  command: celery -A celery_app worker -Q scheduled -c 2 --loglevel=info
  deploy:
    replicas: 2

celery-beat:
  build: ./backend
  command: celery -A celery_app beat --loglevel=info
  # Replaces APScheduler — persistent schedule state in Redis

celery-flower:
  build: ./backend
  command: celery -A celery_app flower --port=5555
  ports:
    - "5555:5555"
  # Real-time task monitoring dashboard

redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
  ports:
    - "6379:6379"
```

---

### Phase 5: Proxy Pool Enhancement (Days 15–18)

Evolve [proxy_manager.py](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/services/proxy_manager.py) to be session-aware and resilient:

```python
class EnhancedProxyManager:
    """Apify-style proxy with session stickiness and provider failover."""
    
    async def get_session_proxy(self, session_id: str, domain: str) -> dict:
        """Return same proxy for same (session, domain) — prevents IP ban."""
        cache_key = f"proxy_session:{session_id}:{domain}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        proxy = await self.get_best_proxy_for_domain(domain)
        await self.redis.setex(cache_key, 3600, json.dumps(proxy))
        return proxy
    
    async def get_best_proxy_for_domain(self, domain: str) -> dict:
        """Pick proxy with best success rate for the specific target domain."""
        # Query domain-specific success rates
        stats = await self.db.proxy_domain_stats.find_one({"domain": domain})
        # ... scoring logic
```

---

### Phase 6: Observability & Back-Pressure (Days 19–22)

**Prometheus metrics** (already installed, just needs wiring):

```python
# backend/metrics.py
from prometheus_client import Counter, Histogram, Gauge

JOBS_QUEUED = Counter("scrapi_jobs_queued_total", "Total jobs queued", ["plan", "actor"])
JOBS_COMPLETED = Counter("scrapi_jobs_completed_total", "Total jobs done", ["status", "actor"])
JOB_DURATION = Histogram("scrapi_job_duration_seconds", "Job execution time", ["actor"])
QUEUE_DEPTH = Gauge("scrapi_queue_depth", "Current queue depth", ["queue"])
ACTIVE_WORKERS = Gauge("scrapi_active_workers", "Active Celery workers")
```

Add Flower monitoring at `/flower` and expose Prometheus at `/metrics`.

---

## 📊 Scalability Comparison

| Capability | Current Scrapi | After Implementation | Apify |
|---|---|---|---|
| Max concurrent jobs | ~10–20 | 100–500+ | Unlimited |
| Job persistence on restart | ❌ Lost | ✅ Persistent | ✅ Persistent |
| Horizontal scaling | ❌ Single server | ✅ Multi-node | ✅ Kubernetes |
| URL deduplication | ❌ None | ✅ Redis Set | ✅ DynamoDB |
| Queue throughput | ~100 req/min | ~50K req/min | 500K req/min |
| Proxy session stickiness | ❌ None | ✅ Redis-cached | ✅ Yes |
| Priority by plan tier | ❌ None | ✅ 4 queue tiers | ✅ Yes |
| Real-time monitoring | ❌ None | ✅ Flower + Prometheus | ✅ Yes |
| Scheduled job persistence | ❌ Memory only | ✅ Redis-backed | ✅ Yes |
| Autoscaling workers | ❌ Manual | ✅ Docker replicas | ✅ KEDA/K8s |

---

## 🎯 Quick-Win Priority Order

1. **🔴 CRITICAL (Do First)**: Wire up Celery for scraping tasks → immediate multi-node readiness
2. **🔴 CRITICAL**: Fix APScheduler to use Redis job store → survive restarts
3. **🟠 HIGH**: Priority queues by plan tier → monetization and fairness
4. **🟠 HIGH**: Redis Streams–based Request Queue → deep crawling scalability
5. **🟡 MEDIUM**: Enhanced proxy session stickiness → better success rates
6. **🟡 MEDIUM**: Prometheus + Grafana → visibility into system health
7. **🟢 FUTURE**: Kubernetes + KEDA → cloud-native autoscaling at Apify scale

---

## 💡 Key Insight

> **Celery + Redis is already in your [requirements.txt](file:///Users/gokul/Desktop/code/scrapi-scrapper_implementation/backend/requirements.txt).**  
> You are one configuration file away from distributed job processing.  
> The single biggest ROI move is wiring up Celery workers for scraping jobs (Phase 1).  
> Everything else builds on top of that foundation.
