#!/usr/bin/env python3
"""
Test Scheduler Execution - Create a 1-minute schedule and verify it executes
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

async def test_scheduler_execution():
    """Test that the scheduler actually executes schedules at the right time"""
    
    # Get backend URL
    base_url = "https://auth-smtp-deploy.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    async with aiohttp.ClientSession() as session:
        # Register a test user
        timestamp = int(time.time())
        user_data = {
            "username": f"scheduler_exec_test_{timestamp}",
            "email": f"scheduler_exec_{timestamp}@example.com", 
            "password": "test123",
            "organization_name": "Scheduler Test Org"
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
        
        # Create a schedule that runs every minute
        schedule_data = {
            "actor_id": actor_id,
            "name": "Test 1-Minute Schedule Execution",
            "description": "Test schedule that runs every minute to verify scheduler execution",
            "cron_expression": "*/1 * * * *",  # Every minute
            "timezone": "UTC",
            "input_data": {
                "search_terms": ["test restaurant"],
                "location": "New York, NY",
                "max_results": 5
            },
            "is_enabled": True
        }
        
        print(f"\n🔍 Creating 1-minute interval schedule...")
        async with session.post(f"{api_url}/schedules", json=schedule_data, headers=headers) as response:
            if response.status != 201:
                text = await response.text()
                print(f"❌ Failed to create schedule: {response.status} - {text}")
                return False
            
            schedule = await response.json()
            schedule_id = schedule['id']
            print(f"✅ Schedule created: {schedule_id}")
            print(f"   - Cron: {schedule['cron_expression']}")
            print(f"   - Next run: {schedule.get('next_run', 'N/A')}")
            print(f"   - Enabled: {schedule['is_enabled']}")
        
        # Get initial run count
        async with session.get(f"{api_url}/runs", headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                initial_run_count = data.get('total', 0)
                print(f"📊 Initial run count: {initial_run_count}")
            else:
                initial_run_count = 0
        
        # Wait for 70 seconds to allow the schedule to execute at least once
        print(f"\n⏰ Waiting 70 seconds for scheduler to execute...")
        print(f"   Current time: {datetime.now().strftime('%H:%M:%S')}")
        
        for i in range(7):
            await asyncio.sleep(10)
            print(f"   Waiting... {(i+1)*10}/70 seconds")
        
        print(f"   Current time: {datetime.now().strftime('%H:%M:%S')}")
        
        # Check if new runs were created
        async with session.get(f"{api_url}/runs", headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                final_run_count = data.get('total', 0)
                runs = data.get('runs', [])
                
                print(f"\n📊 Final run count: {final_run_count}")
                print(f"📈 New runs created: {final_run_count - initial_run_count}")
                
                # Check for runs with "Scheduler" origin
                scheduler_runs = [run for run in runs if run.get('origin') == 'Scheduler']
                print(f"🤖 Scheduler-triggered runs: {len(scheduler_runs)}")
                
                if scheduler_runs:
                    print(f"✅ Scheduler execution verified!")
                    for run in scheduler_runs[:3]:  # Show first 3 scheduler runs
                        print(f"   - Run ID: {run['id']}")
                        print(f"   - Status: {run['status']}")
                        print(f"   - Created: {run.get('created_at', 'N/A')}")
                        print(f"   - Origin: {run.get('origin', 'N/A')}")
                else:
                    print(f"❌ No scheduler-triggered runs found")
            else:
                print(f"❌ Failed to get runs: {response.status}")
        
        # Check schedule statistics
        async with session.get(f"{api_url}/schedules/{schedule_id}", headers=headers) as response:
            if response.status == 200:
                updated_schedule = await response.json()
                print(f"\n📊 Schedule Statistics:")
                print(f"   - Run count: {updated_schedule.get('run_count', 0)}")
                print(f"   - Last run: {updated_schedule.get('last_run', 'N/A')}")
                print(f"   - Last status: {updated_schedule.get('last_status', 'N/A')}")
                print(f"   - Last run ID: {updated_schedule.get('last_run_id', 'N/A')}")
                
                if updated_schedule.get('run_count', 0) > 0:
                    print(f"✅ Schedule execution statistics updated!")
                else:
                    print(f"❌ Schedule statistics not updated")
        
        # Clean up - delete schedule
        async with session.delete(f"{api_url}/schedules/{schedule_id}", headers=headers) as response:
            if response.status == 200:
                print(f"\n✅ Test schedule deleted successfully")
            else:
                print(f"\n⚠️ Failed to delete test schedule: {response.status}")
        
        # Final verification
        scheduler_executed = len(scheduler_runs) > 0 if 'scheduler_runs' in locals() else False
        stats_updated = updated_schedule.get('run_count', 0) > 0 if 'updated_schedule' in locals() else False
        
        return scheduler_executed and stats_updated

if __name__ == "__main__":
    print("🚀 Testing Scheduler Execution (1-minute intervals)")
    print("=" * 60)
    
    success = asyncio.run(test_scheduler_execution())
    
    print(f"\n{'='*60}")
    print(f"{'✅ SCHEDULER EXECUTION TEST PASSED' if success else '❌ SCHEDULER EXECUTION TEST FAILED'}")
    print(f"{'='*60}")