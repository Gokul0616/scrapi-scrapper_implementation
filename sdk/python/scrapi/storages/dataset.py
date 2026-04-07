"""
Dataset — Python SDK storage class.
Append-only table for structured crawling results.

Usage:
    await Actor.push_data({'title': 'Example', 'url': 'https://...'})
    
    dataset = await Actor.open_dataset()
    await dataset.push_data([{'a': 1}, {'a': 2}])
    result = await dataset.get_data(limit=100)
    
    async for item in dataset.iterate_items():
        print(item)
"""
from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from scrapi.config import config

logger = logging.getLogger(__name__)


class DatasetContent:
    def __init__(self, data: dict):
        self.items: List[dict] = data.get("items", [])
        self.total: int = data.get("total", 0)
        self.offset: int = data.get("offset", 0)
        self.limit: int = data.get("limit", 250)
        self.count: int = len(self.items)


class Dataset:
    def __init__(self, dataset_id: str, client=None):
        self._dataset_id = dataset_id
        self._client = client

    @property
    def id(self) -> str:
        return self._dataset_id

    async def push_data(self, data: Any) -> None:
        """Append one or more rows."""
        if not isinstance(data, list):
            data = [data]

        if self._client is None:
            self._local_push(data)
            return

        await self._client.post(
            f"/api/storage/datasets/{self._dataset_id}/items",
            json=data,
        )

    async def get_data(
        self,
        *,
        offset: int = 0,
        limit: int = 250,
        fields: Optional[List[str]] = None,
        desc: bool = False,
    ) -> DatasetContent:
        """Fetch rows with pagination."""
        if self._client is None:
            return self._local_get(offset=offset, limit=limit)

        params: dict = {"offset": offset, "limit": limit, "desc": str(desc).lower()}
        if fields:
            params["fields"] = ",".join(fields)

        data = await self._client.get(
            f"/api/storage/datasets/{self._dataset_id}/items", params=params
        )
        return DatasetContent(data)

    async def iterate_items(
        self, *, offset: int = 0, fields: Optional[List[str]] = None
    ) -> AsyncGenerator[dict, None]:
        """Async generator over all items (auto-paginates)."""
        page_size = 250
        current_offset = offset
        while True:
            page = await self.get_data(offset=current_offset, limit=page_size, fields=fields)
            for item in page.items:
                yield item
            if len(page.items) < page_size:
                break
            current_offset += len(page.items)

    async def drop(self) -> None:
        if self._client is None:
            import shutil
            p = self._local_path()
            if p.exists():
                shutil.rmtree(p)
            return
        await self._client.delete(f"/api/storage/datasets/{self._dataset_id}")

    # ── Local mode ────────────────────────────────────────────────────────

    def _local_path(self) -> Path:
        return Path(config.local_storage_dir) / "datasets" / self._dataset_id

    def _local_push(self, items: list) -> None:
        p = self._local_path()
        p.mkdir(parents=True, exist_ok=True)
        existing = list(p.glob("*.json"))
        idx = len(existing)
        for item in items:
            (p / f"{idx:09d}.json").write_text(json.dumps(item, indent=2))
            idx += 1

    def _local_get(self, offset: int = 0, limit: int = 250) -> DatasetContent:
        p = self._local_path()
        if not p.exists():
            return DatasetContent({"items": [], "total": 0})
        files = sorted(p.glob("*.json"))
        total = len(files)
        sliced = files[offset:offset + limit]
        items = [json.loads(f.read_text()) for f in sliced]
        return DatasetContent({"items": items, "total": total, "offset": offset, "limit": limit})
