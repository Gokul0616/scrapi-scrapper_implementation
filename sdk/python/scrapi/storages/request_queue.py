"""
RequestQueue — Python SDK storage class.

Remote mode (SCRAPI_TOKEN set):
  Calls /api/storage/request-queues/{id}/... endpoints

Local mode:
  Each request stored as a JSON file in:
  {SCRAPI_LOCAL_STORAGE_DIR}/request_queues/{queue_id}/{unique_key}.json

Usage:
    queue = await Actor.open_request_queue()
    await queue.add_request(Request.from_url('https://example.com'))
    
    while not await queue.is_finished():
        req = await queue.fetch_next_request()
        if req is None:
            await asyncio.sleep(0.5)
            continue
        try:
            # ... scrape ...
            await queue.mark_request_as_handled(req)
        except Exception:
            await queue.reclaim_request(req)
"""
from __future__ import annotations
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from scrapi.config import config
from scrapi.models import Request

logger = logging.getLogger(__name__)


class RequestQueue:
    def __init__(self, queue_id: str, client=None):
        self._queue_id = queue_id
        self._client = client

    @property
    def id(self) -> str:
        return self._queue_id

    # ── Add requests ──────────────────────────────────────────────────────

    async def add_request(
        self,
        request: Union[Request, dict],
        *,
        forefront: bool = False,
    ) -> dict:
        """
        Add a URL to the queue.
        Returns {wasAlreadyPresent, requestId}.
        Duplicate unique_keys are silently skipped.
        """
        req = self._normalize(request, forefront)

        if self._client is None:
            return self._local_add(req)

        result = await self._client.post(
            f"/api/storage/request-queues/{self._queue_id}/requests",
            json={"requests": [req]},
        )
        found = (result.get("duplicate", 0) or 0) > 0
        return {"wasAlreadyPresent": found, "requestId": req.get("unique_key", "")}

    async def add_requests(
        self,
        requests: List[Union[Request, dict]],
        *,
        wait_for_all_requests_to_be_added: bool = False,
    ) -> dict:
        """Batch-add URLs to the queue."""
        normalized = [self._normalize(r) for r in requests]

        if self._client is None:
            for req in normalized:
                self._local_add(req)
            return {"added": len(normalized)}

        result = await self._client.post(
            f"/api/storage/request-queues/{self._queue_id}/requests",
            json={"requests": normalized},
        )
        return result

    # ── Fetch / read ──────────────────────────────────────────────────────

    async def fetch_next_request(self) -> Optional[Request]:
        """
        Atomically fetch and lock the next pending URL.
        Returns None if no pending requests are available.
        """
        if self._client is None:
            return self._local_fetch_next()

        result = await self._client.get(
            f"/api/storage/request-queues/{self._queue_id}/head",
            params={"limit": 1, "lockSecs": 60},
        )
        items = result.get("items", [])
        if not items:
            return None
        return Request.from_dict(items[0])

    async def get_request(self, request_id: str) -> Optional[Request]:
        """Get info about a specific request by ID or unique_key."""
        if self._client is None:
            return self._local_get(request_id)
        try:
            result = await self._client.get(
                f"/api/storage/request-queues/{self._queue_id}/requests/{request_id}"
            )
            return Request.from_dict(result)
        except Exception as e:
            if "404" in str(e):
                return None
            raise

    # ── Handle / reclaim ──────────────────────────────────────────────────

    async def mark_request_as_handled(
        self, request: Union[Request, dict]
    ) -> Optional[Request]:
        """Mark a request as successfully processed."""
        uk = self._get_uk(request)

        if self._client is None:
            return self._local_mark_handled(uk)

        result = await self._client.post(
            f"/api/storage/request-queues/{self._queue_id}/requests/{uk}/mark-handled"
        )
        return Request.from_dict(result.get("request", {}))

    async def reclaim_request(
        self,
        request: Union[Request, dict],
        *,
        forefront: bool = False,
    ) -> Optional[Request]:
        """Return a failed request back to pending for retry."""
        uk = self._get_uk(request)

        if self._client is None:
            return self._local_reclaim(uk)

        result = await self._client.post(
            f"/api/storage/request-queues/{self._queue_id}/requests/{uk}/reclaim",
            json={"forefront": forefront},
        )
        return Request.from_dict(result.get("request", {}))

    # ── Status ────────────────────────────────────────────────────────────

    async def is_finished(self) -> bool:
        """Returns True when all requests have been handled."""
        if self._client is None:
            return self._local_is_finished()

        result = await self._client.get(
            f"/api/storage/request-queues/{self._queue_id}/is-finished"
        )
        return result.get("isFinished", False)

    async def get_info(self) -> dict:
        """Returns queue stats: total, handled, pending counts."""
        if self._client is None:
            return self._local_stats()

        return await self._client.get(
            f"/api/storage/request-queues/{self._queue_id}"
        )

    async def drop(self) -> None:
        """Delete the queue and all its requests."""
        if self._client is None:
            import shutil
            p = self._local_path()
            if p.exists():
                shutil.rmtree(p)
            return
        await self._client.delete(
            f"/api/storage/request-queues/{self._queue_id}"
        )

    # ── Helpers ───────────────────────────────────────────────────────────

    def _normalize(self, request: Union[Request, dict], forefront: bool = False) -> dict:
        if isinstance(request, Request):
            d = request.to_dict()
        else:
            d = dict(request)
        if not d.get("unique_key"):
            d["unique_key"] = hashlib.sha256(d["url"].encode()).hexdigest()
        d["forefront"] = forefront
        return d

    def _get_uk(self, request: Union[Request, dict]) -> str:
        if isinstance(request, Request):
            return request.unique_key or request.url
        return request.get("unique_key") or request.get("url", "")

    # ── Local mode helpers ────────────────────────────────────────────────

    def _local_path(self) -> Path:
        return Path(config.local_storage_dir) / "request_queues" / self._queue_id

    def _local_file(self, uk: str) -> Path:
        safe = hashlib.sha256(uk.encode()).hexdigest()[:16]
        return self._local_path() / f"{safe}.json"

    def _local_add(self, req: dict) -> dict:
        p = self._local_path()
        p.mkdir(parents=True, exist_ok=True)
        f = self._local_file(req["unique_key"])
        if f.exists():
            return {"wasAlreadyPresent": True, "requestId": req["unique_key"]}
        req["status"] = "pending"
        req["retry_count"] = 0
        f.write_text(json.dumps(req, indent=2))
        return {"wasAlreadyPresent": False, "requestId": req["unique_key"]}

    def _local_fetch_next(self) -> Optional[Request]:
        p = self._local_path()
        if not p.exists():
            return None
        for f in sorted(p.iterdir()):
            data = json.loads(f.read_text())
            if data.get("status") == "pending":
                data["status"] = "locked"
                f.write_text(json.dumps(data, indent=2))
                return Request.from_dict(data)
        return None

    def _local_get(self, uk: str) -> Optional[Request]:
        f = self._local_file(uk)
        if not f.exists():
            return None
        return Request.from_dict(json.loads(f.read_text()))

    def _local_mark_handled(self, uk: str) -> Optional[Request]:
        f = self._local_file(uk)
        if not f.exists():
            return None
        data = json.loads(f.read_text())
        data["status"] = "handled"
        f.write_text(json.dumps(data, indent=2))
        return Request.from_dict(data)

    def _local_reclaim(self, uk: str) -> Optional[Request]:
        f = self._local_file(uk)
        if not f.exists():
            return None
        data = json.loads(f.read_text())
        data["status"] = "pending"
        data["retry_count"] = data.get("retry_count", 0) + 1
        f.write_text(json.dumps(data, indent=2))
        return Request.from_dict(data)

    def _local_is_finished(self) -> bool:
        p = self._local_path()
        if not p.exists():
            return True
        for f in p.iterdir():
            data = json.loads(f.read_text())
            if data.get("status") in ("pending", "locked"):
                return False
        return True

    def _local_stats(self) -> dict:
        p = self._local_path()
        total = handled = pending = 0
        if p.exists():
            for f in p.iterdir():
                data = json.loads(f.read_text())
                total += 1
                if data.get("status") == "handled":
                    handled += 1
                elif data.get("status") == "pending":
                    pending += 1
        return {"total_request_count": total, "handled_request_count": handled,
                "pending_request_count": pending}
