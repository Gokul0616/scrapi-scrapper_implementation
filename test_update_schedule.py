#!/usr/bin/env python3
"""
Test Update Schedule Functionality
"""

import asyncio
import aiohttp
import json
import time

async def test_update_schedule():
    """Test the update schedule endpoint specifically"""
    
    # Get backend URL
    base_url = "https://scheduler-fix-3.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    async with aiohttp.ClientSession() as session:
        # Register a test user
        timestamp = int(time.time())
        user_data = {
            "username": f"update_test_user_{timestamp}",
            "email": f"update_test_{timestamp}@example.com", 
            "password": "test123",
            "organization_name": "Test Org"
        }
        
        # Register user
        async with session.post(f"{api_url}/auth/register", json=user_data) as response:
            if response.status != 200:
                print(f"❌ Registration failed: {response.status}")
                return False
            
            data = await response.json()
            auth_token = data['access_token']
            headers = {"Authorization": f"Bearer {auth_token}"}
            print(f"✅ User registered successfully")
        
        # Get actors
        async with session.get(f"{api_url}/actors", headers=headers) as response:
            if response.status != 200:
                print(f"❌ Failed to get actors: {response.status}")
                return False
            
            actors = await response.json()
            if not actors:
                print(f"❌ No actors available")
                return False
            
            actor_id = actors[0]['id']
            print(f"✅ Found actor: {actors[0]['name']}")
        
        # Create a test schedule
        schedule_data = {
            "actor_id": actor_id,
            "name": "Test Update Schedule",
            "description": "Test schedule for update functionality",
            "cron_expression": "0 9 * * *",
            "timezone": "UTC",
            "input_data": {"test": "data"},
            "is_enabled": True
        }
        
        async with session.post(f"{api_url}/schedules", json=schedule_data, headers=headers) as response:
            if response.status != 201:
                text = await response.text()
                print(f"❌ Failed to create schedule: {response.status} - {text}")
                return False
            
            schedule = await response.json()
            schedule_id = schedule['id']
            print(f"✅ Schedule created: {schedule_id}")
        
        # Test update schedule
        update_data = {
            "name": "Updated Schedule Name",
            "description": "Updated description",
            "cron_expression": "0 10 * * *",
            "input_data": {"updated": "data"}
        }
        
        async with session.patch(f"{api_url}/schedules/{schedule_id}", json=update_data, headers=headers) as response:
            if response.status != 200:
                text = await response.text()
                print(f"❌ Failed to update schedule: {response.status} - {text}")
                return False
            
            updated_schedule = await response.json()
            print(f"✅ Schedule updated successfully")
            print(f"   - New name: {updated_schedule['name']}")
            print(f"   - New cron: {updated_schedule['cron_expression']}")
            
            # Verify updates
            if updated_schedule['name'] == update_data['name']:
                print(f"   ✅ Name update verified")
            else:
                print(f"   ❌ Name update failed")
                
            if updated_schedule['cron_expression'] == update_data['cron_expression']:
                print(f"   ✅ Cron update verified")
            else:
                print(f"   ❌ Cron update failed")
        
        # Test disable schedule
        async with session.post(f"{api_url}/schedules/{schedule_id}/disable", headers=headers) as response:
            if response.status != 200:
                text = await response.text()
                print(f"❌ Failed to disable schedule: {response.status} - {text}")
                return False
            
            result = await response.json()
            print(f"✅ Schedule disabled: {result['message']}")
        
        # Clean up - delete schedule
        async with session.delete(f"{api_url}/schedules/{schedule_id}", headers=headers) as response:
            if response.status == 200:
                print(f"✅ Schedule deleted successfully")
            else:
                print(f"⚠️ Failed to delete schedule: {response.status}")
        
        return True

if __name__ == "__main__":
    success = asyncio.run(test_update_schedule())
    print(f"\n{'✅ Test PASSED' if success else '❌ Test FAILED'}")