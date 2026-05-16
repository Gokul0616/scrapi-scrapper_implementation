import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorCollection
import uuid
import user_agents
from bson import ObjectId

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self, db_collection: AsyncIOMotorCollection):
        self.collection = db_collection

    async def create_session(self, user_id: str, user_agent_str: str, ip_address: str, expiration_days: int = 90) -> str:
        """Creates a session and returns a JTI (JWT ID) to bind to the token."""
        # Parse User-Agent
        ua = user_agents.parse(user_agent_str)
        browser = f"{ua.browser.family}" if ua.browser.family else "Unknown Browser"
        os = f"{ua.os.family}" if ua.os.family else "Unknown OS"
        
        # In a real setup, we'd do a GeoIP lookup for the IP.
        # For this implementation, we will mock location or leave it as "Unknown" if not local.
        location = "Unknown Location"
        if ip_address in ("127.0.0.1", "::1", "localhost"):
            location = "Local Network"
            
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=expiration_days)
        jti = str(uuid.uuid4())

        session_doc = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id,
            "jti": jti,
            "ip_address": ip_address,
            "location": location,
            "user_agent": user_agent_str,
            "os": os,
            "browser": browser,
            "created_at": now,
            "last_active_at": now,
            "expires_at": expires_at
        }
        
        await self.collection.insert_one(session_doc)
        return jti

    async def get_active_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieves all active sessions for a user."""
        uid = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        cursor = self.collection.find({"user_id": uid}).sort("last_active_at", -1)
        sessions = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            doc["user_id"] = str(doc["user_id"])
            sessions.append(doc)
        return sessions

    async def revoke_session(self, session_id: str, user_id: str) -> bool:
        """Deletes a session from the DB. Blacklisting logic should be handled by Auth middleware."""
        uid = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        result = await self.collection.delete_one({"_id": ObjectId(session_id), "user_id": uid})
        return result.deleted_count > 0
        
    async def get_session_by_jti(self, jti: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"jti": jti})

    async def update_last_active(self, jti: str) -> None:
        """Updates the last_active_at timestamp for a session."""
        now = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"jti": jti},
            {"$set": {"last_active_at": now}}
        )

    async def ensure_indexes(self):
        """Create TTL index for automatic expiration."""
        try:
            await self.collection.create_index("expires_at", expireAfterSeconds=0)
            await self.collection.create_index("jti", unique=True)
            await self.collection.create_index("user_id")
            logger.info("🛡️ SessionService indexes ensured")
        except Exception as e:
            logger.error(f"Error creating SessionService indexes: {e}")
