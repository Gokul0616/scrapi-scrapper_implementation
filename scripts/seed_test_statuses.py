import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import uuid

# Add backend to path to import models
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.append(str(backend_path))

from auth import hash_password

# Load env vars
load_dotenv(backend_path / '.env')

async def seed_test_statuses():
    print("🌱 Creating test users with different statuses...")
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'scrapi')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # 1. Create users scheduled for deletion (pending_deletion)
    print("Creating 10 users scheduled for deletion...")
    for i in range(1, 11):
        user_id = str(uuid.uuid4())
        deletion_scheduled = datetime.now(timezone.utc) - timedelta(days=i)
        permanent_deletion = deletion_scheduled + timedelta(days=30)
        
        user_doc = {
            "id": user_id,
            "username": f"pending_delete_{i}",
            "email": f"pending{i}@example.com",
            "hashed_password": hash_password("password123"),
            "organization_name": f"Pending Org {i}",
            "first_name": None,
            "last_name": None,
            "plan": "Free",
            "role": "user",
            "is_active": True,
            "account_status": "pending_deletion",
            "deletion_scheduled_at": deletion_scheduled.isoformat(),
            "permanent_deletion_at": permanent_deletion.isoformat(),
            "deletion_password_hash": hash_password("password123"),
            "deletion_reminder_sent": False,
            "last_login_at": None,
            "last_path": None,
            "profile_color": "#8B5CF6",
            "theme_preference": "light",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30+i)).isoformat()
        }
        
        await db.users.insert_one(user_doc)
    
    # 2. Create deleted accounts in legal retention
    print("Creating 5 deleted accounts in legal retention...")
    for i in range(1, 6):
        user_id = str(uuid.uuid4())
        account_created = datetime.now(timezone.utc) - timedelta(days=365)
        account_deleted = datetime.now(timezone.utc) - timedelta(days=i*10)
        retention_expires = account_deleted + timedelta(days=365*7)  # 7 years
        
        deleted_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "username": f"deleted_user_{i}",
            "email": f"deleted{i}@example.com",
            "organization_name": f"Deleted Org {i}",
            "account_created_at": account_created.isoformat(),
            "account_deleted_at": account_deleted.isoformat(),
            "deletion_reason": "User requested deletion",
            "last_login_at": (account_deleted - timedelta(days=5)).isoformat(),
            "retention_expires_at": retention_expires.isoformat()
        }
        
        await db.deleted_accounts_legal_retention.insert_one(deleted_doc)
    
    # 3. Create some suspended users
    print("Creating 8 suspended users...")
    for i in range(1, 9):
        user_id = str(uuid.uuid4())
        
        user_doc = {
            "id": user_id,
            "username": f"suspended_user_{i}",
            "email": f"suspended{i}@example.com",
            "hashed_password": hash_password("password123"),
            "organization_name": f"Suspended Org {i}",
            "first_name": None,
            "last_name": None,
            "plan": "Pro" if i % 2 == 0 else "Free",
            "role": "user",
            "is_active": False,  # Suspended
            "account_status": "active",
            "deletion_scheduled_at": None,
            "permanent_deletion_at": None,
            "deletion_password_hash": None,
            "deletion_reminder_sent": False,
            "last_login_at": (datetime.now(timezone.utc) - timedelta(days=i*5)).isoformat(),
            "last_path": None,
            "profile_color": "#EC4899",
            "theme_preference": "light",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=60+i)).isoformat()
        }
        
        await db.users.insert_one(user_doc)
    
    print("✅ Test status users created successfully!")
    
    # Print summary
    print("\n📊 Database Summary:")
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True, "account_status": "active"})
    suspended = await db.users.count_documents({"is_active": False})
    pending_deletion = await db.users.count_documents({"account_status": "pending_deletion"})
    deleted = await db.deleted_accounts_legal_retention.count_documents({})
    
    print(f"  Total users: {total_users}")
    print(f"  Active users: {active_users}")
    print(f"  Suspended users: {suspended}")
    print(f"  Pending deletion: {pending_deletion}")
    print(f"  Deleted (legal retention): {deleted}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_test_statuses())
