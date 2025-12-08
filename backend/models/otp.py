from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

class OTP(BaseModel):
    """OTP model for email verification."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    otp_code: str
    purpose: str  # 'login' or 'register'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=10))
    is_used: bool = False
    attempts: int = 0
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "otp_code": "123456",
                "purpose": "login"
            }
        }

class SendOTPRequest(BaseModel):
    """Request to send OTP."""
    email: EmailStr
    purpose: str = "login"  # 'login' or 'register'

class VerifyOTPRequest(BaseModel):
    """Request to verify OTP."""
    email: EmailStr
    otp_code: str
    purpose: str = "login"

class OTPResponse(BaseModel):
    """OTP response."""
    success: bool
    message: str
    email: Optional[str] = None
