from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

class DatasetBase(BaseModel):
    name: Optional[str] = None
    run_id: Optional[str] = None

class DatasetCreate(DatasetBase):
    pass

class Dataset(DatasetBase):
    id: str
    user_id: str
    organization_id: Optional[str] = None
    item_count: int = 0
    created_at: datetime
    modified_at: datetime
    accessed_at: datetime

class DatasetItem(BaseModel):
    id: str
    dataset_id: str
    data: Any
    created_at: datetime
