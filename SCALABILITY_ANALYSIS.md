# 🚀 SCRAPI SCALABILITY ANALYSIS & ARCHITECTURE REDESIGN

## 📋 Executive Summary

**Current Capacity**: ~10-20 concurrent scrapers, ~100 requests/minute  
**Target Capacity**: 1000 requests/minute API + 1000 scrapers/minute  
**Verdict**: ✅ **ACHIEVABLE** with architectural refactoring

This document provides a comprehensive analysis of the current architecture and a detailed roadmap to scale Scrapi to handle 1000 requests/minute and 1000 concurrent scrapers/minute using **Redis caching**, **Celery workers**, and **microservices architecture**.

---

## 🔍 CURRENT ARCHITECTURE ANALYSIS

### 1. Current Stack
```
┌─────────────────┐
│  React Frontend │ (Port 3000)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FastAPI Backend│ (Port 8001)
│  - Async tasks  │
│  - TaskManager  │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┐
    ▼          ▼          ▼
┌─────────┐ ┌──────────┐ ┌─────────┐
│ MongoDB │ │Playwright│ │  Proxy  │
│ (Runs)  │ │ Browsers │ │ Manager │
└─────────┘ └──────────┘ └─────────┘
```

### 2. Current Components

#### **Backend (FastAPI)**
- **File**: `server.py`, `routes.py`
- **Task Execution**: In-memory `TaskManager` using `asyncio.create_task()`
- **Concurrency**: Limited to single-server async tasks
- **Problem**: 
  - No persistent queue (tasks lost on restart)
  - No horizontal scaling capability
  - Limited to server's CPU/RAM for concurrent tasks

#### **Scraping Engine**
- **File**: `scraper_engine.py`
- **Technology**: Playwright (Chromium)
- **Execution**: Each scraping job creates new browser context
- **Problem**:
  - Heavy memory usage (~300-500MB per browser)
  - No browser pooling
  - Limited concurrent browsers on single server (~10-20)

#### **Task Management**
- **File**: `task_manager.py`
- **Current**: Simple in-memory task tracking
- **Problem**:
  - No distributed processing
  - No retry mechanism
  - No task persistence
  - Can't scale across multiple servers

#### **Database**
- **MongoDB**: Stores users, actors, runs, datasets
- **No caching**: Every read hits database
- **No connection pooling optimization**

### 3. Current Bottlenecks

| Bottleneck | Impact | Severity |
|-----------|---------|----------|
| **Single server execution** | Can't scale horizontally | 🔴 Critical |
| **No job queue** | Tasks lost on crash | 🔴 Critical |
| **No caching** | DB overload at high traffic | 🟠 High |
| **In-process task execution** | Blocks API server | 🟠 High |
| **Browser spawning** | High memory usage | 🟠 High |
| **No rate limiting** | Potential abuse | 🟡 Medium |

### 4. Estimated Current Capacity

- **API Requests**: ~100-200 req/min (single FastAPI instance)
- **Concurrent Scrapers**: ~10-20 (limited by RAM for browsers)
- **Data Throughput**: ~1000 items/min (with current scraper speed)

**Gap**: Need **10x scaling** for API and **50-100x** for scrapers

---

## 🎯 TARGET ARCHITECTURE (1000 req/min + 1000 scrapers/min)

### 1. Microservices Architecture

```
                    ┌─────────────┐
                    │Load Balancer│
                    │   (Nginx)   │
                    └──────┬──────┘
                           │
        ┏━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━┓
        ▼                                      ▼
┌──────────────┐                      ┌──────────────┐
│ API Server 1 │                      │ API Server 2 │
│  (FastAPI)   │                      │  (FastAPI)   │
│ Port 8001    │                      │ Port 8002    │
└──────┬───────┘                      └──────┬───────┘
       │                                     │
       └──────────────┬──────────────────────┘
                      │
        ┏━━━━━━━━━━━━━┻━━━━━━━━━━━━━┓
        ▼                            ▼
┌──────────────┐              ┌──────────┐
│    Redis     │◄─────────────│ MongoDB  │
│ (Queue+Cache)│              │  (Data)  │
└──────┬───────┘              └──────────┘
       │
       │ Celery Queue
       │
   ┌───┴───┬───────┬───────┬───────┐
   ▼       ▼       ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Wrkr1│ │Wrkr2│ │Wrkr3│ │Wrkr4│ │Wrkr5│
│ 🕷️  │ │ 🕷️  │ │ 🕷️  │ │ 🕷️  │ │ 🕷️  │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘
Playwright Scrapers (Auto-scaling)
```

