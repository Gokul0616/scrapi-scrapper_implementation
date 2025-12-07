from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# Lead Chat Models
class LeadChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str  # Dataset item ID
    user_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadChatRequest(BaseModel):
    message: str
    lead_data: Dict[str, Any]  # Business/lead information for context

# Global Chat Models
class GlobalChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: str  # 'user' or 'assistant' or 'system'
    content: str
    function_call: Optional[Dict[str, Any]] = None  # For storing function calls
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GlobalChatRequest(BaseModel):
    message: str
