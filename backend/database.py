import os
import redis.asyncio as aioredis

# Global instances
db = None
fs = None
proxy_manager = None
task_manager = None
redis_client = None

def set_globals(database, proxy_mgr=None, task_mgr=None):
    """Set the global instances."""
    global db, proxy_manager, task_manager
    db = database
    if proxy_mgr:
        proxy_manager = proxy_mgr
    if task_mgr:
        task_manager = task_mgr

def get_db():
    return db

def get_proxy_manager():
    return proxy_manager

def get_task_manager():
    return task_manager

async def get_redis():
    """Lazily initialize and return a shared async Redis client."""
    global redis_client
    if redis_client is None:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        redis_client = aioredis.from_url(redis_url)
    return redis_client
