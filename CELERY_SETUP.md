# Celery + Redis Task Processing Setup

This document describes the distributed task processing system using Celery and Redis.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   FastAPI   │────▶│    Redis    │────▶│  Celery Worker  │
│   Backend   │     │   (Broker)  │     │  (Scraping)     │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                                            │
       │                                            ▼
       │                                     ┌─────────────┐
       │                                     │  MongoDB    │
       └────────────────────────────────────▶│ (Results)   │
                                             └─────────────┘
```

## Components

### 1. Redis (Message Broker)
- Stores task queues and messages
- Enables multiple workers to pick up tasks
- Persists messages to disk (AOF)

### 2. Celery Workers
- Execute scraping tasks asynchronously
- Automatic retry with exponential backoff
- Concurrent task processing (configurable)

### 3. Flower (Monitoring)
- Web dashboard at http://localhost:5555/flower/
- Monitor task status, worker health
- View task results and retry failed tasks

### 4. MongoDB (Result Backend)
- Stores task results
- Persistent storage across restarts
- Configurable result expiry (7 days default)

## Configuration

### Environment Variables

```bash
# Redis / Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=mongodb://localhost:27017/scrapi
CELERY_WORKER_CONCURRENCY=2
```

### Docker Compose

All services are configured in `docker-compose.yml`:

```bash
# Start all services
docker-compose up -d

# Scale Celery workers (e.g., 4 workers)
docker-compose up -d --scale celery-worker=4

# View logs
docker-compose logs -f celery-worker

# Monitor tasks
docker-compose logs -f flower
```

## Usage

### Starting a Scraping Run

The TaskManager now automatically uses Celery when available:

```python
from services import get_task_manager

task_manager = get_task_manager()
await task_manager.start_task(
    run_id="run-123",
    actor_id="actor-456",
    user_id="user-789",
    input_data={"search_terms": ["plumber"], "location": "NYC"}
)
```

### Monitoring Tasks

1. **Flower Dashboard**: http://localhost:5555/flower/
2. **API Endpoint**: Task status is tracked in the runs collection
3. **Logs**: Check Celery worker logs for execution details

### Task Retry Behavior

- **Max Retries**: 3 attempts
- **Initial Delay**: 60 seconds
- **Backoff**: Exponential (60s, 120s, 240s)
- **Jitter**: Random offset to prevent thundering herd
- **Max Backoff**: 10 minutes

### Time Limits

- **Soft Limit**: 55 minutes (raises exception, can retry)
- **Hard Limit**: 60 minutes (force terminates task)

## Scaling

### Horizontal Scaling

Scale Celery workers to handle more concurrent tasks:

```bash
# With Docker Compose
docker-compose up -d --scale celery-worker=4

# Or set in .env
CELERY_WORKER_REPLICAS=4
```

### Vertical Scaling

Adjust worker concurrency per worker:

```bash
# In docker-compose.yml or environment
CELERY_WORKER_CONCURRENCY=4
```

### Queue Configuration

Tasks are routed to the `scraping` queue:

```python
# celery_app.py
task_routes = {
    'tasks.scraping_tasks.execute_scraping_job': {'queue': 'scraping'},
}
```

## Backward Compatibility

The TaskManager maintains full backward compatibility:

1. **Graceful Degradation**: If Celery is unavailable, falls back to local async execution
2. **Same Interface**: `start_task()`, `cancel_task()`, `get_status()` work the same
3. **Database Schema**: No changes to run/status tracking

## Troubleshooting

### Celery Worker Not Starting

```bash
# Check Redis connection
docker-compose exec celery-worker celery -A celery_app inspect ping

# View worker logs
docker-compose logs celery-worker
```

### Tasks Not Being Processed

```bash
# Check task queue
docker-compose exec redis redis-cli LLEN celery

# Inspect active tasks
docker-compose exec celery-worker celery -A celery_app inspect active
```

### Flower Not Accessible

```bash
# Check Flower logs
docker-compose logs flower

# Verify Celery connection
docker-compose exec flower celery -A celery_app inspect ping
```

## Development Mode

For local development without Docker:

```bash
# 1. Start Redis
redis-server

# 2. Start Celery worker (in separate terminal)
cd backend
celery -A celery_app worker --loglevel=info --queues=scraping

# 3. Start Flower (optional, in separate terminal)
celery -A celery_app flower --port=5555

# 4. Start FastAPI backend
uvicorn server:app --reload
```

## Migration from In-Memory Tasks

No migration needed! The system:

1. **Automatic Detection**: Detects if Celery is available
2. **Fallback Mode**: Uses local async tasks if Redis is unavailable
3. **Database Consistency**: Run status is always stored in MongoDB

Existing runs will continue to work, new runs will use Celery.