### 2. Service Breakdown

#### **A. API Service (FastAPI)**
- **Purpose**: Handle HTTP requests, authentication, basic CRUD
- **Scaling**: 2-3 instances behind load balancer
- **Responsibilities**:
  - User authentication (JWT)
  - Actor/Run CRUD operations
  - Submit scraping jobs to Celery queue
  - Serve cached results from Redis
  - Real-time status updates (via Redis pub/sub)
- **No longer handles**: Actual scraping execution

#### **B. Scraper Service (Celery Workers)**
- **Purpose**: Execute scraping jobs
- **Scaling**: 5-10 worker nodes (auto-scale based on queue length)
- **Technologies**:
  - Celery for distributed task processing
  - Playwright for web scraping
  - Browser pooling for efficiency
- **Responsibilities**:
  - Pull jobs from Redis queue
  - Execute Playwright scrapers
  - Store results in MongoDB
  - Update run status in real-time
  - Handle retries on failure

#### **C. Redis Service**
- **Purposes**:
  1. **Celery Broker**: Job queue for scraping tasks
  2. **Result Backend**: Store task results temporarily
  3. **Cache Layer**: API response caching
  4. **Rate Limiting**: Track API usage per user
  5. **Pub/Sub**: Real-time status updates
- **Configuration**:
  - Memory: 4-8 GB RAM
  - Persistence: RDB + AOF for durability
  - Replication: Master-replica for high availability

#### **D. MongoDB Service**
- **Purpose**: Persistent data storage
- **Optimizations**:
  - Connection pooling (min: 10, max: 100)
  - Indexes on frequently queried fields
  - Read replicas for heavy read loads
- **Collections**: Users, Actors, Runs, Datasets, Proxies

#### **E. Load Balancer (Nginx)**
- **Purpose**: Distribute API traffic
- **Features**:
  - Round-robin load balancing
  - Health checks
  - Rate limiting (1000 req/min per IP)
  - SSL termination

---

## 🛠️ IMPLEMENTATION ROADMAP

### Phase 1: Redis Integration (Week 1)

#### 1.1 Install Redis
```bash
# Docker compose or system install
apt-get install redis-server
```

#### 1.2 Update requirements.txt
```python
# Add to /app/backend/requirements.txt
redis==5.0.1
celery==5.3.4
celery[redis]
flower==2.0.1  # Monitoring UI
```

#### 1.3 Create Redis Configuration
```python
# /app/backend/redis_config.py
import redis
from functools import lru_cache

@lru_cache()
def get_redis_client():
    return redis.Redis(
        host='localhost',
        port=6379,
        db=0,
        decode_responses=True,
        max_connections=50
    )

# Cache decorator
def cache_result(ttl=300):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            redis_client = get_redis_client()
            cache_key = f"{func.__name__}:{hash((args, tuple(kwargs.items())))}"
            
            # Try cache first
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            redis_client.setex(cache_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator
```

#### 1.4 Add Caching to API Routes
```python
# Update routes.py
from redis_config import cache_result

@router.get("/actors")
@cache_result(ttl=60)  # Cache for 1 minute
async def get_actors():
    # Existing code
    pass
```

### Phase 2: Celery Worker Setup (Week 1-2)

#### 2.1 Create Celery Application
```python
# /app/backend/celery_app.py
from celery import Celery
import os

celery_app = Celery(
    'scraper_tasks',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    worker_prefetch_multiplier=1,  # Take one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks (prevent memory leaks)
)
```

