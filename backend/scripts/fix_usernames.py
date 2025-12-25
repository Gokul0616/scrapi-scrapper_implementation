#!/usr/bin/env python3
"""
Script to fix existing usernames that are emails and replace them with generated usernames
"""
import asyncio
import sys
import os
import re

sys.path.append('/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from utils.username_generator import generate_unique_username

# Email regex pattern
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

async def fix_usernames():
    """Fix usernames that are emails by generating proper usernames"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.scrapi_db
    
    print("🔍 Scanning for users with email-based usernames...")
    
    # Get all existing usernames to avoid duplicates
    existing_usernames = set()
    async for user in db.users.find({}, {"username": 1}):
        username = user.get("username")
        if username and not EMAIL_PATTERN.match(username):
            existing_usernames.add(username)
    
    print(f"✅ Found {len(existing_usernames)} valid usernames in database")
    
    # Find users with email-based usernames
    users_to_fix = []
    async for user in db.users.find({}, {"_id": 1, "id": 1, "username": 1, "email": 1}):
        username = user.get("username", "")
        if EMAIL_PATTERN.match(username):
            users_to_fix.append(user)
    
    if not users_to_fix:
        print("✅ No users found with email-based usernames. All good!")
        return
    
    print(f"🔧 Found {len(users_to_fix)} users with email-based usernames")
    print("=" * 60)
    
    # Fix each user
    fixed_count = 0
    for user in users_to_fix:
        old_username = user.get("username")
        user_id = user.get("id")
        email = user.get("email")
        
        # Generate unique username
        new_username = generate_unique_username(existing_usernames)
        existing_usernames.add(new_username)
        
        # Update user in database
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": {"username": new_username}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Updated user {email}")
            print(f"   Old username: {old_username}")
            print(f"   New username: {new_username}")
            print("-" * 60)
            fixed_count += 1
        else:
            print(f"❌ Failed to update user {email}")
    
    print("=" * 60)
    print(f"✅ Successfully updated {fixed_count} out of {len(users_to_fix)} users")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_usernames())
