"""
Actor — main entry point for the Scrapi SDK.

Scrapi-compatible design:
  - Use as an async context manager: `async with Actor:`
  - Or call explicitly: `await Actor.init()` / `await Actor.exit()`
  - Auto-detects remote vs local mode via SCRAPI_TOKEN env var

Usage:
    import asyncio
    from scrapi import Actor, Request

    async def main():
        async with Actor:
            inp = await Actor.get_input()
            queue = await Actor.open_request_queue()
            await queue.add_request(Request.from_url(inp['url']))
            
            while not await queue.is_finished():
                req = await queue.fetch_next_request()
                if not req:
                    await asyncio.sleep(0.5)
                    continue
                await Actor.push_data({'url': req.url, 'title': '...'})
                await queue.mark_request_as_handled(req)
            
            await Actor.set_value('OUTPUT', {'status': 'done'})

    asyncio.run(main())
"""
from __future__ import annotations
import asyncio
import logging
import os
from typing import Any, Optional

from scrapi.config import config
from scrapi.models import Request
from scrapi.storages.key_value_store import KeyValueStore
from scrapi.storages.request_queue import RequestQueue
from scrapi.storages.dataset import Dataset

logger = logging.getLogger("scrapi.actor")

# ── Lazy client singleton ─────────────────────────────────────────────────────
_http_client = None

def _get_client():
    global _http_client
    if config.is_at_home and _http_client is None:
        from scrapi.client.http_client import ScrapiHttpClient
        _http_client = ScrapiHttpClient()
    return _http_client  # None in local mode


class ActorMeta(type):
    async def __aenter__(cls):
        await cls.init()
        return cls

    async def __aexit__(cls, exc_type, exc_val, exc_tb):
        await cls.exit()
        return False


