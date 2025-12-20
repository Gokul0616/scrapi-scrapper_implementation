"""Service to seed initial policy categories to the database."""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


async def seed_initial_categories(db) -> None:
    """Seed initial policy categories if they don't exist."""
    logger.info("🔍 Checking for existing categories...")
    
    # Check if categories already exist
    existing_count = await db.categories.count_documents({})
    if existing_count > 0:
        logger.info(f"✅ Categories already seeded ({existing_count} categories found)")
        return
    
    logger.info("📝 Seeding initial policy categories...")
    
    categories = [
        {
            "id": "legal-documents",
            "name": "Legal Documents",
            "description": "Legal policies and terms of service",
            "display_order": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "id": "compliance",
            "name": "Compliance",
            "description": "Compliance policies and regulations",
            "display_order": 1,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        }
    ]
    
    # Insert all categories
    result = await db.categories.insert_many(categories)
    logger.info(f"✅ Successfully seeded {len(result.inserted_ids)} policy categories")
