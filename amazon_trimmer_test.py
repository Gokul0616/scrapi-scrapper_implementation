#!/usr/bin/env python3
"""
Amazon Product Scraper Test - Specific test for 'trimmer' keyword issue
Tests the exact scenario reported by user: search_keywords: ["trimmer"], max_results: 5
"""

import requests
import json
import time
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://app-launcher-92.preview.emergentagent.com/api"

class AmazonTrimmerTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_data = None
        
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
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == "POST":
                headers["Content-Type"] = "application/json"
                response = requests.post(url, json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}")
            return None
    
    def authenticate(self):
        """Get authentication token"""
        self.log("=== STEP 1: Authentication ===")
        
        # Try login with existing user first
        login_data = {
            "username": "testuser_scrapi",
            "password": "password123"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.auth_token = data["access_token"]
                self.user_data = data.get("user", {})
                self.log("✅ Authentication successful")
                return True
        
        # Try registration if login fails
        self.log("Login failed, trying registration...")
        register_data = {
            "username": "testuser_scrapi",
            "email": "testuser@scrapi.com", 
            "password": "password123",
            "organization_name": "Test Organization"
        }
        
        response = self.make_request("POST", "/auth/register", register_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.auth_token = data["access_token"]
                self.user_data = data.get("user", {})
                self.log("✅ Registration successful")
                return True
        
        self.log("❌ Authentication failed")
        return False
    
    def get_amazon_actor_id(self):
        """Get Amazon Product Scraper actor ID"""
        self.log("=== STEP 2: Get Amazon Product Scraper Actor ID ===")
        
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            for actor in actors:
                if actor.get("name") == "Amazon Product Scraper":
                    actor_id = actor["id"]
                    self.log(f"✅ Found Amazon Product Scraper actor: {actor_id}")
                    self.log(f"   Name: {actor.get('name')}")
                    self.log(f"   Icon: {actor.get('icon')}")
                    self.log(f"   Category: {actor.get('category')}")
                    return actor_id
            
            self.log("❌ Amazon Product Scraper actor not found")
            self.log("Available actors:")
            for actor in actors:
                self.log(f"  - {actor.get('name', 'Unknown')}")
            return None
        else:
            self.log(f"❌ Failed to get actors: {response.status_code if response else 'No response'}")
            return None
    
    def create_scraping_run(self, actor_id):
        """Create scraping run with exact parameters from user report"""
        self.log("=== STEP 3: Create Scraping Run ===")
        self.log("Using exact parameters from user report:")
        self.log("  - search_keywords: ['trimmer'] (single keyword array)")
        self.log("  - max_results: 5")
        self.log("  - extract_reviews: false")
        self.log("  - min_rating: 0")
        
        run_data = {
            "actor_id": actor_id,
            "input_data": {
                "search_keywords": ["trimmer"],
                "max_results": 5,
                "extract_reviews": False,
                "min_rating": 0
            }
        }
        
        self.log("REQUEST JSON:")
        self.log(json.dumps(run_data, indent=2))
        
        response = self.make_request("POST", "/runs", run_data)
        
        self.log(f"RESPONSE STATUS: {response.status_code if response else 'No response'}")
        
        if response:
            try:
                response_json = response.json()
                self.log("RESPONSE JSON:")
                self.log(json.dumps(response_json, indent=2))
                
                if response.status_code == 200 and "id" in response_json:
                    run_id = response_json["id"]
                    self.log(f"✅ Run created successfully: {run_id}")
                    return run_id
                else:
                    self.log(f"❌ Run creation failed")
                    return None
            except Exception as e:
                self.log(f"❌ Failed to parse response JSON: {e}")
                self.log(f"Response text: {response.text}")
                return None
        else:
            self.log("❌ No response from server")
            return None
    
    def monitor_run(self, run_id):
        """Monitor run status until completion"""
        self.log("=== STEP 4: Monitor Run Status ===")
        
        max_wait_time = 180  # 3 minutes
        check_interval = 10  # 10 seconds
        elapsed_time = 0
        
        while elapsed_time < max_wait_time:
            response = self.make_request("GET", f"/runs/{run_id}")
            if response and response.status_code == 200:
                run_status = response.json()
                status = run_status.get("status", "unknown")
                error_message = run_status.get("error_message")
                logs = run_status.get("logs", [])
                
                self.log(f"Run status: {status} (elapsed: {elapsed_time}s)")
                
                if error_message:
                    self.log(f"❌ ERROR MESSAGE: {error_message}")
                
                # Show recent logs
                if logs:
                    recent_logs = logs[-3:] if len(logs) >= 3 else logs
                    for log_entry in recent_logs:
                        self.log(f"  Log: {log_entry}")
                
                if status == "succeeded":
                    results_count = run_status.get("results_count", 0)
                    self.log(f"✅ Run completed successfully with {results_count} results")
                    return True, results_count
                    
                elif status == "failed":
                    self.log(f"❌ Run failed: {error_message or 'Unknown error'}")
                    
                    # Analyze the error
                    if error_message:
                        if "JSON" in error_message or "format" in error_message:
                            self.log("🔍 ISSUE IDENTIFIED: JSON format problem in frontend or backend processing")
                        elif "keyword" in error_message or "search" in error_message:
                            self.log("🔍 ISSUE IDENTIFIED: Problem with search keyword processing")
                        elif "timeout" in error_message or "connection" in error_message:
                            self.log("🔍 ISSUE IDENTIFIED: Network/connection issue")
                        elif "Amazon" in error_message or "scraper" in error_message:
                            self.log("🔍 ISSUE IDENTIFIED: Amazon scraper implementation issue")
                        else:
                            self.log(f"🔍 ISSUE IDENTIFIED: Other error - {error_message}")
                    
                    return False, error_message
                    
                elif status in ["queued", "running"]:
                    time.sleep(check_interval)
                    elapsed_time += check_interval
                else:
                    self.log(f"❌ Unknown status: {status}")
                    return False, f"Unknown status: {status}"
            else:
                self.log(f"❌ Failed to get run status: {response.status_code if response else 'No response'}")
                return False, "Failed to get run status"
        
        self.log("❌ Run did not complete within timeout")
        return False, "Timeout"
    
    def check_results(self, run_id):
        """Check dataset results if run succeeded"""
        self.log("=== STEP 5: Check Dataset Results ===")
        
        response = self.make_request("GET", f"/datasets/{run_id}/items")
        if response and response.status_code == 200:
            dataset_response = response.json()
            
            # Handle paginated response
            if isinstance(dataset_response, dict) and "items" in dataset_response:
                items = dataset_response["items"]
                total = dataset_response.get("total", len(items))
                self.log(f"✅ Retrieved {len(items)} items from dataset (total: {total})")
            else:
                items = dataset_response
                self.log(f"✅ Retrieved {len(items)} items from dataset")
            
            if isinstance(items, list) and len(items) > 0:
                self.log("Sample products:")
                for i, item in enumerate(items[:3]):  # Show first 3 products
                    data = item.get("data", {})
                    title = data.get("title", "N/A")
                    price = data.get("price", "N/A")
                    asin = data.get("asin", "N/A")
                    rating = data.get("rating", "N/A")
                    self.log(f"  {i+1}. {title}")
                    self.log(f"      Price: ${price} | ASIN: {asin} | Rating: {rating}")
                return True
            elif isinstance(items, list):
                self.log("⚠️ Dataset is empty (0 items)")
                return False
            else:
                self.log(f"❌ Unexpected dataset format: {type(items)}")
                return False
        else:
            self.log(f"❌ Failed to retrieve dataset: {response.status_code if response else 'No response'}")
            return False
    
    def run_test(self):
        """Run the complete test"""
        self.log("🚀 AMAZON PRODUCT SCRAPER - TRIMMER KEYWORD TEST")
        self.log("Testing user-reported issue: 'trimmer' keyword with max_results 5 immediately fails")
        self.log(f"Backend URL: {self.base_url}")
        self.log("=" * 80)
        
        # Step 1: Authentication
        if not self.authenticate():
            return False
        
        # Step 2: Get Amazon actor ID
        actor_id = self.get_amazon_actor_id()
        if not actor_id:
            return False
        
        # Step 3: Create scraping run
        run_id = self.create_scraping_run(actor_id)
        if not run_id:
            return False
        
        # Step 4: Monitor run
        success, result = self.monitor_run(run_id)
        
        # Step 5: Check results if successful
        if success:
            self.check_results(run_id)
            self.log("🎉 TEST COMPLETED SUCCESSFULLY - No issue found with 'trimmer' keyword")
            return True
        else:
            self.log(f"❌ TEST IDENTIFIED THE ISSUE: {result}")
            self.log("🔍 RECOMMENDATION: Check backend logs and Amazon scraper implementation")
            return False

if __name__ == "__main__":
    tester = AmazonTrimmerTester()
    success = tester.run_test()
    
    if success:
        print("\n✅ CONCLUSION: Amazon scraper works correctly with 'trimmer' keyword")
    else:
        print("\n❌ CONCLUSION: Issue confirmed with Amazon scraper 'trimmer' keyword")
    
    sys.exit(0 if success else 1)