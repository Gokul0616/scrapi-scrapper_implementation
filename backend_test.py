#!/usr/bin/env python3
"""
Backend Testing Suite for Scheduler Functionality
Tests comprehensive scheduler API endpoints and functionality
"""

import asyncio
import aiohttp
import json
import os
import sys
import time
from typing import Dict, Any, List
from datetime import datetime

# Add backend to path
sys.path.append('/app/backend')

class SchedulerTester:
    def __init__(self):
        # Get backend URL from frontend env
        self.base_url = "https://quick-auth-flow.preview.emergentagent.com"
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.base_url = line.split('=')[1].strip()
                        break
        except Exception:
            pass  # Use default URL
        
        self.api_url = f"{self.base_url}/api"
        self.session = None
        self.auth_token = None
        self.test_results = []
        self.test_schedule_id = None
        self.test_actor_id = None
        
        print(f"🔧 Backend URL: {self.base_url}")
        print(f"🔧 API URL: {self.api_url}")
    
    async def setup_session(self):
        """Setup HTTP session and authenticate"""
        self.session = aiohttp.ClientSession()
        
        # Test authentication with provided credentials
        auth_data = {
            "username": "scheduler_test@example.com",
            "password": "scheduler123"
        }
        
        try:
            async with self.session.post(f"{self.api_url}/auth/login", json=auth_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data['access_token']
                    print(f"✅ Authentication successful")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.status}")
                    # Try to register new user
                    return await self.register_test_user()
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    async def register_test_user(self):
        """Register a new test user"""
        timestamp = int(time.time())
        user_data = {
            "username": f"scheduler_test_user_{timestamp}",
            "email": f"scheduler_test_{timestamp}@example.com",
            "password": "scheduler123",
            "organization_name": "Scheduler Test Organization"
        }
        
        try:
            async with self.session.post(f"{self.api_url}/auth/register", json=user_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data['access_token']
                    print(f"✅ User registration successful: {user_data['username']}")
                    return True
                else:
                    text = await response.text()
                    print(f"❌ User registration failed: {response.status} - {text}")
                    return False
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return False
    
    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    async def get_test_actor(self):
        """Get a test actor for scheduling"""
        print("\n🔍 Getting test actor for scheduling...")
        
        try:
            async with self.session.get(f"{self.api_url}/actors", headers=self.get_headers()) as response:
                if response.status == 200:
                    actors = await response.json()
                    
                    # Find a suitable actor (prefer Google Maps Scraper V2)
                    test_actor = None
                    for actor in actors:
                        if actor.get('name') == 'Google Maps Scraper V2':
                            test_actor = actor
                            break
                    
                    if not test_actor and actors:
                        test_actor = actors[0]  # Use first available actor
                    
                    if test_actor:
                        self.test_actor_id = test_actor['id']
                        print(f"✅ Found test actor: {test_actor['name']} (ID: {test_actor['id']})")
                        return test_actor
                    else:
                        print(f"❌ No actors found")
                        return None
                else:
                    text = await response.text()
                    print(f"❌ Failed to get actors: {response.status} - {text}")
                    return None
        except Exception as e:
            print(f"❌ Error getting actors: {e}")
            return None
    
    async def test_create_schedule(self):
        """Test POST /api/schedules endpoint"""
        print("\n🔍 Testing CREATE schedule endpoint...")
        
        if not self.test_actor_id:
            actor = await self.get_test_actor()
            if not actor:
                self.test_results.append({
                    'test': 'Create Schedule',
                    'status': 'FAIL',
                    'details': 'No test actor available'
                })
                return None
        
        schedule_data = {
            "actor_id": self.test_actor_id,
            "name": "Test Daily Google Maps Scraping",
            "description": "Automated daily scraping of business data from Google Maps",
            "cron_expression": "0 9 * * *",  # Daily at 9 AM
            "timezone": "UTC",
            "input_data": {
                "search_terms": ["restaurants", "cafes"],
                "location": "New York, NY",
                "max_results": 50
            },
            "is_enabled": True
        }
        
        try:
            async with self.session.post(f"{self.api_url}/schedules", json=schedule_data, headers=self.get_headers()) as response:
                if response.status == 201:
                    schedule = await response.json()
                    self.test_schedule_id = schedule['id']
                    print(f"✅ Schedule created successfully")
                    print(f"   - Schedule ID: {schedule['id']}")
                    print(f"   - Name: {schedule['name']}")
                    print(f"   - Cron: {schedule['cron_expression']}")
                    print(f"   - Enabled: {schedule['is_enabled']}")
                    
                    self.test_results.append({
                        'test': 'Create Schedule',
                        'status': 'PASS',
                        'details': f"Schedule created with ID {schedule['id']}"
                    })
                    return schedule
                else:
                    text = await response.text()
                    print(f"❌ Failed to create schedule: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Create Schedule',
                        'status': 'FAIL',
                        'details': f'API error: {response.status} - {text}'
                    })
                    return None
        except Exception as e:
            print(f"❌ Error creating schedule: {e}")
            self.test_results.append({
                'test': 'Create Schedule',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return None
    
    async def test_get_schedules(self):
        """Test GET /api/schedules endpoint"""
        print("\n🔍 Testing GET schedules endpoint...")
        
        try:
            # Test with pagination
            params = {"page": 1, "limit": 10}
            async with self.session.get(f"{self.api_url}/schedules", params=params, headers=self.get_headers()) as response:
                if response.status == 200:
                    data = await response.json()
                    schedules = data.get('schedules', [])
                    total = data.get('total', 0)
                    
                    print(f"✅ Retrieved schedules successfully")
                    print(f"   - Total schedules: {total}")
                    print(f"   - Schedules in page: {len(schedules)}")
                    print(f"   - Page: {data.get('page', 1)}")
                    print(f"   - Limit: {data.get('limit', 10)}")
                    
                    # Verify pagination structure
                    required_fields = ['schedules', 'total', 'page', 'limit', 'pages']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        print(f"   ⚠️ Missing pagination fields: {missing_fields}")
                    
                    # Verify schedule structure if any schedules exist
                    if schedules:
                        schedule = schedules[0]
                        expected_fields = ['id', 'name', 'cron_expression', 'is_enabled', 'actor_id', 'created_at']
                        schedule_missing = [field for field in expected_fields if field not in schedule]
                        
                        if schedule_missing:
                            print(f"   ⚠️ Missing schedule fields: {schedule_missing}")
                        else:
                            print(f"   ✅ Schedule structure is valid")
                    
                    self.test_results.append({
                        'test': 'Get Schedules',
                        'status': 'PASS',
                        'details': f"Retrieved {len(schedules)} schedules with pagination"
                    })
                    return schedules
                else:
                    text = await response.text()
                    print(f"❌ Failed to get schedules: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Get Schedules',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return []
        except Exception as e:
            print(f"❌ Error getting schedules: {e}")
            self.test_results.append({
                'test': 'Get Schedules',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return []
    
    async def test_get_schedule_by_id(self):
        """Test GET /api/schedules/{schedule_id} endpoint"""
        print("\n🔍 Testing GET schedule by ID endpoint...")
        
        if not self.test_schedule_id:
            print("❌ No test schedule ID available")
            self.test_results.append({
                'test': 'Get Schedule by ID',
                'status': 'FAIL',
                'details': 'No test schedule ID available'
            })
            return None
        
        try:
            async with self.session.get(f"{self.api_url}/schedules/{self.test_schedule_id}", headers=self.get_headers()) as response:
                if response.status == 200:
                    schedule = await response.json()
                    print(f"✅ Retrieved schedule by ID successfully")
                    print(f"   - Schedule ID: {schedule['id']}")
                    print(f"   - Name: {schedule['name']}")
                    print(f"   - Cron: {schedule['cron_expression']}")
                    print(f"   - Human readable: {schedule.get('human_readable', 'N/A')}")
                    print(f"   - Next run: {schedule.get('next_run', 'N/A')}")
                    
                    # Verify required fields
                    required_fields = ['id', 'name', 'cron_expression', 'is_enabled', 'actor_id']
                    missing_fields = [field for field in required_fields if field not in schedule]
                    
                    if missing_fields:
                        print(f"   ⚠️ Missing fields: {missing_fields}")
                    else:
                        print(f"   ✅ All required fields present")
                    
                    self.test_results.append({
                        'test': 'Get Schedule by ID',
                        'status': 'PASS',
                        'details': f"Retrieved schedule {schedule['id']} successfully"
                    })
                    return schedule
                else:
                    text = await response.text()
                    print(f"❌ Failed to get schedule: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Get Schedule by ID',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return None
        except Exception as e:
            print(f"❌ Error getting schedule: {e}")
            self.test_results.append({
                'test': 'Get Schedule by ID',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return None
    
    async def test_update_schedule(self):
        """Test PATCH /api/schedules/{schedule_id} endpoint"""
        print("\n🔍 Testing UPDATE schedule endpoint...")
        
        if not self.test_schedule_id:
            print("❌ No test schedule ID available")
            self.test_results.append({
                'test': 'Update Schedule',
                'status': 'FAIL',
                'details': 'No test schedule ID available'
            })
            return None
        
        update_data = {
            "name": "Updated Test Schedule - Business Data Collection",
            "description": "Updated automated scraping with enhanced parameters",
            "cron_expression": "0 10 * * *",  # Change to 10 AM
            "input_data": {
                "search_terms": ["restaurants", "cafes", "hotels"],
                "location": "San Francisco, CA",
                "max_results": 100
            }
        }
        
        try:
            async with self.session.patch(f"{self.api_url}/schedules/{self.test_schedule_id}", json=update_data, headers=self.get_headers()) as response:
                if response.status == 200:
                    schedule = await response.json()
                    print(f"✅ Schedule updated successfully")
                    print(f"   - New name: {schedule['name']}")
                    print(f"   - New cron: {schedule['cron_expression']}")
                    print(f"   - Updated at: {schedule.get('updated_at', 'N/A')}")
                    
                    # Verify updates were applied
                    if schedule['name'] == update_data['name']:
                        print(f"   ✅ Name update verified")
                    else:
                        print(f"   ⚠️ Name update not applied")
                    
                    if schedule['cron_expression'] == update_data['cron_expression']:
                        print(f"   ✅ Cron expression update verified")
                    else:
                        print(f"   ⚠️ Cron expression update not applied")
                    
                    self.test_results.append({
                        'test': 'Update Schedule',
                        'status': 'PASS',
                        'details': f"Schedule {schedule['id']} updated successfully"
                    })
                    return schedule
                else:
                    text = await response.text()
                    print(f"❌ Failed to update schedule: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Update Schedule',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return None
        except Exception as e:
            print(f"❌ Error updating schedule: {e}")
            self.test_results.append({
                'test': 'Update Schedule',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return None
    
    async def test_disable_schedule(self):
        """Test POST /api/schedules/{schedule_id}/disable endpoint"""
        print("\n🔍 Testing DISABLE schedule endpoint...")
        
        if not self.test_schedule_id:
            print("❌ No test schedule ID available")
            self.test_results.append({
                'test': 'Disable Schedule',
                'status': 'FAIL',
                'details': 'No test schedule ID available'
            })
            return False
        
        try:
            async with self.session.post(f"{self.api_url}/schedules/{self.test_schedule_id}/disable", headers=self.get_headers()) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Schedule disabled successfully")
                    print(f"   - Message: {result.get('message', 'N/A')}")
                    
                    # Verify schedule is actually disabled
                    schedule = await self.test_get_schedule_by_id()
                    if schedule and not schedule.get('is_enabled', True):
                        print(f"   ✅ Schedule disable status verified")
                        self.test_results.append({
                            'test': 'Disable Schedule',
                            'status': 'PASS',
                            'details': 'Schedule disabled successfully'
                        })
                        return True
                    else:
                        print(f"   ⚠️ Schedule disable status not verified")
                        self.test_results.append({
                            'test': 'Disable Schedule',
                            'status': 'FAIL',
                            'details': 'Schedule disable status not verified'
                        })
                        return False
                else:
                    text = await response.text()
                    print(f"❌ Failed to disable schedule: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Disable Schedule',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return False
        except Exception as e:
            print(f"❌ Error disabling schedule: {e}")
            self.test_results.append({
                'test': 'Disable Schedule',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return False
    
    async def test_enable_schedule(self):
        """Test POST /api/schedules/{schedule_id}/enable endpoint"""
        print("\n🔍 Testing ENABLE schedule endpoint...")
        
        if not self.test_schedule_id:
            print("❌ No test schedule ID available")
            self.test_results.append({
                'test': 'Enable Schedule',
                'status': 'FAIL',
                'details': 'No test schedule ID available'
            })
            return False
        
        try:
            async with self.session.post(f"{self.api_url}/schedules/{self.test_schedule_id}/enable", headers=self.get_headers()) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Schedule enabled successfully")
                    print(f"   - Message: {result.get('message', 'N/A')}")
                    
                    # Verify schedule is actually enabled
                    schedule = await self.test_get_schedule_by_id()
                    if schedule and schedule.get('is_enabled', False):
                        print(f"   ✅ Schedule enable status verified")
                        self.test_results.append({
                            'test': 'Enable Schedule',
                            'status': 'PASS',
                            'details': 'Schedule enabled successfully'
                        })
                        return True
                    else:
                        print(f"   ⚠️ Schedule enable status not verified")
                        self.test_results.append({
                            'test': 'Enable Schedule',
                            'status': 'FAIL',
                            'details': 'Schedule enable status not verified'
                        })
                        return False
                else:
                    text = await response.text()
                    print(f"❌ Failed to enable schedule: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Enable Schedule',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return False
        except Exception as e:
            print(f"❌ Error enabling schedule: {e}")
            self.test_results.append({
                'test': 'Enable Schedule',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return False
    
    async def test_run_schedule_now(self):
        """Test POST /api/schedules/{schedule_id}/run-now endpoint"""
        print("\n🔍 Testing RUN SCHEDULE NOW endpoint...")
        
        if not self.test_schedule_id:
            print("❌ No test schedule ID available")
            self.test_results.append({
                'test': 'Run Schedule Now',
                'status': 'FAIL',
                'details': 'No test schedule ID available'
            })
            return None
        
        try:
            async with self.session.post(f"{self.api_url}/schedules/{self.test_schedule_id}/run-now", headers=self.get_headers()) as response:
                if response.status == 200:
                    result = await response.json()
                    run_id = result.get('run_id')
                    print(f"✅ Schedule run triggered successfully")
                    print(f"   - Message: {result.get('message', 'N/A')}")
                    print(f"   - Run ID: {run_id}")
                    
                    if run_id:
                        # Wait a moment and check run status
                        await asyncio.sleep(2)
                        run_status = await self.check_run_status(run_id)
                        if run_status:
                            print(f"   ✅ Run created and status verified: {run_status}")
                        
                        self.test_results.append({
                            'test': 'Run Schedule Now',
                            'status': 'PASS',
                            'details': f'Manual run triggered successfully with ID {run_id}'
                        })
                        return result
                    else:
                        print(f"   ⚠️ No run ID returned")
                        self.test_results.append({
                            'test': 'Run Schedule Now',
                            'status': 'FAIL',
                            'details': 'No run ID returned'
                        })
                        return None
                else:
                    text = await response.text()
                    print(f"❌ Failed to trigger schedule run: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Run Schedule Now',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return None
        except Exception as e:
            print(f"❌ Error triggering schedule run: {e}")
            self.test_results.append({
                'test': 'Run Schedule Now',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return None
    
    async def check_run_status(self, run_id: str):
        """Check the status of a run"""
        try:
            async with self.session.get(f"{self.api_url}/runs/{run_id}", headers=self.get_headers()) as response:
                if response.status == 200:
                    run = await response.json()
                    return run.get('status', 'unknown')
                else:
                    return None
        except Exception:
            return None
    
    async def test_delete_schedule(self):
        """Test DELETE /api/schedules/{schedule_id} endpoint"""
        print("\n🔍 Testing DELETE schedule endpoint...")
        
        if not self.test_schedule_id:
            print("❌ No test schedule ID available")
            self.test_results.append({
                'test': 'Delete Schedule',
                'status': 'FAIL',
                'details': 'No test schedule ID available'
            })
            return False
        
        try:
            async with self.session.delete(f"{self.api_url}/schedules/{self.test_schedule_id}", headers=self.get_headers()) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Schedule deleted successfully")
                    print(f"   - Message: {result.get('message', 'N/A')}")
                    
                    # Verify schedule is actually deleted
                    await asyncio.sleep(1)
                    deleted_schedule = await self.test_get_schedule_by_id()
                    if not deleted_schedule:
                        print(f"   ✅ Schedule deletion verified")
                        self.test_results.append({
                            'test': 'Delete Schedule',
                            'status': 'PASS',
                            'details': 'Schedule deleted successfully'
                        })
                        return True
                    else:
                        print(f"   ⚠️ Schedule still exists after deletion")
                        self.test_results.append({
                            'test': 'Delete Schedule',
                            'status': 'FAIL',
                            'details': 'Schedule still exists after deletion'
                        })
                        return False
                else:
                    text = await response.text()
                    print(f"❌ Failed to delete schedule: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'Delete Schedule',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return False
        except Exception as e:
            print(f"❌ Error deleting schedule: {e}")
            self.test_results.append({
                'test': 'Delete Schedule',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return False
    
    async def test_authentication_handling(self):
        """Test proper authentication handling"""
        print("\n🔍 Testing authentication handling...")
        
        # Test without authentication
        try:
            async with self.session.get(f"{self.api_url}/schedules") as response:
                if response.status == 401:
                    print(f"✅ Proper authentication required (401 Unauthorized)")
                    self.test_results.append({
                        'test': 'Authentication Handling',
                        'status': 'PASS',
                        'details': 'Proper 401 response for unauthenticated requests'
                    })
                    return True
                else:
                    print(f"❌ Unexpected response for unauthenticated request: {response.status}")
                    self.test_results.append({
                        'test': 'Authentication Handling',
                        'status': 'FAIL',
                        'details': f'Expected 401, got {response.status}'
                    })
                    return False
        except Exception as e:
            print(f"❌ Error testing authentication: {e}")
            self.test_results.append({
                'test': 'Authentication Handling',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return False
    
    async def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n🔍 Testing error handling...")
        
        # Test invalid schedule ID
        try:
            invalid_id = "invalid-schedule-id-12345"
            async with self.session.get(f"{self.api_url}/schedules/{invalid_id}", headers=self.get_headers()) as response:
                if response.status == 404:
                    print(f"✅ Proper 404 response for invalid schedule ID")
                    
                    # Test invalid cron expression
                    invalid_schedule = {
                        "actor_id": self.test_actor_id or "test-actor",
                        "name": "Invalid Cron Test",
                        "cron_expression": "invalid cron",
                        "timezone": "UTC",
                        "input_data": {}
                    }
                    
                    async with self.session.post(f"{self.api_url}/schedules", json=invalid_schedule, headers=self.get_headers()) as response2:
                        if response2.status == 422:  # Validation error
                            print(f"✅ Proper validation error for invalid cron expression")
                            self.test_results.append({
                                'test': 'Error Handling',
                                'status': 'PASS',
                                'details': 'Proper error responses for invalid requests'
                            })
                            return True
                        else:
                            print(f"❌ Expected validation error for invalid cron, got: {response2.status}")
                            self.test_results.append({
                                'test': 'Error Handling',
                                'status': 'FAIL',
                                'details': f'Expected 422 for invalid cron, got {response2.status}'
                            })
                            return False
                else:
                    print(f"❌ Expected 404 for invalid schedule ID, got: {response.status}")
                    self.test_results.append({
                        'test': 'Error Handling',
                        'status': 'FAIL',
                        'details': f'Expected 404 for invalid ID, got {response.status}'
                    })
                    return False
        except Exception as e:
            print(f"❌ Error testing error handling: {e}")
            self.test_results.append({
                'test': 'Error Handling',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return False
    
    async def run_comprehensive_tests(self):
        """Run all scheduler tests in sequence"""
        print("\n🚀 Starting Comprehensive Scheduler Testing...")
        print("=" * 60)
        
        # Setup
        if not await self.setup_session():
            print("❌ Failed to setup test session")
            return False
        
        # Test authentication handling
        await self.test_authentication_handling()
        
        # Test error handling
        await self.test_error_handling()
        
        # Get test actor
        await self.get_test_actor()
        
        # Test schedule CRUD operations
        await self.test_create_schedule()
        await self.test_get_schedules()
        await self.test_get_schedule_by_id()
        await self.test_update_schedule()
        
        # Test enable/disable functionality
        await self.test_disable_schedule()
        await self.test_enable_schedule()
        
        # Test manual run trigger
        await self.test_run_schedule_now()
        
        # Test deletion (last, as it removes the test schedule)
        await self.test_delete_schedule()
        
        return True
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print(f"\n{'='*80}")
        print(f"🎯 SCHEDULER FUNCTIONALITY TEST SUMMARY")
        print(f"{'='*80}")
        
        passed = sum(1 for result in self.test_results if result['status'] == 'PASS')
        failed = sum(1 for result in self.test_results if result['status'] == 'FAIL')
        total = len(self.test_results)
        
        print(f"📊 Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/total*100):.1f}%" if total > 0 else "N/A")
        
        print(f"\n📋 Detailed Results:")
        for i, result in enumerate(self.test_results, 1):
            status_icon = "✅" if result['status'] == 'PASS' else "❌"
            print(f"{i:2d}. {status_icon} {result['test']}")
            if result['status'] == 'FAIL':
                print(f"     Details: {result['details']}")
        
        print(f"\n{'='*80}")
        
        return passed == total


async def main():
    """Main test execution"""
    print("🚀 Starting Scheduler Backend Testing")
    print("=" * 60)
    
    tester = SchedulerTester()
    
    try:
        # Run comprehensive tests
        success = await tester.run_comprehensive_tests()
        
        # Print summary
        all_passed = tester.print_test_summary()
        
        return all_passed
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await tester.cleanup()


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
