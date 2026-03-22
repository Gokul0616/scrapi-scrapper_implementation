import json
import hashlib
from typing import List, Dict, Any, Optional
import redis.asyncio as aioredis

class RequestQueue:
    """Persistent distributed URL queue backed by Redis Streams with deduplication."""
    
    def __init__(self, redis_client: aioredis.Redis, queue_id: str, db=None, workspace_id: Optional[str] = None):
        self.r = redis_client
        self.queue_id = queue_id
        self.db = db
        self.workspace_id = workspace_id
        self.stream_key = f"rq:stream:{queue_id}"
        self.seen_key   = f"rq:seen:{queue_id}"
        self.group_name = "workers"

    async def initialize(self):
        """Create the consumer group if it doesn't exist."""
        try:
            await self.r.xgroup_create(self.stream_key, self.group_name, id="0", mkstream=True)
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                raise

    def _hash_url(self, url: str, method: str, payload: Optional[str] = None) -> str:
        """Create a deterministic hash for a request to prevent duplicates."""
        base = f"{method.upper()}:{url}"
        if payload:
            base += f":{payload}"
        return hashlib.sha256(base.encode()).hexdigest()

    async def add_requests(self, requests: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Add requests to the queue.
        Returns the number of actually added requests (skipping duplicates).
        """
        added = 0
        duplicates = 0
        
        # Use a pipeline for efficiency when adding multiple requests
        pipe = self.r.pipeline()
        
        for req in requests:
            url = req.get("url")
            if not url:
                continue
                
            method = req.get("method", "GET")
            unique_key = req.get("unique_key") or self._hash_url(url, method, req.get("payload"))
            
            # Use SETNX (or SADD) to check if we've seen this exact request
            # sadd returns 1 if added to set, 0 if already existed
            if await self.r.sadd(self.seen_key, unique_key):
                # We haven't seen it, add to the stream
                stream_message = {
                    "url": url,
                    "method": method,
                    "unique_key": unique_key,
                    "metadata": json.dumps(req.get("metadata", {})),
                    "payload": json.dumps(req.get("payload")) if req.get("payload") else "",
                    "retry_count": "0"
                }
                
                # We can't use pipeline for the conditional sadd result immediately, 
                # so we push the xadd directly (or we can use Lua script for perfect atomicity, 
                # but await is fine for now). Actually, doing it sequentially inside the loop 
                # breaks the pipeline speed slightly.
                # Since we awaited sadd, we can pipe the xadd.
                pipe.xadd(self.stream_key, stream_message)
                added += 1
            else:
                duplicates += 1
                
        if added > 0:
            await pipe.execute()
            if self.db and self.workspace_id:
                try:
                    await self.db.storage_metrics.insert_one({
                        "workspace_id": self.workspace_id,
                        "store_id": self.queue_id,
                        "type": "request_queue",
                        "operation": "write",
                        "count": added,
                        "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
                    })
                except Exception:
                    pass
            
        return {"added": added, "duplicates": duplicates}

    async def fetch_requests(self, limit: int = 10, consumer_id: str = "worker-1", timeout_ms: int = 2000) -> List[Dict]:
        """
        Claim the next batch of URLs for processing.
        Blocks for up to timeout_ms waiting for new items.
        """
        await self.initialize()
        
        # Read from the group. ">" means items never delivered to other consumers yet.
        messages = await self.r.xreadgroup(
            groupname=self.group_name,
            consumername=consumer_id,
            streams={self.stream_key: ">"},
            count=limit,
            block=timeout_ms
        )
        
        results = []
        if messages:
            # messages format: [[b'stream_name', [(b'message_id', {b'key': b'value', ...})]]]
            _, items = messages[0]
            for msg_id, data in items:
                decoded_data = {k.decode('utf-8'): v.decode('utf-8') for k, v in data.items()}
                
                req = {
                    "id": msg_id.decode('utf-8'),
                    "url": decoded_data.get("url"),
                    "method": decoded_data.get("method"),
                    "unique_key": decoded_data.get("unique_key"),
                    "metadata": json.loads(decoded_data.get("metadata", "{}")),
                    "retry_count": int(decoded_data.get("retry_count", 0))
                }
                
                payload_str = decoded_data.get("payload")
                if payload_str:
                    req["payload"] = json.loads(payload_str)
                    
                results.append(req)
                
        if results and self.db and self.workspace_id:
            try:
                await self.db.storage_metrics.insert_one({
                    "workspace_id": self.workspace_id,
                    "store_id": self.queue_id,
                    "type": "request_queue",
                    "operation": "read",
                    "count": len(results),
                    "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
                })
            except Exception:
                pass
                
        return results

    async def mark_handled(self, message_id: str):
        """Acknowledge a message so it is removed from the pending list."""
        await self.r.xack(self.stream_key, self.group_name, message_id)

    async def get_state(self) -> Dict[str, Any]:
        """Return the current metrics of the queue."""
        try:
            total = await self.r.xlen(self.stream_key)
            handled = await self.r.scard(self.seen_key) # total unique URLs seen
            
            pending_info = await self.r.xpending(self.stream_key, self.group_name)
            pending_count = pending_info["pending"] if pending_info else 0
            
            # Processed means handled but NOT pending
            # Wait, xlen is the total in stream. XACK doesn't remove it from stream unless we XDEL.
            # Usually we don't XDEL immediately, we just XACK.
            # The pending list is items handed to consumers but NOT acked.
            return {
                "total_in_queue": total,
                "total_unique_seen": handled,
                "currently_processing": pending_count,
                "completed": handled - total if total < handled else 0 # Rough estimate if we trim
            }
        except Exception:
            return {"total_in_queue": 0, "total_unique_seen": 0, "currently_processing": 0}

    async def clear(self):
        """Destroy the queue and its memory footprint."""
        await self.r.delete(self.stream_key)
        await self.r.delete(self.seen_key)
