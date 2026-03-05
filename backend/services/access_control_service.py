import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)

class AccessControlService:
    def __init__(self, db_collection: AsyncIOMotorCollection):
        self.collection = db_collection
        self.max_attempts = 5
        self.window_seconds = 900  # 15 minutes
        self.block_duration = 1800 # 30 minutes

    @staticmethod
    def format_time_remaining(seconds: int) -> str:
        """Format seconds into a human readable string (minutes or hours)."""
        if seconds < 60:
            return f"{seconds} seconds"
        minutes = round(seconds / 60)
        if minutes < 60:
            return f"{minutes} minute{'s' if minutes > 1 else ''}"
        hours = round(minutes / 60, 1)
        return f"{hours} hour{'s' if hours > 1 else ''}"

    async def ensure_indexes(self):
        """Create TTL index for automatic expiration."""
        try:
            # TTL Index: expire after 0 seconds when ttl_expiry reached
            await self.collection.create_index("ttl_expiry", expireAfterSeconds=0)
            logger.info("✅ AccessControl TTL index ensured")
        except Exception as e:
            logger.error(f"Failed to create AccessControl indexes: {e}")

    async def is_blocked(self, ip: str, email: str) -> Tuple[bool, int]:
        """
        Check if an IP or Email is currently blocked.
        Returns (is_blocked, remaining_seconds).
        """
        now = datetime.now(timezone.utc)
        
        # Check by IP first
        ip_record = await self.collection.find_one({"key": f"ip:{ip}"})
        if ip_record and ip_record.get("blocked_until"):
            blocked_until = ip_record["blocked_until"]
            if isinstance(blocked_until, str):
                blocked_until = datetime.fromisoformat(blocked_until)
            if blocked_until.tzinfo is None:
                blocked_until = blocked_until.replace(tzinfo=timezone.utc)
                
            if blocked_until > now:
                return True, int((blocked_until - now).total_seconds())

        # Then check by Email
        email_record = await self.collection.find_one({"key": f"email:{email}"})
        if email_record and email_record.get("blocked_until"):
            blocked_until = email_record["blocked_until"]
            if isinstance(blocked_until, str):
                blocked_until = datetime.fromisoformat(blocked_until)
            if blocked_until.tzinfo is None:
                blocked_until = blocked_until.replace(tzinfo=timezone.utc)
                
            if blocked_until > now:
                return True, int((blocked_until - now).total_seconds())

        return False, 0

    async def record_failure(self, ip: str, email: str):
        """Record a failed authentication attempt."""
        now = datetime.now(timezone.utc)
        
        for key in [f"ip:{ip}", f"email:{email}"]:
            record = await self.collection.find_one({"key": key})
            
            last_attempt_at = record.get("last_attempt_at") if record else None
            if isinstance(last_attempt_at, str):
                last_attempt_at = datetime.fromisoformat(last_attempt_at)
            
            if last_attempt_at and last_attempt_at.tzinfo is None:
                last_attempt_at = last_attempt_at.replace(tzinfo=timezone.utc)
            
            if not last_attempt_at or (now - last_attempt_at).total_seconds() > self.window_seconds:
                # New window, start fresh
                new_attempts = 1
            else:
                new_attempts = record.get("attempts", 0) + 1
            
            blocked_until = None
            if new_attempts >= self.max_attempts:
                blocked_until = now + timedelta(seconds=self.block_duration)
                logger.warning(f"🚫 Blocking {key} until {blocked_until} due to multiple failures")

            # TTL expiry: longest of block or window extension
            ttl_expiry = blocked_until or (now + timedelta(seconds=self.window_seconds * 2))

            await self.collection.update_one(
                {"key": key},
                {
                    "$set": {
                        "attempts": new_attempts,
                        "last_attempt_at": now,
                        "blocked_until": blocked_until,
                        "ttl_expiry": ttl_expiry
                    }
                },
                upsert=True
            )

    async def reset_attempts(self, ip: str, email: str):
        """Clear attempt history on successful login."""
        await self.collection.delete_many({"key": {"$in": [f"ip:{ip}", f"email:{email}"]}})