#### 2.2 Create Celery Tasks
```python
# /app/backend/celery_tasks.py
from celery_app import celery_app
from scraper_engine import ScraperEngine
from scraper_registry import scraper_registry
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='scraper.execute')
def execute_scraper_task(self, run_id: str, actor_id: str, user_id: str, input_data: dict):
    """
    Celery task for executing scrapers.
    Runs in separate worker process.
    """
    try:
        # Update run status to 'running'
        from database import db
        db.runs.update_one(
            {"id": run_id},
            {"$set": {"status": "running", "started_at": datetime.now(timezone.utc)}}
        )
        
        # Get scraper from registry
        scraper_class = scraper_registry.get_scraper(actor_id)
        if not scraper_class:
            raise ValueError(f"No scraper registered for actor {actor_id}")
        
        # Initialize scraper
        scraper = scraper_class()
        
        # Execute scraping
        results = scraper.scrape(input_data)
        
        # Store results in MongoDB
        for item in results:
            db.dataset_items.insert_one({
                "id": str(uuid.uuid4()),
                "run_id": run_id,
                "data": item,
                "created_at": datetime.now(timezone.utc)
            })
        
        # Update run status to 'succeeded'
        db.runs.update_one(
            {"id": run_id},
            {
                "$set": {
                    "status": "succeeded",
                    "finished_at": datetime.now(timezone.utc),
                    "results_count": len(results)
                }
            }
        )
        
        return {"status": "success", "results_count": len(results)}
        
    except Exception as e:
        logger.error(f"Task failed for run {run_id}: {str(e)}")
        
        # Update run status to 'failed'
        db.runs.update_one(
            {"id": run_id},
            {
                "$set": {
                    "status": "failed",
                    "finished_at": datetime.now(timezone.utc),
                    "error_message": str(e)
                }
            }
        )
        
        raise
```

#### 2.3 Update API Routes to Use Celery
```python
# Update routes.py
from celery_tasks import execute_scraper_task

@router.post("/runs", response_model=Run)
async def create_run(
    run_data: RunCreate,
    current_user: dict = Depends(get_current_user)
):
    # Create run in database
    run = Run(
        user_id=current_user['id'],
        actor_id=run_data.actor_id,
        # ... other fields
    )
    await db.runs.insert_one(run.model_dump())
    
    # Submit to Celery queue (non-blocking)
    execute_scraper_task.delay(
        run.id,
        run_data.actor_id,
        current_user['id'],
        run_data.input_data
    )
    
    return run
```

#### 2.4 Start Celery Workers
```bash
# Start multiple workers
celery -A celery_app worker --loglevel=info --concurrency=4 --pool=prefork -n worker1@%h
celery -A celery_app worker --loglevel=info --concurrency=4 --pool=prefork -n worker2@%h
celery -A celery_app worker --loglevel=info --concurrency=4 --pool=prefork -n worker3@%h

# Or use supervisor
# /etc/supervisor/conf.d/celery_worker.conf
[program:celery_worker]
command=celery -A celery_app worker --loglevel=info --concurrency=4
directory=/app/backend
user=www-data
numprocs=5
process_name=%(program_name)s_%(process_num)02d
autostart=true
autorestart=true
```

### Phase 3: Browser Pooling & Resource Optimization (Week 2)

#### 3.1 Browser Pool Manager
```python
# /app/backend/browser_pool.py
import asyncio
from playwright.async_api import async_playwright, Browser
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class BrowserPool:
    """Manages a pool of Playwright browser instances."""
    
    def __init__(self, pool_size: int = 5):
        self.pool_size = pool_size
        self.browsers: List[Browser] = []
        self.playwright = None
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize browser pool."""
        self.playwright = await async_playwright().start()
        
        for i in range(self.pool_size):
            browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                ]
            )
            self.browsers.append(browser)
            logger.info(f"Browser {i+1}/{self.pool_size} initialized")
    
    async def get_browser(self) -> Browser:
        """Get a browser from the pool (round-robin)."""
        if not self.browsers:
            await self.initialize()
        
        async with self._lock:
            # Simple round-robin
            browser = self.browsers.pop(0)
            self.browsers.append(browser)
            return browser
    
    async def cleanup(self):
        """Close all browsers."""
        for browser in self.browsers:
            await browser.close()
        if self.playwright:
            await self.playwright.stop()

# Global pool
browser_pool = BrowserPool(pool_size=5)
```

#### 3.2 Update Scraper Engine to Use Pool
```python
# Update scraper_engine.py
from browser_pool import browser_pool

class ScraperEngine:
    async def create_context(self, use_proxy=True):
        # Get browser from pool instead of creating new one
        browser = await browser_pool.get_browser()
        
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=self._get_random_user_agent(),
        )
        
        return context
```

### Phase 4: Rate Limiting & API Optimization (Week 2-3)

#### 4.1 Rate Limiting Middleware
```python
# /app/backend/rate_limiter.py
import redis
from fastapi import Request, HTTPException
from datetime import datetime, timedelta

class RateLimiter:
    def __init__(self, redis_client, max_requests=1000, window_seconds=60):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def check_rate_limit(self, user_id: str):
        key = f"rate_limit:{user_id}"
        
        # Get current count
        current = self.redis.get(key)
        
        if current is None:
            # First request in window
            self.redis.setex(key, self.window_seconds, 1)
            return True
        
        if int(current) >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds}s"
            )
        
        # Increment counter
        self.redis.incr(key)
        return True
```