class Actor(metaclass=ActorMeta):
    """
    Scrapi Actor context. Use as an async context manager or call init/exit manually.
    All methods are classmethods — use as: `await Actor.get_input()`
    """

    _initialized: bool = False
    _default_kv_store: Optional[KeyValueStore] = None
    _default_dataset: Optional[Dataset] = None
    _default_rq: Optional[RequestQueue] = None

    # ── Lifecycle ─────────────────────────────────────────────────────────

    @classmethod
    async def init(cls) -> None:
        """Initialize the actor. Called automatically by `async with Actor:`."""
        if cls._initialized:
            return
        cls._initialized = True
        mode = "remote (platform)" if config.is_at_home else "local (filesystem)"
        logger.info(f"Scrapi Actor initialized [{mode}]")

    @classmethod
    async def exit(cls, *, exit_code: int = 0) -> None:
        """Clean up resources. Called automatically by `async with Actor:`."""
        global _http_client
        if _http_client is not None:
            await _http_client.close()
            _http_client = None
        cls._initialized = False
        cls._default_kv_store = None
        cls._default_dataset = None
        cls._default_rq = None
        logger.info(f"Scrapi Actor exited (exit_code={exit_code})")

    # ── Input / Output shortcuts ──────────────────────────────────────────

    @classmethod
    async def get_input(cls) -> Optional[Any]:
        """Read INPUT key from the default Key-Value Store."""
        store = await cls._ensure_default_kv_store()
        return await store.get_value("INPUT")

    @classmethod
    async def get_value(cls, key: str) -> Optional[Any]:
        """Read any key from the default Key-Value Store."""
        store = await cls._ensure_default_kv_store()
        return await store.get_value(key)

    @classmethod
    async def set_value(
        cls, key: str, value: Any, *, content_type: Optional[str] = None
    ) -> None:
        """Write any key to the default Key-Value Store. value=None deletes the key."""
        store = await cls._ensure_default_kv_store()
        await store.set_value(key, value, content_type=content_type)

    @classmethod
    async def push_data(cls, data: Any) -> None:
        """Append rows to the default Dataset."""
        dataset = await cls._ensure_default_dataset()
        await dataset.push_data(data)

    # ── Storage openers ───────────────────────────────────────────────────

    @classmethod
    async def open_key_value_store(
        cls,
        name_or_id: Optional[str] = None,
        *,
        id: Optional[str] = None,
        name: Optional[str] = None,
        force_cloud: bool = False,
    ) -> KeyValueStore:
        """
        Open a Key-Value Store.
        
        - No args → default store for this run
        - name='my-store' → named store (create if needed)
        - id='uuid...' → open by exact ID
        - force_cloud=True → use remote even in local dev mode
        """
        client = _get_client() if (config.is_at_home or force_cloud) else None

        # Positional arg can be either name or id
        if name_or_id:
            if len(name_or_id) == 36 and "-" in name_or_id:
                id = id or name_or_id
            else:
                name = name or name_or_id

        if id:
            return KeyValueStore(id, client)

        if name:
            if client:
                result = await client.post(
                    "/api/storage/kv-stores", json={"name": name}
                )
                return KeyValueStore(result["id"], client)
            else:
                return KeyValueStore(name, client)

        # Default store
        if name_or_id is None and not id and not name:
            return await cls._ensure_default_kv_store(force_cloud=force_cloud)

        return KeyValueStore(name_or_id or "default", client)

    @classmethod
    async def open_request_queue(
        cls,
        name_or_id: Optional[str] = None,
        *,
        id: Optional[str] = None,
        name: Optional[str] = None,
        force_cloud: bool = False,
    ) -> RequestQueue:
        """Open a Request Queue."""
        client = _get_client() if (config.is_at_home or force_cloud) else None

        if name_or_id:
            if len(name_or_id) == 36 and "-" in name_or_id:
                id = id or name_or_id
            else:
                name = name or name_or_id

        if id:
            return RequestQueue(id, client)

        if name:
            if client:
                result = await client.post(
                    "/api/storage/request-queues", json={"name": name}
                )
                return RequestQueue(result["id"], client)
            else:
                return RequestQueue(name, client)

        return await cls._ensure_default_rq(force_cloud=force_cloud)

    @classmethod
    async def open_dataset(
        cls,
        name_or_id: Optional[str] = None,
        *,
        id: Optional[str] = None,
        name: Optional[str] = None,
        force_cloud: bool = False,
    ) -> Dataset:
        """Open a Dataset."""
        client = _get_client() if (config.is_at_home or force_cloud) else None

        if name_or_id:
            if len(name_or_id) == 36 and "-" in name_or_id:
                id = id or name_or_id
            else:
                name = name or name_or_id

        if id:
            return Dataset(id, client)

        if name:
            if client:
                result = await client.post("/api/storage/datasets", json={"name": name})
                return Dataset(result["id"], client)
            else:
                return Dataset(name, client)

        return await cls._ensure_default_dataset(force_cloud=force_cloud)

    # ── Internal default store management ────────────────────────────────

    @classmethod
    async def _ensure_default_kv_store(cls, force_cloud: bool = False) -> KeyValueStore:
        if cls._default_kv_store is not None:
            return cls._default_kv_store

        client = _get_client() if (config.is_at_home or force_cloud) else None

        # Use run-provided store ID if available
        store_id = config.default_kv_store_id or os.environ.get("SCRAPI_DEFAULT_KV_STORE_ID")

        if not store_id:
            if client:
                result = await client.post("/api/storage/kv-stores", json={})
                store_id = result["id"]
            else:
                store_id = "default"

        cls._default_kv_store = KeyValueStore(store_id, client)
        return cls._default_kv_store

    @classmethod
    async def _ensure_default_dataset(cls, force_cloud: bool = False) -> Dataset:
        if cls._default_dataset is not None:
            return cls._default_dataset

        client = _get_client() if (config.is_at_home or force_cloud) else None
        dataset_id = config.default_dataset_id or "default"

        if not dataset_id or dataset_id == "default":
            if client:
                result = await client.post("/api/datasets", json={})
                dataset_id = result["id"]
            else:
                dataset_id = "default"

        cls._default_dataset = Dataset(dataset_id, client)
        return cls._default_dataset

    @classmethod
    async def _ensure_default_rq(cls, force_cloud: bool = False) -> RequestQueue:
        if cls._default_rq is not None:
            return cls._default_rq

        client = _get_client() if (config.is_at_home or force_cloud) else None
        rq_id = config.default_rq_id or "default"

        if not rq_id or rq_id == "default":
            if client:
                result = await client.post("/api/storage/request-queues", json={})
                rq_id = result["id"]
            else:
                rq_id = "default"

        cls._default_rq = RequestQueue(rq_id, client)
        return cls._default_rq
