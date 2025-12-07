from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any
from datetime import datetime, timezone
import uuid

class DatasetItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str
    data: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Dataset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str
    user_id: str
    item_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
