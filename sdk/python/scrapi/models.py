"""
Request model — equivalent to Scrapi's Request class.
"""
from __future__ import annotations
import hashlib
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class Request:
    """Represents a single URL request in a Request Queue."""

    url: str
    unique_key: Optional[str] = None    # SHA-256(url) if not provided
    method: str = "GET"
    headers: Dict[str, str] = field(default_factory=dict)
    payload: Optional[Dict[str, Any]] = None
    no_retry: bool = False
    user_data: Dict[str, Any] = field(default_factory=dict)

    # Set by platform after processing
    id: Optional[str] = None
    retry_count: int = 0
    loaded_url: Optional[str] = None
    handled_at: Optional[str] = None
    status: Optional[str] = None

    def __post_init__(self):
        if self.unique_key is None:
            self.unique_key = hashlib.sha256(self.url.encode()).hexdigest()

    @classmethod
    def from_url(cls, url: str, **kwargs) -> "Request":
        """
        Convenience constructor.
        Usage: Request.from_url('https://example.com')
        """
        return cls(url=url, unique_key=url, **kwargs)

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "unique_key": self.unique_key,
            "method": self.method,
            "headers": self.headers,
            "payload": self.payload,
            "no_retry": self.no_retry,
            "user_data": self.user_data,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Request":
        return cls(
            url=d["url"],
            unique_key=d.get("unique_key") or d.get("uniqueKey"),
            method=d.get("method", "GET"),
            headers=d.get("headers", {}),
            payload=d.get("payload"),
            no_retry=d.get("no_retry", False) or d.get("noRetry", False),
            user_data=d.get("user_data", {}),
            id=d.get("id"),
            retry_count=d.get("retry_count", 0),
            loaded_url=d.get("loaded_url"),
            handled_at=d.get("handled_at"),
            status=d.get("status"),
        )
