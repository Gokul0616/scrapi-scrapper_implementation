import uuid
import logging
from datetime import datetime
from typing import Optional, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.dataset import Dataset

logger = logging.getLogger(__name__)

class DatasetService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.datasets = db.datasets
        self.dataset_items = db.dataset_items

    async def ensure_indexes(self):
        """Create indexes for performance and expiration."""
        await self.datasets.create_index([("user_id", 1), ("name", 1)], unique=True, sparse=True)
        await self.datasets.create_index([("run_id", 1)])
        await self.dataset_items.create_index([("dataset_id", 1)])
        logger.info("✅ Dataset indexes ensured")

    async def create_dataset(
        self, user_id: str, name: Optional[str] = None, run_id: Optional[str] = None, org_id: Optional[str] = None
    ) -> Dataset:
        """Create a new dataset (named or unnamed)."""
        now = datetime.utcnow()
        dataset_id = str(uuid.uuid4())
        
        doc = {
            "id": dataset_id,
            "user_id": user_id,
            "organization_id": org_id,
            "name": name,
            "run_id": run_id,
            "item_count": 0,
            "created_at": now,
            "modified_at": now,
            "accessed_at": now,
        }
        
        await self.datasets.insert_one(doc)
        return Dataset(**doc)

    async def get_dataset(self, dataset_id_or_name: str, user_id: str) -> Optional[Dataset]:
        """Fetch dataset metadata by ID or name."""
        # Try finding by ID first
        doc = await self.datasets.find_one({"id": dataset_id_or_name, "user_id": user_id})
        if not doc:
            # Fallback to name
            doc = await self.datasets.find_one({"name": dataset_id_or_name, "user_id": user_id})
        
        if not doc:
            return None
            
        return Dataset(**doc)

    async def push_data(self, dataset_id: str, data: Any) -> None:
        """Append data to a dataset."""
        now = datetime.utcnow()
        
        # Normalize data to a list for batch insertion
        if not isinstance(data, list):
            data = [data]
            
        if not data:
            return

        items = []
        for row in data:
            items.append({
                "id": str(uuid.uuid4()),
                "dataset_id": dataset_id,
                "data": row,
                "created_at": now
            })
            
        await self.dataset_items.insert_many(items)
        
        # Update metadata stats
        await self.datasets.update_one(
            {"id": dataset_id},
            {
                "$inc": {"item_count": len(data)},
                "$set": {"modified_at": now, "accessed_at": now}
            }
        )

    async def get_data(self, dataset_id: str, limit: int = 1000, offset: int = 0) -> dict:
        """Retrieve dataset rows with pagination."""
        cursor = self.dataset_items.find({"dataset_id": dataset_id})\
                                   .sort("created_at", 1)\
                                   .skip(offset)\
                                   .limit(limit)
        
        items = await cursor.to_list(length=limit)
        
        # Get total count
        dataset = await self.datasets.find_one({"id": dataset_id})
        total = dataset.get("item_count", 0) if dataset else 0
        
        # Clean up data for response
        for item in items:
            item.pop("_id", None)
            
        return {
            "items": [item["data"] for item in items],
            "total": total,
            "offset": offset,
            "limit": limit
        }

    async def delete_dataset(self, dataset_id: str, user_id: str) -> bool:
        """Delete a dataset and all its rows."""
        result = await self.datasets.delete_one({"id": dataset_id, "user_id": user_id})
        if result.deleted_count > 0:
            await self.dataset_items.delete_many({"dataset_id": dataset_id})
            return True
        return False
