"""
Secrets Service — Phase 5: Actor Environment Variables

Provides AES-256 Fernet symmetric encryption for actor environment variables.
Values are NEVER stored in plaintext and NEVER returned by list APIs.

Key management:
  - Set SCRAPI_ENCRYPTION_KEY env var to a valid Fernet key (32 url-safe base64 bytes)
  - Generate a new key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  - If not set, an ephemeral key is generated and a warning is logged (dev only)
"""

import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    from cryptography.fernet import Fernet, InvalidToken
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logger.warning("cryptography package not installed. Secrets service will be unavailable.")


class SecretsService:
    """AES-256 Fernet encryption for actor environment variable secrets."""

    ENV_KEY_NAME = "SCRAPI_ENCRYPTION_KEY"

    def __init__(self, db):
        self.db = db
        self._fernet = None
        if CRYPTO_AVAILABLE:
            self._fernet = self._load_fernet()

    def _load_fernet(self):
        """Load or generate Fernet instance from environment."""
        key = os.environ.get(self.ENV_KEY_NAME, "")
        if not key:
            new_key = Fernet.generate_key().decode()
            logger.warning(
                f"⚠️  {self.ENV_KEY_NAME} not set — using ephemeral key. "
                "Secrets will NOT survive restarts. Set this env var in production."
            )
            key = new_key
        try:
            return Fernet(key.encode() if isinstance(key, str) else key)
        except Exception as e:
            logger.error(f"Invalid {self.ENV_KEY_NAME}: {e}")
            raise

    def _encrypt(self, value: str) -> str:
        if not self._fernet:
            raise RuntimeError("cryptography package not installed")
        return self._fernet.encrypt(value.encode()).decode()

    def _decrypt(self, encrypted: str) -> str:
        if not self._fernet:
            raise RuntimeError("cryptography package not installed")
        return self._fernet.decrypt(encrypted.encode()).decode()

    # ── CRUD Operations ───────────────────────────────────────────────────────

    async def set_env_var(
        self,
        actor_id: str,
        version_number: str,
        name: str,
        value: str,
        is_secret: bool = False,
    ) -> dict:
        """Create or update an env var. Value is always encrypted."""
        if not name or not name.strip():
            raise ValueError("Env var name cannot be empty")
        name = name.strip().upper()  # Normalize to uppercase like real env vars

        encrypted = self._encrypt(value)
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "actor_id": actor_id,
            "version_number": version_number,
            "name": name,
            "encrypted_value": encrypted,
            "is_secret": is_secret,
            "updated_at": now,
        }

        existing = await self.db.actor_env_vars.find_one(
            {"actor_id": actor_id, "version_number": version_number, "name": name}
        )

        if existing:
            await self.db.actor_env_vars.update_one(
                {"actor_id": actor_id, "version_number": version_number, "name": name},
                {"$set": doc},
            )
        else:
            doc["created_at"] = now
            await self.db.actor_env_vars.insert_one(doc)

        return {"name": name, "is_secret": is_secret, "updated_at": now}

    async def list_env_vars(self, actor_id: str, version_number: str) -> List[dict]:
        """
        List env var metadata for a version.
        Values are NEVER returned — only name, is_secret, and timestamps.
        """
        docs = await self.db.actor_env_vars.find(
            {"actor_id": actor_id, "version_number": version_number},
            {"_id": 0, "encrypted_value": 0},  # Exclude encrypted value
        ).to_list(200)
        return docs

    async def get_env_var_meta(
        self, actor_id: str, version_number: str, name: str
    ) -> Optional[dict]:
        """Get a single env var's metadata (no value returned if secret)."""
        name = name.upper()
        doc = await self.db.actor_env_vars.find_one(
            {"actor_id": actor_id, "version_number": version_number, "name": name},
            {"_id": 0},
        )
        if not doc:
            return None
        # Only return value if NOT a secret
        result = {
            "name": doc["name"],
            "is_secret": doc["is_secret"],
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        }
        if not doc.get("is_secret"):
            try:
                result["value"] = self._decrypt(doc["encrypted_value"])
            except Exception:
                result["value"] = None
        return result

    async def delete_env_var(self, actor_id: str, version_number: str, name: str) -> bool:
        """Delete an env var. Returns True if deleted, False if not found."""
        name = name.upper()
        result = await self.db.actor_env_vars.delete_one(
            {"actor_id": actor_id, "version_number": version_number, "name": name}
        )
        return result.deleted_count > 0

    async def get_for_run(self, actor_id: str, version_number: str) -> Dict[str, str]:
        """
        Decrypt and return ALL env vars for a version.
        ONLY called by the build/scraping worker at execution time.
        Returns {NAME: decrypted_value}
        """
        docs = await self.db.actor_env_vars.find(
            {"actor_id": actor_id, "version_number": version_number}
        ).to_list(200)

        result = {}
        for doc in docs:
            try:
                result[doc["name"]] = self._decrypt(doc["encrypted_value"])
            except Exception as e:
                logger.warning(f"Could not decrypt env var '{doc['name']}' for actor {actor_id}: {e}")
        return result

    # ── Index Management ──────────────────────────────────────────────────────

    async def ensure_indexes(self):
        """Create MongoDB indexes. Call once on server startup."""
        await self.db.actor_env_vars.create_index(
            [("actor_id", 1), ("version_number", 1), ("name", 1)],
            unique=True,
        )
        logger.info("✅ actor_env_vars indexes ensured")