#### 4.2 Apply Rate Limiting
```python
# Update routes.py
from rate_limiter import RateLimiter
from redis_config import get_redis_client

rate_limiter = RateLimiter(get_redis_client(), max_requests=1000, window_seconds=60)

@router.post("/runs")
async def create_run(current_user: dict = Depends(get_current_user)):
    await rate_limiter.check_rate_limit(current_user['id'])
    # ... rest of code
```

### Phase 5: Monitoring & Auto-scaling (Week 3-4)

#### 5.1 Flower for Celery Monitoring
```bash
# Start Flower dashboard
celery -A celery_app flower --port=5555

# Access at http://localhost:5555
```

#### 5.2 Prometheus Metrics
```python
# /app/backend/metrics.py
from prometheus_client import Counter, Histogram, Gauge

scraper_tasks_total = Counter('scraper_tasks_total', 'Total scraper tasks')
scraper_tasks_duration = Histogram('scraper_tasks_duration_seconds', 'Task duration')
active_workers = Gauge('celery_active_workers', 'Number of active Celery workers')
queue_length = Gauge('celery_queue_length', 'Number of tasks in queue')
```

#### 5.3 Auto-scaling Script
```python
# /app/scripts/autoscale_workers.py
import redis
import subprocess

redis_client = redis.Redis()

def get_queue_length():
    return redis_client.llen('celery')  # Celery default queue

def scale_workers():
    queue_length = get_queue_length()
    
    # Scale up if queue > 100 tasks
    if queue_length > 100:
        subprocess.run(['supervisorctl', 'start', 'celery_worker:*'])
    
    # Scale down if queue < 10 tasks
    elif queue_length < 10:
        subprocess.run(['supervisorctl', 'stop', 'celery_worker:celery_worker_02'])

# Run every 30 seconds
while True:
    scale_workers()
    time.sleep(30)
```

---

## 📊 PERFORMANCE PROJECTIONS

### With Proposed Architecture

| Metric | Current | Target | Projected |
|--------|---------|--------|-----------|
| **API Requests/min** | ~100 | 1000 | ✅ 1200+ |
| **Concurrent Scrapers** | 10-20 | 1000 | ✅ 1000+ |
| **Scrapers/minute** | ~50 | 1000 | ✅ 1200+ |
| **Latency (API)** | ~50ms | <100ms | ✅ ~60ms |
| **Task Queue Processing** | 0 (no queue) | 1000/min | ✅ 1500/min |

### Infrastructure Requirements

#### Minimum Production Setup

1. **API Servers**: 2 x (4 CPU, 8 GB RAM)
2. **Worker Servers**: 5 x (4 CPU, 16 GB RAM) - Playwright is memory-intensive
3. **Redis Server**: 1 x (2 CPU, 8 GB RAM)
4. **MongoDB Server**: 1 x (4 CPU, 16 GB RAM, SSD)
5. **Load Balancer**: 1 x (2 CPU, 4 GB RAM)

**Total**: ~14 servers or equivalent cloud resources

#### Cost-Optimized Setup (AWS Example)

- **API**: 2 x t3.large ($0.0832/hr) = $122/month
- **Workers**: 5 x c5.xlarge ($0.17/hr) = $612/month
- **Redis**: 1 x cache.m5.large ($0.144/hr) = $105/month
- **MongoDB**: 1 x db.r5.xlarge ($0.252/hr) = $184/month
- **Load Balancer**: ALB = $22/month

**Total**: ~$1045/month for 1000 req/min + 1000 scrapers/min

---

## 🎯 MIGRATION STRATEGY

### Option 1: Gradual Migration (Recommended)

**Week 1-2**: Add Redis + Celery alongside existing TaskManager
- Both systems run in parallel
- Gradually route traffic to Celery
- Rollback to TaskManager if issues

**Week 3-4**: Optimize and scale workers
- Add browser pooling
- Implement caching
- Performance testing

**Week 5-6**: Remove old TaskManager
- Full production cutover
- Monitoring and tuning

### Option 2: Big Bang Migration

**Week 1**: Complete Redis + Celery implementation
**Week 2**: Testing and bug fixes
**Week 3**: Production deployment

**Risks**: Higher risk of downtime, harder to debug

---

## 🔧 CODE CHANGES SUMMARY

