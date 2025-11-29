#!/usr/bin/env python3
"""
Edge Case Tests for Scrapi Platform
Tests error handling, authentication edge cases, and invalid inputs
"""

import requests
import json
import time
import sys
from datetime import datetime

BACKEND_URL = "https://packman-setup.preview.emergentagent.com/api"

class EdgeCaseTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_results = []
        
    def log(self, message):
        """Log message with timestamp"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def make_request(self, method, endpoint, data=None, headers=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {}
            
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == "POST":
                headers["Content-Type"] = "application/json"
                response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}")
            return None
    
    def test_auth_edge_cases(self):
        """Test authentication edge cases"""
        self.log("=== Testing Authentication Edge Cases ===")
        
        # Test invalid credentials
        self.log("Testing invalid login credentials...")
        response = self.make_request("POST", "/auth/login", {
            "username": "nonexistent_user",
            "password": "wrong_password"
        })
        if response and response.status_code == 401:
            self.log("✅ Invalid credentials properly rejected")
            self.test_results.append("✅ Invalid credentials handling")
        else:
            self.log(f"❌ Invalid credentials not properly handled (got {response.status_code if response else 'no response'})")
            self.test_results.append("❌ Invalid credentials handling")
        
        # Test missing fields in registration
        self.log("Testing registration with missing fields...")
        response = self.make_request("POST", "/auth/register", {
            "username": "testuser"
            # Missing password, email, organization_name
        })
        if response and response.status_code == 422:
            self.log("✅ Missing fields properly validated")
            self.test_results.append("✅ Registration validation")
        else:
            self.log("❌ Missing fields not properly validated")
            self.test_results.append("❌ Registration validation")
    
    def test_protected_endpoints_without_auth(self):
        """Test protected endpoints without authentication"""
        self.log("=== Testing Protected Endpoints Without Auth ===")
        
        endpoints = [
            "/auth/me",
            "/actors", 
            "/runs",
            "/proxies"
        ]
        
        for endpoint in endpoints:
            response = self.make_request("GET", endpoint)
            if response and response.status_code in [401, 403]:  # Both 401 and 403 are valid auth errors
                self.log(f"✅ {endpoint} properly protected")
                self.test_results.append(f"✅ {endpoint} auth protection")
            else:
                self.log(f"❌ {endpoint} not properly protected (got {response.status_code if response else 'no response'})")
                self.test_results.append(f"❌ {endpoint} auth protection")
    
    def test_invalid_ids(self):
        """Test endpoints with invalid IDs"""
        self.log("=== Testing Invalid IDs ===")
        
        # First login to get auth token
        response = self.make_request("POST", "/auth/login", {
            "username": "testuser_scrapi",
            "password": "SecurePass123!"
        })
        if response and response.status_code == 200:
            self.auth_token = response.json()["access_token"]
        else:
            self.log("❌ Could not authenticate for ID tests")
            return
        
        # Test invalid actor ID
        response = self.make_request("GET", "/actors/invalid-uuid")
        if response and response.status_code == 404:
            self.log("✅ Invalid actor ID properly handled")
            self.test_results.append("✅ Invalid actor ID handling")
        else:
            self.log("❌ Invalid actor ID not properly handled")
            self.test_results.append("❌ Invalid actor ID handling")
        
        # Test invalid run ID
        response = self.make_request("GET", "/runs/invalid-uuid")
        if response and response.status_code == 404:
            self.log("✅ Invalid run ID properly handled")
            self.test_results.append("✅ Invalid run ID handling")
        else:
            self.log("❌ Invalid run ID not properly handled")
            self.test_results.append("❌ Invalid run ID handling")
    
    def test_invalid_run_creation(self):
        """Test run creation with invalid data"""
        self.log("=== Testing Invalid Run Creation ===")
        
        if not self.auth_token:
            self.log("❌ No auth token for run creation tests")
            return
        
        # Test run with invalid actor ID
        response = self.make_request("POST", "/runs", {
            "actor_id": "invalid-uuid",
            "input_data": {"search_terms": ["test"]}
        })
        if response and response.status_code == 404:
            self.log("✅ Invalid actor ID in run creation properly handled")
            self.test_results.append("✅ Invalid run creation handling")
        else:
            self.log("❌ Invalid actor ID in run creation not properly handled")
            self.test_results.append("❌ Invalid run creation handling")
    
    def run_all_tests(self):
        """Run all edge case tests"""
        self.log("Starting Scrapi Edge Case Tests...")
        
        self.test_auth_edge_cases()
        self.test_protected_endpoints_without_auth()
        self.test_invalid_ids()
        self.test_invalid_run_creation()
        
        # Print summary
        self.log("\n" + "="*60)
        self.log("EDGE CASE TEST RESULTS")
        self.log("="*60)
        
        passed = sum(1 for result in self.test_results if result.startswith("✅"))
        failed = sum(1 for result in self.test_results if result.startswith("❌"))
        
        for result in self.test_results:
            self.log(result)
        
        self.log("-" * 60)
        self.log(f"OVERALL: {passed} passed, {failed} failed")
        
        if failed == 0:
            self.log("🎉 ALL EDGE CASE TESTS PASSED!")
        else:
            self.log(f"⚠️  {failed} EDGE CASE TESTS FAILED")
        
        return failed == 0

if __name__ == "__main__":
    tester = EdgeCaseTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)