"""
Configuration — reads Scrapi environment variables.

Environment variables used by the Scrapi SDK
─────────────────────────────────────────────────
SCRAPI_TOKEN        →  SCRAPI_TOKEN
SCRAPI_API_BASE_URL →  SCRAPI_BASE_URL
SCRAPI_LOCAL_STORAGE_DIR → SCRAPI_LOCAL_STORAGE_DIR
SCRAPI_ACTOR_RUN_ID →  SCRAPI_RUN_ID
SCRAPI_DEFAULT_KEY_VALUE_STORE_ID → SCRAPI_DEFAULT_KV_STORE_ID
SCRAPI_DEFAULT_DATASET_ID → SCRAPI_DEFAULT_DATASET_ID
SCRAPI_DEFAULT_REQUEST_QUEUE_ID   → SCRAPI_DEFAULT_REQUEST_QUEUE_ID

Mode detection (same as Scrapi):
  SCRAPI_TOKEN set           → use remote Scrapi API
  SCRAPI_LOCAL_STORAGE_DIR   → use local filesystem emulation
  Neither                    → default to ./storage (local)
"""

import os
from typing import Optional


DEFAULT_BASE_URL = "https://api.scrapi.io"
DEFAULT_LOCAL_DIR = "./storage"
LOCAL_LOCK_SECS = 60


class ScrapiConfig:
    def __init__(self):
        # Internal storage for programmatic overrides
        self._token = None
        self._base_url = None
        self._local_storage_dir = None
        self._run_id = None
        self._default_kv_store_id = None
        self._default_dataset_id = None
        self._default_rq_id = None

    @property
    def token(self) -> Optional[str]:
        return self._token or os.environ.get("SCRAPI_TOKEN")

    @token.setter
    def token(self, value: Optional[str]):
        self._token = value

    @property
    def base_url(self) -> str:
        return self._base_url or os.environ.get("SCRAPI_BASE_URL", DEFAULT_BASE_URL).rstrip("/")

    @base_url.setter
    def base_url(self, value: str):
        self._base_url = value

    @property
    def local_storage_dir(self) -> str:
        return self._local_storage_dir or os.environ.get("SCRAPI_LOCAL_STORAGE_DIR", DEFAULT_LOCAL_DIR)

    @local_storage_dir.setter
    def local_storage_dir(self, value: str):
        self._local_storage_dir = value

    @property
    def run_id(self) -> Optional[str]:
        return self._run_id or os.environ.get("SCRAPI_RUN_ID")

    @run_id.setter
    def run_id(self, value: Optional[str]):
        self._run_id = value

    @property
    def default_kv_store_id(self) -> Optional[str]:
        return self._default_kv_store_id or os.environ.get("SCRAPI_DEFAULT_KV_STORE_ID")

    @default_kv_store_id.setter
    def default_kv_store_id(self, value: Optional[str]):
        self._default_kv_store_id = value

    @property
    def default_dataset_id(self) -> Optional[str]:
        return self._default_dataset_id or os.environ.get("SCRAPI_DEFAULT_DATASET_ID")

    @default_dataset_id.setter
    def default_dataset_id(self, value: Optional[str]):
        self._default_dataset_id = value

    @property
    def default_rq_id(self) -> Optional[str]:
        return self._default_rq_id or os.environ.get("SCRAPI_DEFAULT_REQUEST_QUEUE_ID")

    @default_rq_id.setter
    def default_rq_id(self, value: Optional[str]):
        self._default_rq_id = value

    @property
    def is_at_home(self) -> bool:
        """True when running on Scrapi platform (token is set)."""
        return bool(self.token)

    @property
    def is_local(self) -> bool:
        return not self.is_at_home


# Singleton config instance
config = ScrapiConfig()
