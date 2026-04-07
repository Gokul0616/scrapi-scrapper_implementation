"""
HTTP Client — wraps the Scrapi REST API using httpx.
"""
from __future__ import annotations
import logging
from typing import Any, Optional

import httpx

from scrapi.config import config

logger = logging.getLogger(__name__)


class ScrapiHttpClient:
    """Async httpx client that always injects the SCRAPI_TOKEN header."""

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self.base_url = (base_url or config.base_url).rstrip("/")
        self.token = token or config.token
        self._client: Optional[httpx.AsyncClient] = None

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self._headers(),
                timeout=60.0,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get(self, path: str, **kwargs) -> Any:
        client = await self._get_client()
        resp = await client.get(path, **kwargs)
        resp.raise_for_status()
        return resp.json()

    async def post(self, path: str, json: Any = None, **kwargs) -> Any:
        client = await self._get_client()
        resp = await client.post(path, json=json, **kwargs)
        resp.raise_for_status()
        return resp.json()

    async def put_raw(self, path: str, content: bytes, content_type: str) -> Any:
        """PUT raw bytes with explicit Content-Type — used for KV record upload."""
        client = await self._get_client()
        resp = await client.put(
            path,
            content=content,
            headers={
                **self._headers(),
                "Content-Type": content_type,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def get_raw(self, path: str) -> tuple[bytes, str]:
        """GET raw bytes response — used for KV record download."""
        client = await self._get_client()
        resp = await client.get(path, headers=self._headers())
        resp.raise_for_status()
        return resp.content, resp.headers.get("content-type", "application/octet-stream")

    async def delete(self, path: str, **kwargs) -> Any:
        client = await self._get_client()
        resp = await client.delete(path, **kwargs)
        resp.raise_for_status()
        return resp.json()
