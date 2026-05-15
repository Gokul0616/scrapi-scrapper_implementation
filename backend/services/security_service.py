import hashlib
import time
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)

class SecurityService:
    def __init__(self, db_collection: AsyncIOMotorCollection):
        self.collection = db_collection
        self.default_difficulty = 4  # Number of leading zeros required in hash hex
        self.max_difficulty = 7
        self.nonce_expiry = 300  # 5 minutes
        
    async def generate_challenge(self, client_ip: str, user_agent: str) -> Dict[str, Any]:
        """
        Generate a unique PoW challenge (nonce) for the client.
        Difficulty can be adjusted based on IP reputation.
        """
        nonce = secrets.token_hex(16)
        # In a real enterprise system, we'd check IP reputation here
        difficulty = self.default_difficulty
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.nonce_expiry)
        
        challenge_doc = {
            "nonce": nonce,
            "difficulty": difficulty,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "created_at": datetime.now(timezone.utc),
            "expires_at": expires_at,
            "is_used": False
        }
        
        await self.collection.insert_one(challenge_doc)
        
        return {
            "nonce": nonce,
            "difficulty": difficulty
        }

    async def verify_shield(self, nonce: str, solution: int, fingerprint: Dict[str, Any], client_ip: str) -> Tuple[bool, str]:
        """
        Verify the PoW solution and environmental fingerprint.
        Includes advanced bot detection logic.
        """
        now = datetime.now(timezone.utc)
        
        # 1. Fetch challenge
        challenge = await self.collection.find_one({"nonce": nonce})
        if not challenge:
            return False, "Challenge not found"
            
        if challenge["expires_at"].replace(tzinfo=timezone.utc) < now:
            return False, "Challenge expired"
            
        # 2. Prevent Replay Attacks (with Grace Period for multi-step forms)
        if challenge.get("is_used", False):
            # Allow reuse ONLY if it's the same IP/UA and within a short grace period (e.g., 2 minutes)
            last_used_at = challenge.get("last_used_at")
            if not last_used_at or (now - last_used_at.replace(tzinfo=timezone.utc)).total_seconds() > 120:
                return False, "Challenge already used"
            
            if challenge["client_ip"] != client_ip:
                return False, "Security violation: Challenge reuse from different IP"
        
        # 3. Request-Session Binding
        if challenge["client_ip"] != client_ip:
             return False, "IP mismatch - token bound to another network"

        # 4. Verify Proof-of-Work
        difficulty = challenge["difficulty"]
        data = f"{nonce}{solution}".encode()
        solution_hash = hashlib.sha256(data).hexdigest()
        
        if not solution_hash.startswith("0" * difficulty):
            return False, "Invalid Proof-of-Work solution"

        # 5. 🛡️ Advanced Fingerprint Analysis (Bot Detection)
        if not fingerprint:
            return False, "Device telemetry missing"
            
        # A. Automation check (Webdriver)
        if fingerprint.get("webdriver") is True:
            logger.warning(f"🛡️ Bot Detected: Webdriver enabled for IP {client_ip}")
            return False, "Automated browser detected"

        # B. Timing Analysis
        duration_ms = fingerprint.get("duration_ms", 0)
        total_time = fingerprint.get("total_time", 0)
        
        if duration_ms < 100 and client_ip not in ("127.0.0.1", "::1", "localhost"):
            logger.warning(f"🛡️ Bot Detected: Impossible PoW speed ({duration_ms}ms) for IP {client_ip}")
            return False, "Abnormally fast security solution"
            
        # C. Hardware Consistency
        cores = fingerprint.get("cores", 0)
        ua = fingerprint.get("ua", "").lower()
        
        # Heuristic: Mac/Windows desktop rarely have < 2 cores nowadays
        if ("macintosh" in ua or "windows" in ua) and cores < 2:
            logger.warning(f"🛡️ Bot Detected: Low core count ({cores}) on desktop UA for IP {client_ip}")
            return False, "Virtualized environment detected"

        # 6. Mark as used and record usage
        await self.collection.update_one(
            {"nonce": nonce}, 
            {
                "$set": {
                    "is_used": True,
                    "last_used_at": now
                }
            }
        )
        
        return True, "Success"

    async def ensure_indexes(self):
        """Create TTL index for automatic expiration of challenges."""
        try:
            await self.collection.create_index("expires_at", expireAfterSeconds=0)
            await self.collection.create_index("nonce", unique=True)
            logger.info("🛡️ SecurityService indexes ensured")
        except Exception as e:
            logger.error(f"Error creating SecurityService indexes: {e}")
