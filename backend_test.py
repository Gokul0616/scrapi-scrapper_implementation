#!/usr/bin/env python3
"""
Backend Testing Suite for Admin Console Features
Tests authentication, role management, and admin endpoints
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Backend URL from frontend .env
BACKEND_URL = "https://login-recovery-tool.preview.emergentagent.com/api"

class AdminConsoleTestSuite:
    def __init__(self):
        self.session = None
        self.owner_token = None
        self.admin_token = None
        self.regular_user_token = None
        self.owner_user_id = None
        self.admin_user_id = None
        self.regular_user_id = None
        self.test_results = []
        
    async def setup_session(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
            
    def log_test(self, test_name: str, success: bool, message: str, details: dict = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
            
    async def make_request(self, method: str, endpoint: str, data: dict = None, 
                          token: str = None, params: dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            async with self.session.request(
                method, url, 
                json=data if data else None,
                headers=headers,
                params=params
            ) as response:
                try:
                    response_data = await response.json()
                except:
                    response_data = {"error": "Invalid JSON response"}
                    
                return response.status < 400, response_data, response.status
                
        except Exception as e:
            return False, {"error": str(e)}, 500
            
    async def test_user_registration_owner(self):
        """Test 1: Register first user as owner"""
        test_name = "Register Owner User"
        
        user_data = {
            "username": "owner_user",
            "email": "owner@example.com", 
            "password": "SecurePass123!",
            "organization_name": "Test Organization",
            "role": "owner"
        }
        
        success, response, status = await self.make_request("POST", "/auth/register", user_data)
        
        if success and response.get("access_token"):
            self.owner_token = response["access_token"]
            self.owner_user_id = response["user"]["id"]
            user_role = response["user"]["role"]
            
            if user_role == "owner":
                self.log_test(test_name, True, f"Owner registered successfully with role: {user_role}")
            else:
                self.log_test(test_name, False, f"Expected owner role, got: {user_role}")
        else:
            self.log_test(test_name, False, f"Registration failed: {response}", {"status": status})
            
    async def test_user_registration_admin(self):
        """Test 2: Register second user as admin"""
        test_name = "Register Admin User"
        
        user_data = {
            "username": "admin_user",
            "email": "admin@example.com",
            "password": "SecurePass123!",
            "organization_name": "Test Organization",
            "role": "admin"
        }
        
        success, response, status = await self.make_request("POST", "/auth/register", user_data)
        
        if success and response.get("access_token"):
            self.admin_token = response["access_token"]
            self.admin_user_id = response["user"]["id"]
            user_role = response["user"]["role"]
            
            if user_role == "admin":
                self.log_test(test_name, True, f"Admin registered successfully with role: {user_role}")
            else:
                self.log_test(test_name, False, f"Expected admin role, got: {user_role}")
        else:
            self.log_test(test_name, False, f"Registration failed: {response}", {"status": status})
            
    async def test_user_registration_regular(self):
        """Test 3: Register regular user (should get admin role since owner exists)"""
        test_name = "Register Regular User"
        
        user_data = {
            "username": "regular_user",
            "email": "regular@example.com",
            "password": "SecurePass123!",
            "organization_name": "Test Organization"
        }
        
        success, response, status = await self.make_request("POST", "/auth/register", user_data)
        
        if success and response.get("access_token"):
            self.regular_user_token = response["access_token"]
            self.regular_user_id = response["user"]["id"]
            user_role = response["user"]["role"]
            
            if user_role == "admin":
                self.log_test(test_name, True, f"Regular user registered with admin role: {user_role}")
            else:
                self.log_test(test_name, False, f"Expected admin role for regular user, got: {user_role}")
        else:
            self.log_test(test_name, False, f"Registration failed: {response}", {"status": status})
            
    async def test_login_owner(self):
        """Test 4: Login owner and verify role in token"""
        test_name = "Owner Login"
        
        login_data = {
            "username": "owner_user",
            "password": "SecurePass123!"
        }
        
        success, response, status = await self.make_request("POST", "/auth/login", login_data)
        
        if success and response.get("access_token"):
            # Update token
            self.owner_token = response["access_token"]
            user_role = response["user"]["role"]
            is_active = response["user"]["is_active"]
            
            if user_role == "owner" and is_active:
                self.log_test(test_name, True, f"Owner login successful, role: {user_role}, active: {is_active}")
            else:
                self.log_test(test_name, False, f"Login issues - role: {user_role}, active: {is_active}")
        else:
            self.log_test(test_name, False, f"Login failed: {response}", {"status": status})
            
    async def test_login_admin(self):
        """Test 5: Login admin and verify role in token"""
        test_name = "Admin Login"
        
        login_data = {
            "username": "admin_user",
            "password": "SecurePass123!"
        }
        
        success, response, status = await self.make_request("POST", "/auth/login", login_data)
        
        if success and response.get("access_token"):
            # Update token
            self.admin_token = response["access_token"]
            user_role = response["user"]["role"]
            is_active = response["user"]["is_active"]
            
            if user_role == "admin" and is_active:
                self.log_test(test_name, True, f"Admin login successful, role: {user_role}, active: {is_active}")
            else:
                self.log_test(test_name, False, f"Login issues - role: {user_role}, active: {is_active}")
        else:
            self.log_test(test_name, False, f"Login failed: {response}", {"status": status})
            
    async def test_auth_me_endpoint(self):
        """Test 6: Test /auth/me endpoint with role fields"""
        test_name = "Auth Me Endpoint"
        
        success, response, status = await self.make_request("GET", "/auth/me", token=self.owner_token)
        
        if success:
            required_fields = ["id", "username", "email", "role", "is_active", "plan"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields and response["role"] == "owner":
                self.log_test(test_name, True, f"Auth me endpoint working, role: {response['role']}")
            else:
                self.log_test(test_name, False, f"Missing fields: {missing_fields} or wrong role: {response.get('role')}")
        else:
            self.log_test(test_name, False, f"Auth me failed: {response}", {"status": status})
            
    async def test_role_selection_endpoint(self):
        """Test 7: Test role selection endpoint"""
        test_name = "Role Selection Endpoint"
        
        # Try to change regular user role to owner (should fail)
        role_data = {"role": "owner"}
        success, response, status = await self.make_request("POST", "/auth/select-role", role_data, token=self.regular_user_token)
        
        if not success and status == 400:
            self.log_test(test_name, True, "Role selection correctly prevents duplicate owner")
        else:
            self.log_test(test_name, False, f"Role selection should have failed: {response}", {"status": status})
            
    async def test_admin_stats_endpoint(self):
        """Test 8: Test admin dashboard stats endpoint"""
        test_name = "Admin Stats Endpoint"
        
        success, response, status = await self.make_request("GET", "/admin/stats", token=self.owner_token)
        
        if success:
            required_fields = ["total_users", "active_users_7d", "total_runs", "success_rate", "recent_activity"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log_test(test_name, True, f"Admin stats working: {len(required_fields)} fields present")
            else:
                self.log_test(test_name, False, f"Missing stats fields: {missing_fields}")
        else:
            self.log_test(test_name, False, f"Admin stats failed: {response}", {"status": status})
            
    async def test_admin_users_endpoint(self):
        """Test 9: Test admin users list endpoint"""
        test_name = "Admin Users List"
        
        success, response, status = await self.make_request("GET", "/admin/users", token=self.owner_token)
        
        if success and isinstance(response, list):
            if len(response) >= 3:  # Should have at least our 3 test users
                self.log_test(test_name, True, f"Admin users list working: {len(response)} users found")
            else:
                self.log_test(test_name, False, f"Expected at least 3 users, got: {len(response)}")
        else:
            self.log_test(test_name, False, f"Admin users failed: {response}", {"status": status})
            
    async def test_admin_users_search(self):
        """Test 10: Test admin users search functionality"""
        test_name = "Admin Users Search"
        
        params = {"search": "owner"}
        success, response, status = await self.make_request("GET", "/admin/users", token=self.owner_token, params=params)
        
        if success and isinstance(response, list):
            owner_found = any(user.get("username") == "owner_user" for user in response)
            if owner_found:
                self.log_test(test_name, True, f"Admin users search working: found owner user")
            else:
                self.log_test(test_name, False, f"Search didn't find owner user in results")
        else:
            self.log_test(test_name, False, f"Admin users search failed: {response}", {"status": status})
            
    async def test_suspend_user_flow(self):
        """Test 11: Test suspend user functionality"""
        test_name = "Suspend User Flow"
        
        # Suspend the regular user
        reason_data = {"reason": "Test suspension"}
        success, response, status = await self.make_request(
            "POST", f"/admin/users/{self.regular_user_id}/suspend", 
            reason_data, token=self.owner_token
        )
        
        if success:
            # Try to login with suspended user
            login_data = {
                "username": "regular_user",
                "password": "SecurePass123!"
            }
            
            login_success, login_response, login_status = await self.make_request("POST", "/auth/login", login_data)
            
            if not login_success and login_status == 403:
                self.log_test(test_name, True, "User suspension working: login blocked for suspended user")
            else:
                self.log_test(test_name, False, f"Suspended user can still login: {login_response}")
        else:
            self.log_test(test_name, False, f"User suspension failed: {response}", {"status": status})
            
    async def test_activate_user_flow(self):
        """Test 12: Test activate user functionality"""
        test_name = "Activate User Flow"
        
        # Activate the regular user
        success, response, status = await self.make_request(
            "POST", f"/admin/users/{self.regular_user_id}/activate", 
            token=self.owner_token
        )
        
        if success:
            # Try to login with activated user
            login_data = {
                "username": "regular_user",
                "password": "SecurePass123!"
            }
            
            login_success, login_response, login_status = await self.make_request("POST", "/auth/login", login_data)
            
            if login_success and login_response.get("access_token"):
                self.regular_user_token = login_response["access_token"]  # Update token
                self.log_test(test_name, True, "User activation working: login successful after activation")
            else:
                self.log_test(test_name, False, f"Activated user cannot login: {login_response}")
        else:
            self.log_test(test_name, False, f"User activation failed: {response}", {"status": status})
            
    async def test_update_user_admin(self):
        """Test 13: Test update user role/plan endpoint"""
        test_name = "Update User Admin"
        
        update_data = {
            "plan": "Premium",
            "organization_name": "Updated Organization"
        }
        
        success, response, status = await self.make_request(
            "PATCH", f"/admin/users/{self.regular_user_id}", 
            update_data, token=self.owner_token
        )
        
        if success:
            self.log_test(test_name, True, "User update successful")
        else:
            self.log_test(test_name, False, f"User update failed: {response}", {"status": status})
            
    async def test_owner_cannot_be_suspended(self):
        """Test 14: Test that owner cannot be suspended"""
        test_name = "Owner Cannot Be Suspended"
        
        reason_data = {"reason": "Test owner suspension"}
        success, response, status = await self.make_request(
            "POST", f"/admin/users/{self.owner_user_id}/suspend", 
            reason_data, token=self.admin_token
        )
        
        if not success and status == 403:
            self.log_test(test_name, True, "Owner protection working: cannot suspend owner")
        else:
            self.log_test(test_name, False, f"Owner suspension should be blocked: {response}")
            
    async def test_audit_logs_endpoint(self):
        """Test 15: Test audit logs endpoint"""
        test_name = "Audit Logs Endpoint"
        
        success, response, status = await self.make_request("GET", "/admin/audit-logs", token=self.owner_token)
        
        if success:
            required_fields = ["logs", "total", "page", "limit"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields and isinstance(response["logs"], list):
                self.log_test(test_name, True, f"Audit logs working: {response['total']} total logs")
            else:
                self.log_test(test_name, False, f"Audit logs structure issue: {missing_fields}")
        else:
            self.log_test(test_name, False, f"Audit logs failed: {response}", {"status": status})
            
    async def test_audit_logs_pagination(self):
        """Test 16: Test audit logs pagination"""
        test_name = "Audit Logs Pagination"
        
        params = {"page": 1, "limit": 5}
        success, response, status = await self.make_request("GET", "/admin/audit-logs", token=self.owner_token, params=params)
        
        if success:
            if response.get("page") == 1 and response.get("limit") == 5:
                self.log_test(test_name, True, f"Audit logs pagination working")
            else:
                self.log_test(test_name, False, f"Pagination parameters not respected")
        else:
            self.log_test(test_name, False, f"Audit logs pagination failed: {response}", {"status": status})
            
    async def test_admin_actors_endpoint(self):
        """Test 17: Test admin actors list endpoint"""
        test_name = "Admin Actors List"
        
        success, response, status = await self.make_request("GET", "/admin/actors", token=self.owner_token)
        
        if success and isinstance(response, list):
            self.log_test(test_name, True, f"Admin actors list working: {len(response)} actors found")
        else:
            self.log_test(test_name, False, f"Admin actors failed: {response}", {"status": status})
            
    async def test_admin_actors_search(self):
        """Test 18: Test admin actors search functionality"""
        test_name = "Admin Actors Search"
        
        params = {"search": "Google"}
        success, response, status = await self.make_request("GET", "/admin/actors", token=self.owner_token, params=params)
        
        if success and isinstance(response, list):
            self.log_test(test_name, True, f"Admin actors search working: {len(response)} results")
        else:
            self.log_test(test_name, False, f"Admin actors search failed: {response}", {"status": status})
            
    async def test_verify_actor(self):
        """Test 19: Test actor verification"""
        test_name = "Verify Actor"
        
        # First get an actor ID
        success, actors, status = await self.make_request("GET", "/admin/actors", token=self.owner_token)
        
        if success and actors and len(actors) > 0:
            actor_id = actors[0]["id"]
            
            # Verify the actor
            verify_success, verify_response, verify_status = await self.make_request(
                "POST", f"/admin/actors/{actor_id}/verify", 
                {"verified": True}, token=self.owner_token
            )
            
            if verify_success:
                self.log_test(test_name, True, "Actor verification successful")
            else:
                self.log_test(test_name, False, f"Actor verification failed: {verify_response}")
        else:
            self.log_test(test_name, False, "No actors available for verification test")
            
    async def test_feature_actor(self):
        """Test 20: Test actor featuring"""
        test_name = "Feature Actor"
        
        # First get an actor ID
        success, actors, status = await self.make_request("GET", "/admin/actors", token=self.owner_token)
        
        if success and actors and len(actors) > 0:
            actor_id = actors[0]["id"]
            
            # Feature the actor
            feature_success, feature_response, feature_status = await self.make_request(
                "POST", f"/admin/actors/{actor_id}/feature", 
                {"featured": True}, token=self.owner_token
            )
            
            if feature_success:
                self.log_test(test_name, True, "Actor featuring successful")
            else:
                self.log_test(test_name, False, f"Actor featuring failed: {feature_response}")
        else:
            self.log_test(test_name, False, "No actors available for featuring test")
            
    async def test_non_admin_access_denied(self):
        """Test 21: Test that non-admin users get 403 for admin endpoints"""
        test_name = "Non-Admin Access Denied"
        
        # Create a user without admin privileges by updating regular user role
        # First remove admin role from regular user
        update_data = {"role": "user"}  # Non-admin role
        await self.make_request(
            "PATCH", f"/admin/users/{self.regular_user_id}", 
            update_data, token=self.owner_token
        )
        
        # Try to access admin endpoint with non-admin user
        success, response, status = await self.make_request("GET", "/admin/stats", token=self.regular_user_token)
        
        if not success and status == 403:
            self.log_test(test_name, True, "Access control working: non-admin blocked from admin endpoints")
        else:
            self.log_test(test_name, False, f"Non-admin user should be blocked: {response}")
            
    async def test_admin_with_admin_credentials(self):
        """Test 22: Test admin endpoints with admin credentials"""
        test_name = "Admin Endpoints with Admin Credentials"
        
        success, response, status = await self.make_request("GET", "/admin/stats", token=self.admin_token)
        
        if success:
            self.log_test(test_name, True, "Admin user can access admin endpoints")
        else:
            self.log_test(test_name, False, f"Admin user blocked from admin endpoints: {response}")
            
    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Admin Console Backend Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        await self.setup_session()
        
        try:
            # Authentication & Role Tests
            await self.test_user_registration_owner()
            await self.test_user_registration_admin()
            await self.test_user_registration_regular()
            await self.test_login_owner()
            await self.test_login_admin()
            await self.test_auth_me_endpoint()
            await self.test_role_selection_endpoint()
            
            # Admin Endpoint Tests
            await self.test_admin_stats_endpoint()
            await self.test_admin_users_endpoint()
            await self.test_admin_users_search()
            await self.test_suspend_user_flow()
            await self.test_activate_user_flow()
            await self.test_update_user_admin()
            await self.test_owner_cannot_be_suspended()
            await self.test_audit_logs_endpoint()
            await self.test_audit_logs_pagination()
            await self.test_admin_actors_endpoint()
            await self.test_admin_actors_search()
            await self.test_verify_actor()
            await self.test_feature_actor()
            
            # Access Control Tests
            await self.test_non_admin_access_denied()
            await self.test_admin_with_admin_credentials()
            
        finally:
            await self.cleanup_session()
            
        # Print summary
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
                    
        print("\n" + "=" * 60)
        
        # Return exit code
        return 0 if failed == 0 else 1

async def main():
    """Main test runner"""
    test_suite = AdminConsoleTestSuite()
    exit_code = await test_suite.run_all_tests()
    sys.exit(exit_code)

if __name__ == "__main__":
    asyncio.run(main())