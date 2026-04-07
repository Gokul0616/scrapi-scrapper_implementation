"""
KeyValueStore — Python SDK storage class.

Remote mode (SCRAPI_TOKEN set):
  Wraps GET/PUT/DELETE /api/storage/kv-stores/{id}/records/{key}

Local mode (no token):
  Reads/writes files in {SCRAPI_LOCAL_STORAGE_DIR}/key_value_stores/{store_id}/
  Same format as Scrapi local dev.

Usage:
    store = await Actor.open_key_value_store()              # default for run
    store = await Actor.open_key_value_store(name='my')    # named store
    
    value = await store.get_value('OUTPUT')
    await store.set_value('OUTPUT', {'results': [...]})
    await store.set_value('screen.png', png_bytes, content_type='image/png')
    await store.set_value('key', None)      # ← deletes the key
    
    async for key, info in store.iterate_keys():
        print(key, info['size_bytes'])
"""
from __future__ import annotations
import json
import os
import logging
from pathlib import Path
from typing import Any, AsyncGenerator, Optional, Tuple

from scrapi.config import config

logger = logging.getLogger(__name__)


class KeyValueStore:
    def __init__(self, store_id: str, client=None):
        self._store_id = store_id
        self._client = client  # ScrapiHttpClient instance (None = local mode)

    @property
    def id(self) -> str:
        return self._store_id

    # ── Main API ──────────────────────────────────────────────────────────

    async def get_value(self, key: str) -> Any:
        """
        Get a value by key.
        Returns dict/list for JSON, str for text, bytes for binary.
        Returns None if key not found.
        """
        if self._client is None:
            return self._local_get(key)
        try:
            raw, ct = await self._client.get_raw(
                f"/api/storage/kv-stores/{self._store_id}/records/{key}"
            )
            return self._parse_response(raw, ct)
        except Exception as e:
            if "404" in str(e):
                return None
            raise

    async def set_value(
        self,
        key: str,
        value: Any,
        *,
        content_type: Optional[str] = None,
    ) -> None:
        """
        Set a value by key.
        value=None → deletes the key (Scrapi pattern).
        Auto-detects content_type if not provided.
        """
        if value is None:
            return await self.delete_value(key)

        ct = content_type or self._detect_ct(value)

        if self._client is None:
            return self._local_set(key, value, ct)

        # Serialize to bytes
        raw = self._serialize(value, ct)
        await self._client.put_raw(
            f"/api/storage/kv-stores/{self._store_id}/records/{key}",
            content=raw,
            content_type=ct,
        )

    async def delete_value(self, key: str) -> None:
        if self._client is None:
            self._local_delete(key)
            return
        try:
            await self._client.delete(
                f"/api/storage/kv-stores/{self._store_id}/records/{key}"
            )
        except Exception as e:
            if "404" not in str(e):
                raise

    async def iterate_keys(
        self, *, exclusive_start_key: Optional[str] = None
    ) -> AsyncGenerator[Tuple[str, dict], None]:
        """
        Async generator yielding (key, info) tuples.
        info = {size_bytes, content_type, created_at}
        """
        if self._client is None:
            for key, info in self._local_keys():
                yield key, info
            return

        cursor = exclusive_start_key
        while True:
            params = {"limit": 200}
            if cursor:
                params["exclusiveStartKey"] = cursor
            result = await self._client.get(
                f"/api/storage/kv-stores/{self._store_id}/records",
                params=params,
            )
            for item in result.get("items", []):
                yield item["key"], {
                    "size_bytes": item.get("size_bytes", 0),
                    "content_type": item.get("content_type", ""),
                    "created_at": item.get("created_at", ""),
                }
            cursor = result.get("nextExclusiveStartKey")
            if not cursor:
                break

    async def get_public_url(self, key: str) -> str:
        """Returns the full public URL to access this record directly."""
        return f"{config.base_url}/api/storage/kv-stores/{self._store_id}/records/{key}"

    async def drop(self) -> None:
        """Delete the entire store and all its records."""
        if self._client is None:
            import shutil
            path = self._local_path()
            if path.exists():
                shutil.rmtree(path)
            return
        await self._client.delete(f"/api/storage/kv-stores/{self._store_id}")

    # ── Local mode helpers ────────────────────────────────────────────────

    def _local_path(self) -> Path:
        return Path(config.local_storage_dir) / "key_value_stores" / self._store_id

    def _local_file(self, key: str, ext: str = ".json") -> Path:
        return self._local_path() / f"{key}{ext}"

    def _local_get(self, key: str) -> Any:
        base = self._local_path()
        # Try JSON first, then text, then binary
        for path in base.glob(f"{key}.*"):
            ext = path.suffix.lower()
            if ext == ".json":
                return json.loads(path.read_text())
            elif ext == ".txt":
                return path.read_text()
            else:
                return path.read_bytes()
        return None

    def _local_set(self, key: str, value: Any, ct: str) -> None:
        base = self._local_path()
        base.mkdir(parents=True, exist_ok=True)
        if isinstance(value, (dict, list)):
            (base / f"{key}.json").write_text(json.dumps(value, indent=2))
        elif isinstance(value, str):
            (base / f"{key}.txt").write_text(value)
        else:
            ext = self._ct_to_ext(ct)
            (base / f"{key}{ext}").write_bytes(value)

    def _local_delete(self, key: str) -> None:
        for path in self._local_path().glob(f"{key}.*"):
            path.unlink(missing_ok=True)

    def _local_keys(self):
        base = self._local_path()
        if not base.exists():
            return
        for path in sorted(base.iterdir()):
            key = path.stem
            yield key, {
                "size_bytes": path.stat().st_size,
                "content_type": self._ext_to_ct(path.suffix),
                "created_at": "",
            }

    # ── Serialization helpers ─────────────────────────────────────────────

    @staticmethod
    def _detect_ct(value: Any) -> str:
        if isinstance(value, (dict, list)):
            return "application/json"
        if isinstance(value, str):
            return "text/plain; charset=utf-8"
        return "application/octet-stream"

    @staticmethod
    def _serialize(value: Any, ct: str) -> bytes:
        base = ct.split(";")[0].strip().lower()
        if base == "application/json":
            return json.dumps(value).encode()
        if isinstance(value, str):
            return value.encode("utf-8")
        if isinstance(value, bytes):
            return value
        return json.dumps(value).encode()

    @staticmethod
    def _parse_response(raw: bytes, ct: str) -> Any:
        base = ct.split(";")[0].strip().lower()
        if base == "application/json":
            return json.loads(raw)
        if base.startswith("text/"):
            return raw.decode("utf-8")
        return raw

    @staticmethod
    def _ct_to_ext(ct: str) -> str:
        mapping = {
            "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif",
            "image/webp": ".webp", "application/pdf": ".pdf",
            "text/html": ".html", "text/csv": ".csv",
        }
        base = ct.split(";")[0].strip().lower()
        return mapping.get(base, ".bin")

    @staticmethod
    def _ext_to_ct(ext: str) -> str:
        mapping = {
            ".json": "application/json", ".txt": "text/plain",
            ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif",
            ".webp": "image/webp", ".pdf": "application/pdf",
            ".html": "text/html", ".csv": "text/csv",
        }
        return mapping.get(ext.lower(), "application/octet-stream")
