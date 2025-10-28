#!/usr/bin/env python3
"""
Test actor update functionality by creating a user's own actor
"""

import requests
import json

BACKEND_URL = "https://scraper-debug-5.preview.emergentagent.com/api"

def test_actor_update_with_user_actor():
    """Test actor update by creating and updating a user's own actor"""
    
    # Register/login
    register_data = {
        "username": "actor_test_user",
        "email": "actortest@scrapi.com", 
        "password": "SecurePass123!",
        "organization_name": "Actor Test Org"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
    if response.status_code != 200:
        login_data = {"username": "actor_test_user", "password": "SecurePass123!"}
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Auth failed: {response.status_code}")
        return False
        
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a new actor
    actor_data = {
        "name": "Test Custom Actor",
        "description": "A test actor for update functionality",
        "icon": "🧪",
        "category": "Testing",
        "type": "custom",
        "code": "console.log('test');",
        "input_schema": {"test_field": {"type": "string"}}
    }
    
    print("Creating custom actor...")
    response = requests.post(f"{BACKEND_URL}/actors", json=actor_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Create actor failed: {response.status_code} - {response.text}")
        return False
        
    actor = response.json()
    actor_id = actor["id"]
    print(f"✅ Created actor: {actor_id}")
    
    # Test update the actor
    update_data = {"is_starred": True}
    print("Testing actor update...")
    response = requests.patch(f"{BACKEND_URL}/actors/{actor_id}", json=update_data, headers=headers)
    if response.status_code == 200:
        updated_actor = response.json()
        if updated_actor.get("is_starred") == True:
            print("✅ Actor update successful!")
            return True
        else:
            print("❌ Actor update did not apply changes")
            return False
    else:
        print(f"❌ Actor update failed: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    success = test_actor_update_with_user_actor()
    if success:
        print("🎉 Actor update functionality works correctly!")
    else:
        print("⚠️ Actor update functionality has issues")