from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class ShieldChallengeResponse(BaseModel):
    nonce: str
    difficulty: int

class ShieldVerifyRequest(BaseModel):
    nonce: str
    solution: int
    fingerprint: Dict[str, Any]
    email: Optional[str] = None