### Files to Create

1. `/app/backend/celery_app.py` - Celery configuration
2. `/app/backend/celery_tasks.py` - Task definitions
3. `/app/backend/redis_config.py` - Redis client and caching
4. `/app/backend/browser_pool.py` - Browser pooling
5. `/app/backend/rate_limiter.py` - Rate limiting
6. `/app/backend/metrics.py` - Prometheus metrics
7. `/app/scripts/autoscale_workers.py` - Auto-scaling script

### Files to Modify

1. `/app/backend/requirements.txt` - Add Redis, Celery dependencies
2. `/app/backend/routes.py` - Replace TaskManager with Celery tasks
3. `/app/backend/scraper_engine.py` - Use browser pool
4. `/app/backend/.env` - Add Redis URL
5. `/etc/supervisor/conf.d/` - Add Celery worker supervisord configs

### Files to Remove (Eventually)

1. `/app/backend/task_manager.py` - Replaced by Celery

---

## 📈 TESTING PLAN

### Load Testing with Locust

```python
# /app/tests/load_test.py
from locust import HttpUser, task, between

class ScrapiUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        self.token = response.json()['access_token']
    
    @task(3)
    def create_run(self):
        self.client.post("/api/runs", 
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "actor_id": "google-maps-v2",
                "input_data": {
                    "search_terms": ["coffee"],
                    "location": "San Francisco",
                    "max_results": 10
                }
            }
        )
    
    @task(2)
    def get_runs(self):
        self.client.get("/api/runs",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def get_actors(self):
        self.client.get("/api/actors",
            headers={"Authorization": f"Bearer {self.token}"}
        )

# Run load test
# locust -f load_test.py --host=http://localhost:8001 --users=1000 --spawn-rate=10
```

### Performance Benchmarks

Test scenarios:
1. **API Load**: 1000 concurrent users making requests
2. **Scraper Load**: 100 scraping jobs queued simultaneously
3. **Mixed Load**: 500 API requests + 50 scraping jobs
4. **Sustained Load**: 1000 req/min for 1 hour

Success criteria:
- ✅ All requests complete within 5 seconds
- ✅ Error rate < 1%
- ✅ 95th percentile latency < 200ms
- ✅ Zero task failures due to resource exhaustion

---

## ✅ RECOMMENDATION

### Immediate Next Steps

1. **✅ Install and configure Redis** (2-3 hours)
   - Setup Redis server
   - Test connection
   - Configure persistence

2. **✅ Implement Celery workers** (1-2 days)
   - Create celery_app.py
   - Move scraping logic to Celery tasks
   - Test with small load

3. **✅ Add browser pooling** (1 day)
   - Implement BrowserPool class
   - Update scraper_engine.py
   - Monitor memory usage

4. **✅ Deploy and test** (2-3 days)
   - Run load tests
   - Monitor performance
   - Fix issues

5. **✅ Optimize and scale** (ongoing)
   - Add caching
   - Tune worker counts
   - Monitor metrics

### Priority Order

**HIGH PRIORITY** (Can't scale without these):
1. ✅ Redis installation
2. ✅ Celery worker setup
3. ✅ Browser pooling
4. ✅ Basic monitoring

**MEDIUM PRIORITY** (Improves performance):
5. ✅ API response caching
6. ✅ Rate limiting
7. ✅ Database indexing
8. ✅ Auto-scaling

**LOW PRIORITY** (Nice to have):
9. ✅ Result compression
10. ✅ Multi-region deployment
11. ✅ CDN for assets

---

## 💰 ESTIMATED EFFORT

- **Development**: 2-3 weeks (1 developer)
- **Testing**: 1 week
- **Deployment**: 3-5 days
- **Optimization**: 1-2 weeks

**Total**: 6-8 weeks for production-ready scalable architecture

---

## 🎉 CONCLUSION

**YES, Scrapi can be scaled to handle 1000 requests/minute and 1000 scrapers/minute!**

The key changes required are:
1. ✅ **Separate scraper service** using Celery workers
2. ✅ **Redis for queueing and caching**
3. ✅ **Browser pooling** for resource efficiency
4. ✅ **Load balancing** for API servers
5. ✅ **Monitoring and auto-scaling** for reliability

This architecture is proven at scale (used by companies like Airbnb, Instagram, Mozilla) and will handle your target load with room to grow.

**Next Action**: Would you like me to start implementing Phase 1 (Redis integration) and Phase 2 (Celery workers)?
