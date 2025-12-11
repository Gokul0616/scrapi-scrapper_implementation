import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add backend to path to import models
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.append(str(backend_path))

from auth import hash_password

# Load env vars
load_dotenv(backend_path / '.env')

async def seed_data():
    print("🌱 Starting data seeding...")
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'scrapi')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clean existing data? Maybe just append or upsert.
    # Requirement: "add 100 users and 20 admin users and one owner"
    # I'll clear them to avoid duplicates for now or check existence.
    
    print("Cleaning existing test users...")
    await db.users.delete_many({"username": {"$regex": "^testuser_"}})
    await db.admin_users.delete_many({"username": {"$regex": "^adminuser_"}})
    
    # 1. Create Owner
    owner_email = "owner@scrapi.com"
    owner = await db.admin_users.find_one({"email": owner_email})
    
    if not owner:
        print(f"Creating owner: {owner_email}")
        from models import AdminUser
        owner_user = AdminUser(
            username="owner",
            email=owner_email,
            hashed_password=hash_password("owner123"),
            organization_name="Scrapi Corp",
            role="owner",
            is_active=True
        )
        doc = owner_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.admin_users.insert_one(doc)
    else:
        print(f"Owner {owner_email} already exists")

    # 2. Create 20 Admins
    print("Creating 20 admin users...")
    admin_docs = []
    # Specific admin requested: admin@scrapi.com
    specific_admin_email = "admin@scrapi.com"
    specific_admin = await db.admin_users.find_one({"email": specific_admin_email})
    
    if not specific_admin:
        from models import AdminUser
        adm = AdminUser(
            username="admin",
            email=specific_admin_email,
            hashed_password=hash_password("admin123"),
            organization_name="Admin Org",
            role="admin",
            is_active=True
        )
        doc = adm.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        admin_docs.append(doc)

    for i in range(1, 20):
        from models import AdminUser
        adm = AdminUser(
            username=f"adminuser_{i}",
            email=f"admin{i}@example.com",
            hashed_password=hash_password(f"adminpass{i}"),
            organization_name=f"Admin Org {i}",
            role="admin",
            is_active=True
        )
        doc = adm.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        admin_docs.append(doc)
        
    if admin_docs:
        await db.admin_users.insert_many(admin_docs)
        
    # 3. Create 100 Users
    print("Creating 100 regular users...")
    user_docs = []
    for i in range(1, 101):
        from models import User
        usr = User(
            username=f"testuser_{i}",
            email=f"user{i}@example.com",
            hashed_password=hash_password(f"userpass{i}"),
            organization_name=f"User Org {i}",
            role="user",
            plan="Free" if i % 2 == 0 else "Pro",
            is_active=True
        )
        doc = usr.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        user_docs.append(doc)
        
    if user_docs:
        await db.users.insert_many(user_docs)

    print("✅ Seeding complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
