"""
Rate Limiter Middleware — Phase 4.2
Redis-based sliding window rate limiter per API key and per user plan.

Limits:
  Free:       60 req/min,  500 req/hour
  Pro:        300 req/min, 5000 req/hour
  Business:   1000 req/min, unlimited
  Enterprise: unlimited

Only applied to requests using API key auth (X-Scrapi-Api-Key or Bearer scrapi_api_*).
JWT (session) auth is not rate-limited here.
"""

import hashlib
import logging
import time
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# ── Plan limits ───────────────────────────────────────────────────────────────
PLAN_LIMITS = {
    "free":       {"per_min": 60,   "per_hour": 500},
    "starter":    {"per_min": 300,  "per_hour": 5000},
    "growth":     {"per_min": 1000, "per_hour": 20000},  # High cap for Growth
    "scale":      {"per_min": None, "per_hour": None},   # Unlimited for Scale
    "enterprise": {"per_min": None, "per_hour": None},   # Unlimited for Enterprise
}

DEFAULT_LIMITS = PLAN_LIMITS["free"]


def _plan_key(plan: str) -> str:
    return plan.lower().replace(" ", "_")


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Inspect every request for an API key.
    If found, enforce sliding-window rate limits via Redis.
    If Redis is unavailable, fail open (allow request, log warning).
    """

    def __init__(self, app, redis_url: str = "redis://localhost:6379/1"):
        super().__init__(app)
        self._redis_url = redis_url
        self._redis = None   # lazy-init, set in _get_redis()

    async def _get_redis(self):
        if self._redis is None:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(
                    self._redis_url, encoding="utf-8", decode_responses=True
                )
                await self._redis.ping()
            except Exception as exc:
                logger.warning(f"Rate limiter: Redis unavailable ({exc}). Skipping rate limit.")
                self._redis = None
        return self._redis

    def _extract_api_key(self, request: Request) -> Optional[str]:
        """Extract raw API key from Authorization header or X-Scrapi-Api-Key header."""
        # Custom header (standard and legacy)
        custom = request.headers.get("X-API-Key") or request.headers.get("X-Scrapi-Api-Key")
        if custom and custom.startswith("scrapi_api_"):
            return custom

        # Bearer token
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
            if token.startswith("scrapi_api_"):
                return token

        return None

    async def dispatch(self, request: Request, call_next):
        raw_key = self._extract_api_key(request)

        if not raw_key:
            # Not an API key request — skip rate limiting entirely
            return await call_next(request)

        r = await self._get_redis()
        if r is None:
            # Redis down — fail open
            return await call_next(request)

        limits = {}
        plan = "unknown"
        try:
            # Look up the key document to get user's plan
            from database import get_db
            db = get_db()
            key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
            key_doc = await db.api_keys.find_one({"key_hash": key_hash}, {"user_id": 1, "organization_id": 1})

            if not key_doc:
                # Invalid key — let auth middleware handle the 401
                return await call_next(request)

            org_id = key_doc.get("organization_id")
            if org_id:
                # Resolve plan from organization
                org = await db.organizations.find_one({"id": org_id}, {"plan": 1})
                plan_name = org.get("plan", "free") if org else "free"
            else:
                # Standard user-level plan
                user_id = key_doc["user_id"]
                user = await db.users.find_one({"id": user_id}, {"plan": 1})
                plan_name = user.get("plan", "free") if user else "free"

            plan = _plan_key(plan_name)
            limits = PLAN_LIMITS.get(plan, DEFAULT_LIMITS)

            bucket_id = hashlib.sha256(raw_key.encode()).hexdigest()[:16]
            now = int(time.time())

            # ── Per-minute check ──────────────────────────────────────────────
            if limits["per_min"] is not None:
                min_key = f"rl:{bucket_id}:min:{now // 60}"
                pipe = r.pipeline()
                pipe.incr(min_key)
                pipe.expire(min_key, 70)   # 70s TTL (slight grace)
                results = await pipe.execute()
                count_min = results[0]

                if count_min > limits["per_min"]:
                    return JSONResponse(
                        status_code=429,
                        content={
                            "detail": f"Rate limit exceeded: {limits['per_min']} requests per minute on {plan} plan.",
                            "limit": limits["per_min"],
                            "window": "minute",
                            "plan": plan,
                        },
                        headers={
                            "X-RateLimit-Limit-Minute": str(limits["per_min"]),
                            "X-RateLimit-Remaining-Minute": str(max(0, limits["per_min"] - count_min)),
                            "Retry-After": "60",
                        },
                    )

            # ── Per-hour check ────────────────────────────────────────────────
            if limits["per_hour"] is not None:
                hour_key = f"rl:{bucket_id}:hour:{now // 3600}"
                pipe = r.pipeline()
                pipe.incr(hour_key)
                pipe.expire(hour_key, 3700)   # 1h + 100s grace
                results = await pipe.execute()
                count_hour = results[0]

                if count_hour > limits["per_hour"]:
                    return JSONResponse(
                        status_code=429,
                        content={
                            "detail": f"Rate limit exceeded: {limits['per_hour']} requests per hour on {plan} plan.",
                            "limit": limits["per_hour"],
                            "window": "hour",
                            "plan": plan,
                        },
                        headers={
                            "X-RateLimit-Limit-Hour": str(limits["per_hour"]),
                            "Retry-After": "3600",
                        },
                    )

        except Exception as exc:
            logger.warning(f"Rate limiter error (fail open): {exc}")

        response = await call_next(request)

        # Inject rate limit headers into response
        try:
            if limits.get("per_min"):
                response.headers["X-RateLimit-Limit-Minute"] = str(limits["per_min"])
            if limits.get("per_hour"):
                response.headers["X-RateLimit-Limit-Hour"] = str(limits["per_hour"])
        except Exception:
            pass

        return response
