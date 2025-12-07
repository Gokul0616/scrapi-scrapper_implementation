#!/usr/bin/env python3
"""
Quick test of scheduler functionality
"""

import asyncio
import aiohttp
import json
import time

async def quick_test():
    base_url = "https://dev-environment-49.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    async with aiohttp.ClientSession() as session:
        # Register user
        timestamp = int(time.time())
        user_data = {
            "username": f"quick_test_{timestamp}",
            "email": f"quick_test_{timestamp}@example.com", 
            "password": "test123",
            "organization_name": "Test"
        }
        
        async with session.post(f"{api_url}/auth/register", json=user_data) as response:
            if response.status != 200:
                print(f"❌ Registration failed: {response.status}")
                return False
            
            data = await response.json()
            headers = {"Authorization": f"Bearer {data['access_token']}"}
            print(f"✅ User registered")
        
        # Get actors
        async with session.get(f"{api_url}/actors", headers=headers) as response:
            actors = await response.json()
            actor_id = actors[0]['id']
            print(f"✅ Found actor: {actors[0]['name']}")
        
        # Test manual run trigger (this should update schedule stats)
        schedule_data = {
            "actor_id": actor_id,
            "name": "Quick Test Schedule",
            "cron_expression": "0 9 * * *",
            "timezone": "UTC",
            "input_data": {"test": "data"},
            "is_enabled": True
        }
        
        async with session.post(f"{api_url}/schedules", json=schedule_data, headers=headers) as response:
            schedule = await response.json()
            schedule_id = schedule['id']
            print(f"✅ Schedule created: {schedule_id}")
        
        # Trigger manual run
        async with session.post(f"{api_url}/schedules/{schedule_id}/run-now", headers=headers) as response:
            result = await response.json()
            print(f"✅ Manual run triggered: {result['run_id']}")
        
        # Wait a moment for the run to start
        await asyncio.sleep(3)
        
        # Check schedule stats
        async with session.get(f"{api_url}/schedules/{schedule_id}", headers=headers) as response:
            schedule = await response.json()
            print(f"📊 Schedule stats:")
            print(f"   - Run count: {schedule.get('run_count', 0)}")
            print(f"   - Last run: {schedule.get('last_run', 'N/A')}")
            print(f"   - Last status: {schedule.get('last_status', 'N/A')}")
        
        # Clean up
        async with session.delete(f"{api_url}/schedules/{schedule_id}", headers=headers) as response:
            print(f"✅ Schedule deleted")
        
        return schedule.get('run_count', 0) > 0

if __name__ == "__main__":
    success = asyncio.run(quick_test())
    print(f"{'✅ SUCCESS' if success else '❌ FAILED'}")