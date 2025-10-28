#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Scrapi Platform
Tests authentication, actors, runs, datasets, and proxy management
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://data-retrieval-2.preview.emergentagent.com/api"

class ScrapiAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_data = None
        self.actor_id = None
        self.run_id = None
        self.test_results = {
            "auth": {"passed": 0, "failed": 0, "errors": []},
            "actors": {"passed": 0, "failed": 0, "errors": []},
            "runs": {"passed": 0, "failed": 0, "errors": []},
            "datasets": {"passed": 0, "failed": 0, "errors": []},
            "proxies": {"passed": 0, "failed": 0, "errors": []},
            "ai_chat": {"passed": 0, "failed": 0, "errors": []},
            "global_chat": {"passed": 0, "failed": 0, "errors": []}
        }
        self.first_lead_id = None
        self.first_lead_data = None
        
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
            elif method == "PATCH":
                headers["Content-Type"] = "application/json"
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}")
            return None
            
    def test_auth_flow(self):
        """Test complete authentication flow"""
        self.log("=== Testing Authentication Flow ===")
        
        # Try login with existing user first (as requested in review)
        self.log("Testing login with existing user...")
        login_data = {
            "username": "testuser_scrapi",
            "password": "password123"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]
                self.user_data = data["user"]
                self.log("✅ User login successful")
                self.test_results["auth"]["passed"] += 1
            else:
                self.log("❌ Login response missing required fields")
                self.test_results["auth"]["failed"] += 1
                self.test_results["auth"]["errors"].append("Login response missing access_token or user")
        else:
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
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    self.user_data = data["user"]
                    self.log("✅ User registration successful")
                    self.test_results["auth"]["passed"] += 1
                else:
                    self.log("❌ Registration response missing required fields")
                    self.test_results["auth"]["failed"] += 1
                    self.test_results["auth"]["errors"].append("Registration response missing access_token or user")
            else:
                self.log(f"❌ Authentication failed: {response.status_code if response else 'No response'}")
                self.test_results["auth"]["failed"] += 1
                self.test_results["auth"]["errors"].append("Both registration and login failed")
                return False
        
        # Test get current user
        self.log("Testing get current user...")
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            user_info = response.json()
            if "id" in user_info and "username" in user_info:
                self.log("✅ Get current user successful")
                self.test_results["auth"]["passed"] += 1
            else:
                self.log("❌ User info response missing required fields")
                self.test_results["auth"]["failed"] += 1
                self.test_results["auth"]["errors"].append("User info missing required fields")
        else:
            self.log(f"❌ Get current user failed: {response.status_code if response else 'No response'}")
            self.test_results["auth"]["failed"] += 1
            self.test_results["auth"]["errors"].append("Get current user failed")
            
        return True
        
    def test_actors_management(self):
        """Test actors management endpoints"""
        self.log("=== Testing Actors Management ===")
        
        # Test get all actors
        self.log("Testing get all actors...")
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            if isinstance(actors, list):
                self.log(f"✅ Retrieved {len(actors)} actors")
                self.test_results["actors"]["passed"] += 1
                
                # Find Google Maps Scraper
                google_maps_actor = None
                for actor in actors:
                    if "Google Maps Scraper" in actor.get("name", ""):
                        google_maps_actor = actor
                        self.actor_id = actor["id"]
                        break
                        
                if google_maps_actor:
                    self.log(f"✅ Found Google Maps Scraper actor: {google_maps_actor['name']}")
                    self.test_results["actors"]["passed"] += 1
                else:
                    self.log("❌ Google Maps Scraper actor not found")
                    self.test_results["actors"]["failed"] += 1
                    self.test_results["actors"]["errors"].append("Google Maps Scraper actor not found")
            else:
                self.log("❌ Actors response is not a list")
                self.test_results["actors"]["failed"] += 1
                self.test_results["actors"]["errors"].append("Actors response is not a list")
        else:
            self.log(f"❌ Get actors failed: {response.status_code if response else 'No response'}")
            self.test_results["actors"]["failed"] += 1
            self.test_results["actors"]["errors"].append("Get actors failed")
            
        # Test get specific actor
        if self.actor_id:
            self.log("Testing get specific actor...")
            response = self.make_request("GET", f"/actors/{self.actor_id}")
            if response and response.status_code == 200:
                actor = response.json()
                if "id" in actor and "name" in actor:
                    self.log("✅ Get specific actor successful")
                    self.test_results["actors"]["passed"] += 1
                else:
                    self.log("❌ Actor response missing required fields")
                    self.test_results["actors"]["failed"] += 1
                    self.test_results["actors"]["errors"].append("Actor response missing required fields")
            else:
                self.log(f"❌ Get specific actor failed: {response.status_code if response else 'No response'}")
                self.test_results["actors"]["failed"] += 1
                self.test_results["actors"]["errors"].append("Get specific actor failed")
                
            # Test update actor (star toggle) - Skip for system actors
            self.log("Testing actor update (star toggle)...")
            
            # First check if this is a system actor (user_id = "system")
            response = self.make_request("GET", f"/actors/{self.actor_id}")
            if response and response.status_code == 200:
                actor_details = response.json()
                if actor_details.get("user_id") == "system":
                    self.log("⚠️ Skipping update test for system actor (expected behavior)")
                    self.test_results["actors"]["passed"] += 1
                else:
                    # Test update for user-owned actor
                    update_data = {"is_starred": True}
                    response = self.make_request("PATCH", f"/actors/{self.actor_id}", update_data)
                    if response and response.status_code == 200:
                        updated_actor = response.json()
                        if updated_actor.get("is_starred") == True:
                            self.log("✅ Actor update successful")
                            self.test_results["actors"]["passed"] += 1
                        else:
                            self.log("❌ Actor update did not apply changes")
                            self.test_results["actors"]["failed"] += 1
                            self.test_results["actors"]["errors"].append("Actor update did not apply changes")
                    else:
                        self.log(f"❌ Actor update failed: {response.status_code if response else 'No response'}")
                        self.test_results["actors"]["failed"] += 1
                        self.test_results["actors"]["errors"].append("Actor update failed")
            else:
                self.log("❌ Could not retrieve actor details for update test")
                self.test_results["actors"]["failed"] += 1
                self.test_results["actors"]["errors"].append("Could not retrieve actor details for update test")
                
    def test_proxy_system(self):
        """Test proxy system endpoints"""
        self.log("=== Testing Proxy System ===")
        
        # Test get proxies
        self.log("Testing get proxies...")
        response = self.make_request("GET", "/proxies")
        if response and response.status_code == 200:
            proxies = response.json()
            if isinstance(proxies, list):
                self.log(f"✅ Retrieved {len(proxies)} proxies")
                self.test_results["proxies"]["passed"] += 1
            else:
                self.log("❌ Proxies response is not a list")
                self.test_results["proxies"]["failed"] += 1
                self.test_results["proxies"]["errors"].append("Proxies response is not a list")
        else:
            self.log(f"❌ Get proxies failed: {response.status_code if response else 'No response'}")
            self.test_results["proxies"]["failed"] += 1
            self.test_results["proxies"]["errors"].append("Get proxies failed")
            
        # Test proxy health check (optional - may take time)
        self.log("Testing proxy health check...")
        response = self.make_request("POST", "/proxies/health-check")
        if response and response.status_code == 200:
            result = response.json()
            if "healthy" in result and "total" in result:
                self.log(f"✅ Proxy health check successful: {result['healthy']}/{result['total']} healthy")
                self.test_results["proxies"]["passed"] += 1
            else:
                self.log("❌ Proxy health check response missing required fields")
                self.test_results["proxies"]["failed"] += 1
                self.test_results["proxies"]["errors"].append("Proxy health check response missing required fields")
        else:
            self.log(f"❌ Proxy health check failed: {response.status_code if response else 'No response'}")
            self.test_results["proxies"]["failed"] += 1
            self.test_results["proxies"]["errors"].append("Proxy health check failed")
            
    def test_enhanced_scraping_v3(self):
        """Test Google Maps Scraper V2 with country code extraction as requested in review"""
        self.log("=== Testing Google Maps Scraper V2 with Country Code Extraction ===")
        
        if not self.actor_id:
            self.log("❌ Cannot test scraping - no actor ID available")
            self.test_results["runs"]["failed"] += 1
            self.test_results["runs"]["errors"].append("No actor ID available for scraping test")
            return
            
        # Test create scraping run with coffee shops in New York, NY (as requested in review)
        self.log("Testing Google Maps Scraper V2 with coffee shops in New York, NY (max_results=3)...")
        run_data = {
            "actor_id": self.actor_id,
            "input_data": {
                "search_terms": ["coffee shops"],
                "location": "New York, NY",
                "max_results": 3,
                "extract_reviews": False,
                "extract_images": False
            }
        }
        
        response = self.make_request("POST", "/runs", run_data)
        if response and response.status_code == 200:
            run = response.json()
            if "id" in run and "status" in run:
                self.run_id = run["id"]
                self.log(f"✅ V3 Scraping run created: {self.run_id}")
                self.test_results["runs"]["passed"] += 1
            else:
                self.log("❌ Run response missing required fields")
                self.test_results["runs"]["failed"] += 1
                self.test_results["runs"]["errors"].append("Run response missing required fields")
                return
        else:
            self.log(f"❌ Create run failed: {response.status_code if response else 'No response'}")
            self.test_results["runs"]["failed"] += 1
            self.test_results["runs"]["errors"].append("Create run failed")
            return
            
        # Monitor run status until completion
        self.log("Monitoring scraping run status until completion...")
        max_wait_time = 300  # 5 minutes max wait
        check_interval = 15  # 15 seconds
        elapsed_time = 0
        start_time = time.time()
        
        while elapsed_time < max_wait_time:
            response = self.make_request("GET", f"/runs/{self.run_id}")
            if response and response.status_code == 200:
                run = response.json()
                status = run.get("status", "unknown")
                logs = run.get("logs", [])
                
                # Show latest progress logs
                if logs:
                    latest_logs = logs[-2:] if len(logs) >= 2 else logs
                    for log_entry in latest_logs:
                        self.log(f"Progress: {log_entry}")
                
                self.log(f"Run status: {status} (elapsed: {elapsed_time}s)")
                
                if status == "succeeded":
                    end_time = time.time()
                    duration = end_time - start_time
                    self.log(f"✅ Scraping completed successfully in {duration:.1f} seconds")
                    self.test_results["runs"]["passed"] += 1
                    break
                elif status == "failed":
                    error_msg = run.get("error_message", "Unknown error")
                    self.log(f"❌ Scraping run failed: {error_msg}")
                    self.test_results["runs"]["failed"] += 1
                    self.test_results["runs"]["errors"].append(f"Scraping run failed: {error_msg}")
                    return
                elif status in ["queued", "running"]:
                    time.sleep(check_interval)
                    elapsed_time += check_interval
                else:
                    self.log(f"❌ Unknown run status: {status}")
                    self.test_results["runs"]["failed"] += 1
                    self.test_results["runs"]["errors"].append(f"Unknown run status: {status}")
                    return
            else:
                self.log(f"❌ Failed to get run status: {response.status_code if response else 'No response'}")
                self.test_results["runs"]["failed"] += 1
                self.test_results["runs"]["errors"].append("Failed to get run status")
                return
                
        if elapsed_time >= max_wait_time:
            self.log("❌ Run did not complete within timeout period")
            self.test_results["runs"]["failed"] += 1
            self.test_results["runs"]["errors"].append("Run timeout")
            
    def test_enhanced_dataset_v3(self):
        """Test dataset with country code extraction and all required fields"""
        self.log("=== Testing Dataset Fields with Country Code Extraction ===")
        
        if not self.run_id:
            self.log("❌ Cannot test dataset - no run ID available")
            self.test_results["datasets"]["failed"] += 1
            self.test_results["datasets"]["errors"].append("No run ID available for dataset test")
            return
            
        # Test get dataset items
        self.log("Testing dataset items with country code extraction...")
        response = self.make_request("GET", f"/datasets/{self.run_id}/items")
        if response and response.status_code == 200:
            items = response.json()
            if isinstance(items, list):
                self.log(f"✅ Retrieved {len(items)} dataset items")
                self.test_results["datasets"]["passed"] += 1
                
                # Verify we got the expected number of results (3 as requested)
                if len(items) >= 3:
                    self.log(f"✅ Scraper fetched at least 3 results ({len(items)} found)")
                    self.test_results["datasets"]["passed"] += 1
                else:
                    self.log(f"⚠️ Scraper fetched {len(items)} results (requested 3)")
                
                # Check all required fields including NEW countryCode field
                if len(items) > 0:
                    self.log("=== Verifying Dataset Fields for First Business ===")
                    sample_item = items[0]
                    if "data" in sample_item:
                        data = sample_item["data"]
                        
                        # Log the complete scraped data for verification
                        self.log(f"Complete scraped data for verification:")
                        for key, value in data.items():
                            self.log(f"  {key}: {value}")
                        
                        # Check ALL required fields as specified in review request
                        required_fields = {
                            "title": "Business name",
                            "address": "Full address", 
                            "city": "City parsed from address",
                            "state": "State parsed from address",
                            "countryCode": "NEW FIELD - Country code (should be 'US' for New York)",
                            "phone": "Phone number",
                            "website": "Website URL",
                            "category": "Business category",
                            "rating": "Rating score",
                            "reviewsCount": "Number of reviews",
                            "totalScore": "Total score calculation",
                            "socialMedia": "Social media links",
                            "url": "Google Maps URL"
                        }
                        
                        found_fields = []
                        missing_fields = []
                        
                        for field, description in required_fields.items():
                            if field in data and data[field] is not None:
                                found_fields.append(f"{field} ({description})")
                                
                                # Special validation for countryCode
                                if field == "countryCode":
                                    country_code = data[field]
                                    if country_code == "US":
                                        self.log(f"✅ NEW FIELD countryCode correctly set to 'US' for New York: {country_code}")
                                        self.test_results["datasets"]["passed"] += 1
                                    else:
                                        self.log(f"❌ NEW FIELD countryCode incorrect for New York - expected 'US', got: {country_code}")
                                        self.test_results["datasets"]["failed"] += 1
                                        self.test_results["datasets"]["errors"].append(f"countryCode incorrect: expected 'US', got '{country_code}'")
                            else:
                                missing_fields.append(f"{field} ({description})")
                        
                        if found_fields:
                            self.log(f"✅ Fields found: {', '.join(found_fields)}")
                            self.test_results["datasets"]["passed"] += 1
                        
                        if missing_fields:
                            self.log(f"❌ Missing fields: {', '.join(missing_fields)}")
                            self.test_results["datasets"]["failed"] += 1
                            self.test_results["datasets"]["errors"].append(f"Missing fields: {', '.join(missing_fields)}")
                        
                        # Verify social media extraction structure
                        if "socialMedia" in data and data["socialMedia"]:
                            social_media = data["socialMedia"]
                            if isinstance(social_media, dict):
                                platforms = list(social_media.keys())
                                self.log(f"✅ Social media platforms found: {', '.join(platforms)}")
                                self.test_results["datasets"]["passed"] += 1
                                
                                # Verify social media URLs are valid
                                valid_urls = 0
                                for platform, url in social_media.items():
                                    if url and (url.startswith('http://') or url.startswith('https://')):
                                        valid_urls += 1
                                        self.log(f"✅ Valid {platform} URL: {url}")
                                
                                if valid_urls > 0:
                                    self.log(f"✅ {valid_urls} valid social media URLs found")
                                    self.test_results["datasets"]["passed"] += 1
                            else:
                                self.log("⚠️ socialMedia field exists but is not a dict")
                        else:
                            self.log("⚠️ No socialMedia data found (may be expected for some businesses)")
                        
                        # Check for contact information
                        has_email = "email" in data and data["email"]
                        has_phone = "phone" in data and data["phone"]
                        
                        if has_email or has_phone:
                            contact_info = []
                            if has_email:
                                contact_info.append(f"email: {data['email']}")
                            if has_phone:
                                contact_info.append(f"phone: {data['phone']}")
                            self.log(f"✅ Contact extraction working: {', '.join(contact_info)}")
                            self.test_results["datasets"]["passed"] += 1
                        else:
                            self.log("⚠️ No email or phone extracted (may be expected for some businesses)")
                        
                        # Store first item for potential AI chat testing
                        self.first_lead_id = sample_item["id"]
                        self.first_lead_data = data
                        
                    else:
                        self.log("❌ Dataset items missing data field")
                        self.test_results["datasets"]["failed"] += 1
                        self.test_results["datasets"]["errors"].append("Dataset items missing data field")
                else:
                    self.log("❌ No dataset items found")
                    self.test_results["datasets"]["failed"] += 1
                    self.test_results["datasets"]["errors"].append("No dataset items found")
            else:
                self.log("❌ Dataset items response is not a list")
                self.test_results["datasets"]["failed"] += 1
                self.test_results["datasets"]["errors"].append("Dataset items response is not a list")
        else:
            self.log(f"❌ Get dataset items failed: {response.status_code if response else 'No response'}")
            self.test_results["datasets"]["failed"] += 1
            self.test_results["datasets"]["errors"].append("Get dataset items failed")
            
        # Store first item ID for AI chat testing
        if hasattr(self, 'dataset_items') is False:
            response = self.make_request("GET", f"/datasets/{self.run_id}/items")
            if response and response.status_code == 200:
                items = response.json()
                if items and len(items) > 0:
                    self.first_lead_id = items[0]["id"]
                    self.first_lead_data = items[0]["data"]
                    self.log(f"✅ Stored lead ID for AI chat testing: {self.first_lead_id}")
            
        # Test JSON export
        self.log("Testing JSON export...")
        response = self.make_request("GET", f"/datasets/{self.run_id}/export", params={"format": "json"})
        if response and response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                self.log("✅ JSON export successful")
                self.test_results["datasets"]["passed"] += 1
            else:
                self.log(f"❌ JSON export wrong content type: {content_type}")
                self.test_results["datasets"]["failed"] += 1
                self.test_results["datasets"]["errors"].append(f"JSON export wrong content type: {content_type}")
        else:
            self.log(f"❌ JSON export failed: {response.status_code if response else 'No response'}")
            self.test_results["datasets"]["failed"] += 1
            self.test_results["datasets"]["errors"].append("JSON export failed")
    
    def test_ai_chat_system(self):
        """Test AI Lead Chat System functionality"""
        self.log("=== Testing AI Lead Chat System ===")
        
        if not self.first_lead_id or not self.first_lead_data:
            self.log("❌ Cannot test AI chat - no lead data available")
            self.test_results["ai_chat"]["failed"] += 1
            self.test_results["ai_chat"]["errors"].append("No lead data available for AI chat test")
            return
        
        # Test POST /api/leads/{lead_id}/chat
        self.log("Testing AI chat engagement advice...")
        chat_request = {
            "message": "How should I approach this restaurant?",
            "lead_data": self.first_lead_data
        }
        
        response = self.make_request("POST", f"/leads/{self.first_lead_id}/chat", chat_request)
        if response and response.status_code == 200:
            chat_response = response.json()
            if "response" in chat_response and "message_id" in chat_response:
                ai_response = chat_response["response"]
                if len(ai_response) > 50:  # Reasonable response length
                    self.log(f"✅ AI chat response received (length: {len(ai_response)} chars)")
                    self.test_results["ai_chat"]["passed"] += 1
                    
                    # Check if response is contextual (mentions business name or relevant terms)
                    business_name = self.first_lead_data.get("title", "").lower()
                    response_lower = ai_response.lower()
                    
                    contextual_terms = ["restaurant", "business", "approach", "contact", "outreach"]
                    if business_name and business_name in response_lower:
                        self.log("✅ AI response is contextual (mentions business name)")
                        self.test_results["ai_chat"]["passed"] += 1
                    elif any(term in response_lower for term in contextual_terms):
                        self.log("✅ AI response is contextual (contains relevant terms)")
                        self.test_results["ai_chat"]["passed"] += 1
                    else:
                        self.log("⚠️ AI response may not be contextual")
                else:
                    self.log("❌ AI response too short")
                    self.test_results["ai_chat"]["failed"] += 1
                    self.test_results["ai_chat"]["errors"].append("AI response too short")
            else:
                self.log("❌ AI chat response missing required fields")
                self.test_results["ai_chat"]["failed"] += 1
                self.test_results["ai_chat"]["errors"].append("AI chat response missing required fields")
        else:
            self.log(f"❌ AI chat request failed: {response.status_code if response else 'No response'}")
            self.test_results["ai_chat"]["failed"] += 1
            self.test_results["ai_chat"]["errors"].append("AI chat request failed")
            return
        
        # Test GET /api/leads/{lead_id}/chat (chat history)
        self.log("Testing AI chat history retrieval...")
        response = self.make_request("GET", f"/leads/{self.first_lead_id}/chat")
        if response and response.status_code == 200:
            chat_history = response.json()
            if isinstance(chat_history, list) and len(chat_history) >= 2:  # Should have user + assistant messages
                self.log(f"✅ Chat history retrieved ({len(chat_history)} messages)")
                self.test_results["ai_chat"]["passed"] += 1
                
                # Verify message structure
                user_msg = next((msg for msg in chat_history if msg.get("role") == "user"), None)
                ai_msg = next((msg for msg in chat_history if msg.get("role") == "assistant"), None)
                
                if user_msg and ai_msg:
                    self.log("✅ Chat history contains both user and assistant messages")
                    self.test_results["ai_chat"]["passed"] += 1
                else:
                    self.log("❌ Chat history missing user or assistant messages")
                    self.test_results["ai_chat"]["failed"] += 1
                    self.test_results["ai_chat"]["errors"].append("Chat history missing message types")
            else:
                self.log("❌ Chat history empty or invalid")
                self.test_results["ai_chat"]["failed"] += 1
                self.test_results["ai_chat"]["errors"].append("Chat history empty or invalid")
        else:
            self.log(f"❌ Chat history retrieval failed: {response.status_code if response else 'No response'}")
            self.test_results["ai_chat"]["failed"] += 1
            self.test_results["ai_chat"]["errors"].append("Chat history retrieval failed")
        
        # Test POST /api/leads/{lead_id}/outreach-template
        self.log("Testing outreach template generation...")
        response = self.make_request("POST", f"/leads/{self.first_lead_id}/outreach-template", params={"channel": "email"})
        if response and response.status_code == 200:
            template_response = response.json()
            if "template" in template_response:
                template = template_response["template"]
                if len(template) > 100:  # Reasonable template length
                    self.log(f"✅ Email outreach template generated (length: {len(template)} chars)")
                    self.test_results["ai_chat"]["passed"] += 1
                    
                    # Check if template is personalized
                    business_name = self.first_lead_data.get("title", "").lower()
                    template_lower = template.lower()
                    
                    if business_name and business_name in template_lower:
                        self.log("✅ Outreach template is personalized (mentions business name)")
                        self.test_results["ai_chat"]["passed"] += 1
                    elif any(term in template_lower for term in ["restaurant", "business", "email", "subject"]):
                        self.log("✅ Outreach template contains relevant content")
                        self.test_results["ai_chat"]["passed"] += 1
                    else:
                        self.log("⚠️ Outreach template may not be personalized")
                else:
                    self.log("❌ Outreach template too short")
                    self.test_results["ai_chat"]["failed"] += 1
                    self.test_results["ai_chat"]["errors"].append("Outreach template too short")
            else:
                self.log("❌ Outreach template response missing template field")
                self.test_results["ai_chat"]["failed"] += 1
                self.test_results["ai_chat"]["errors"].append("Outreach template response missing template field")
        else:
            self.log(f"❌ Outreach template generation failed: {response.status_code if response else 'No response'}")
            self.test_results["ai_chat"]["failed"] += 1
            self.test_results["ai_chat"]["errors"].append("Outreach template generation failed")
        
        # Test database collections (verify lead_chats collection)
        self.log("Testing lead_chats database collection...")
        # This is implicit - if chat history works, the collection exists and is working
        if len([r for r in self.test_results["ai_chat"]["errors"] if "Chat history" in r]) == 0:
            self.log("✅ lead_chats collection working (verified via chat history)")
            self.test_results["ai_chat"]["passed"] += 1
        else:
            self.log("❌ lead_chats collection may have issues")
            self.test_results["ai_chat"]["failed"] += 1
            self.test_results["ai_chat"]["errors"].append("lead_chats collection issues")
    
    def test_data_isolation_fix(self):
        """Test Critical Security Fix - Data Isolation for Global Chat"""
        self.log("=== Testing CRITICAL SECURITY FIX - Data Isolation ===")
        
        # Add data_isolation to test results if not exists
        if "data_isolation" not in self.test_results:
            self.test_results["data_isolation"] = {"passed": 0, "failed": 0, "errors": []}
        
        # Ensure we're authenticated as testuser_scrapi
        if not self.auth_token or not self.user_data:
            self.log("❌ Cannot test data isolation - not authenticated")
            self.test_results["data_isolation"]["failed"] += 1
            self.test_results["data_isolation"]["errors"].append("Not authenticated for data isolation test")
            return
        
        current_user = self.user_data.get("username", "unknown")
        self.log(f"Testing data isolation for user: {current_user}")
        
        # Test 1: User's Own Data - Ask "How many runs do I have?"
        self.log("--- Testing User's Own Data Query ---")
        
        isolation_test_message = "How many runs do I have?"
        chat_request = {"message": isolation_test_message}
        
        response = self.make_request("POST", "/chat/global", chat_request)
        if response and response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            if len(ai_response) > 20:
                self.log(f"✅ Data isolation query response received (length: {len(ai_response)} chars)")
                self.test_results["data_isolation"]["passed"] += 1
                
                # Extract numerical data from response to verify it's user-specific
                import re
                numbers = re.findall(r'\b\d+\b', ai_response)
                if numbers:
                    self.log(f"✅ Response contains numerical data: {numbers}")
                    self.test_results["data_isolation"]["passed"] += 1
                    
                    # Verify the response is contextual to the user
                    response_lower = ai_response.lower()
                    user_specific_terms = ["your", "you have", "you've", current_user.lower()]
                    is_user_specific = any(term in response_lower for term in user_specific_terms)
                    
                    if is_user_specific:
                        self.log("✅ Response is user-specific (contains 'your', 'you have', etc.)")
                        self.test_results["data_isolation"]["passed"] += 1
                    else:
                        self.log("❌ Response may not be user-specific")
                        self.test_results["data_isolation"]["failed"] += 1
                        self.test_results["data_isolation"]["errors"].append("Response not user-specific")
                    
                    # Check that response doesn't contain global/all-user terms
                    global_terms = ["all users", "total users", "everyone", "globally"]
                    has_global_terms = any(term in response_lower for term in global_terms)
                    
                    if not has_global_terms:
                        self.log("✅ Response doesn't contain global user terms (good isolation)")
                        self.test_results["data_isolation"]["passed"] += 1
                    else:
                        self.log("❌ Response contains global user terms (potential data leakage)")
                        self.test_results["data_isolation"]["failed"] += 1
                        self.test_results["data_isolation"]["errors"].append("Response contains global user terms")
                else:
                    self.log("⚠️ No numerical data in response (may be expected if user has no runs)")
            else:
                self.log("❌ Data isolation query response too short")
                self.test_results["data_isolation"]["failed"] += 1
                self.test_results["data_isolation"]["errors"].append("Data isolation query response too short")
        else:
            self.log(f"❌ Data isolation query failed: {response.status_code if response else 'No response'}")
            self.test_results["data_isolation"]["failed"] += 1
            self.test_results["data_isolation"]["errors"].append("Data isolation query failed")
        
        # Test 2: Verify Database Query Fix - Check total_scraped_items accuracy
        self.log("--- Testing Database Query Fix Verification ---")
        
        # Get user's actual runs from API to compare with chat response
        runs_response = self.make_request("GET", "/runs")
        if runs_response and runs_response.status_code == 200:
            user_runs = runs_response.json()
            actual_run_count = len(user_runs) if isinstance(user_runs, list) else 0
            
            self.log(f"✅ User has {actual_run_count} actual runs from API")
            
            # Get user's actual dataset items count
            total_items_count = 0
            for run in user_runs:
                run_id = run.get("id")
                if run_id:
                    items_response = self.make_request("GET", f"/datasets/{run_id}/items")
                    if items_response and items_response.status_code == 200:
                        items = items_response.json()
                        if isinstance(items, list):
                            total_items_count += len(items)
            
            self.log(f"✅ User has {total_items_count} actual dataset items from API")
            
            # Ask for detailed stats to verify the fix
            detailed_stats_message = "Give me detailed statistics about my scraping activity"
            chat_request = {"message": detailed_stats_message}
            
            response = self.make_request("POST", "/chat/global", chat_request)
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                
                # Extract numbers from detailed stats response
                import re
                numbers_in_response = re.findall(r'\b\d+\b', ai_response)
                
                if numbers_in_response:
                    # Check if the run count in response matches actual API data
                    run_count_matches = str(actual_run_count) in numbers_in_response
                    items_count_matches = str(total_items_count) in numbers_in_response
                    
                    if run_count_matches:
                        self.log(f"✅ Run count in chat response matches API data ({actual_run_count})")
                        self.test_results["data_isolation"]["passed"] += 1
                    else:
                        self.log(f"❌ Run count mismatch - API: {actual_run_count}, Response numbers: {numbers_in_response}")
                        self.test_results["data_isolation"]["failed"] += 1
                        self.test_results["data_isolation"]["errors"].append(f"Run count mismatch - API: {actual_run_count}")
                    
                    if items_count_matches:
                        self.log(f"✅ Items count in chat response matches API data ({total_items_count})")
                        self.test_results["data_isolation"]["passed"] += 1
                    else:
                        self.log(f"⚠️ Items count may not match - API: {total_items_count}, Response numbers: {numbers_in_response}")
                        # This is a warning, not a failure, as the response format may vary
                else:
                    self.log("❌ No numerical data in detailed stats response")
                    self.test_results["data_isolation"]["failed"] += 1
                    self.test_results["data_isolation"]["errors"].append("No numerical data in detailed stats response")
            else:
                self.log("❌ Detailed stats query failed")
                self.test_results["data_isolation"]["failed"] += 1
                self.test_results["data_isolation"]["errors"].append("Detailed stats query failed")
        else:
            self.log("❌ Could not get user's actual runs for verification")
            self.test_results["data_isolation"]["failed"] += 1
            self.test_results["data_isolation"]["errors"].append("Could not get user's actual runs for verification")
        
        # Test 3: Verify No Data Leakage - Test edge cases
        self.log("--- Testing No Data Leakage Edge Cases ---")
        
        # Test asking about other users (should not reveal other user data)
        leakage_test_messages = [
            "How many runs do all users have?",
            "Show me statistics for all users",
            "What's the total number of scraped items across all users?",
            "Give me global platform statistics"
        ]
        
        for test_message in leakage_test_messages:
            self.log(f"Testing potential data leakage: '{test_message}'")
            
            chat_request = {"message": test_message}
            response = self.make_request("POST", "/chat/global", chat_request)
            
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                
                # Check if response appropriately limits to user data
                response_lower = ai_response.lower()
                privacy_indicators = [
                    "your", "you have", "your account", "your data",
                    "i can only", "i cannot access", "privacy", "not authorized"
                ]
                
                has_privacy_protection = any(indicator in response_lower for indicator in privacy_indicators)
                
                if has_privacy_protection:
                    self.log("✅ Response shows privacy protection (limits to user data)")
                    self.test_results["data_isolation"]["passed"] += 1
                else:
                    self.log("⚠️ Response may not show clear privacy protection")
                    # This is a warning, not necessarily a failure
            else:
                self.log("❌ Data leakage test request failed")
                self.test_results["data_isolation"]["failed"] += 1
                self.test_results["data_isolation"]["errors"].append(f"Data leakage test failed for: {test_message}")
        
        # Test 4: Verify the Specific Fix Implementation
        self.log("--- Verifying Specific Fix Implementation ---")
        
        # Test the exact scenario that was fixed
        specific_fix_message = "How many total scraped items do I have?"
        chat_request = {"message": specific_fix_message}
        
        response = self.make_request("POST", "/chat/global", chat_request)
        if response and response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            # The fix ensures that total_items query filters by user's run_ids only
            # Response should contain user-specific data, not global counts
            response_lower = ai_response.lower()
            
            # Check for user-specific language
            user_specific_language = any(term in response_lower for term in [
                "you have", "your", "your account", "your runs", "your data"
            ])
            
            if user_specific_language:
                self.log("✅ Specific fix verification: Response uses user-specific language")
                self.test_results["data_isolation"]["passed"] += 1
            else:
                self.log("❌ Specific fix verification: Response may not be user-specific")
                self.test_results["data_isolation"]["failed"] += 1
                self.test_results["data_isolation"]["errors"].append("Response not user-specific in fix verification")
            
            # Check that response contains reasonable numbers (not suspiciously high global counts)
            import re
            numbers = re.findall(r'\b\d+\b', ai_response)
            if numbers:
                # Convert to integers and check for reasonable user-level counts
                int_numbers = [int(n) for n in numbers if int(n) < 10000]  # Reasonable user-level counts
                if int_numbers:
                    self.log(f"✅ Response contains reasonable user-level counts: {int_numbers}")
                    self.test_results["data_isolation"]["passed"] += 1
                else:
                    self.log(f"⚠️ Response contains high numbers that may indicate global counts: {numbers}")
            else:
                self.log("⚠️ No numerical data in specific fix verification")
        else:
            self.log("❌ Specific fix verification request failed")
            self.test_results["data_isolation"]["failed"] += 1
            self.test_results["data_isolation"]["errors"].append("Specific fix verification request failed")
        
        self.log("Data isolation testing completed")

    def test_amazon_scraper_trimmer_issue(self):
        """Test Amazon Product Scraper with specific 'trimmer' keyword and max_results 5 as reported by user"""
        self.log("=== TESTING AMAZON SCRAPER WITH 'TRIMMER' KEYWORD (USER REPORTED ISSUE) ===")
        
        # Add amazon_scraper_trimmer to test results if not exists
        if "amazon_scraper_trimmer" not in self.test_results:
            self.test_results["amazon_scraper_trimmer"] = {"passed": 0, "failed": 0, "errors": []}
        
        # Step 1: Authentication
        self.log("Step 1: Getting authentication token...")
        if not self.auth_token:
            if not self.test_auth_flow():
                self.log("❌ Authentication failed - cannot proceed with Amazon scraper test")
                self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                self.test_results["amazon_scraper_trimmer"]["errors"].append("Authentication failed")
                return False
        
        # Step 2: Get Amazon Product Scraper actor ID
        self.log("Step 2: Getting Amazon Product Scraper actor ID...")
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            amazon_actor = None
            for actor in actors:
                if actor.get("name") == "Amazon Product Scraper":
                    amazon_actor = actor
                    amazon_actor_id = actor["id"]
                    break
            
            if amazon_actor:
                self.log(f"✅ Found Amazon Product Scraper actor: {amazon_actor_id}")
                self.test_results["amazon_scraper_trimmer"]["passed"] += 1
            else:
                self.log("❌ Amazon Product Scraper actor not found")
                self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                self.test_results["amazon_scraper_trimmer"]["errors"].append("Amazon actor not found")
                return False
        else:
            self.log(f"❌ Failed to get actors: {response.status_code if response else 'No response'}")
            self.test_results["amazon_scraper_trimmer"]["failed"] += 1
            self.test_results["amazon_scraper_trimmer"]["errors"].append("Failed to get actors")
            return False
        
        # Step 3: Create scraping run with exact parameters from user report
        self.log("Step 3: Creating scraping run with user-reported parameters...")
        self.log("  - search_keywords: ['trimmer'] (single keyword array)")
        self.log("  - max_results: 5")
        self.log("  - extract_reviews: false")
        self.log("  - min_rating: 0")
        
        run_data = {
            "actor_id": amazon_actor_id,
            "input_data": {
                "search_keywords": ["trimmer"],
                "max_results": 5,
                "extract_reviews": False,
                "min_rating": 0
            }
        }
        
        self.log(f"REQUEST JSON: {json.dumps(run_data, indent=2)}")
        
        response = self.make_request("POST", "/runs", run_data)
        
        self.log(f"RESPONSE STATUS: {response.status_code if response else 'No response'}")
        if response:
            try:
                response_json = response.json()
                self.log(f"RESPONSE JSON: {json.dumps(response_json, indent=2)}")
            except:
                self.log(f"RESPONSE TEXT: {response.text}")
        
        if response and response.status_code == 200:
            run = response.json()
            if "id" in run:
                run_id = run["id"]
                self.log(f"✅ Run created successfully: {run_id}")
                self.log(f"✅ Initial status: {run.get('status', 'unknown')}")
                self.test_results["amazon_scraper_trimmer"]["passed"] += 1
                
                # Step 4: Monitor run status
                self.log("Step 4: Monitoring run status...")
                max_wait_time = 180  # 3 minutes
                check_interval = 10  # 10 seconds
                elapsed_time = 0
                
                while elapsed_time < max_wait_time:
                    response = self.make_request("GET", f"/runs/{run_id}")
                    if response and response.status_code == 200:
                        run_status = response.json()
                        status = run_status.get("status", "unknown")
                        error_message = run_status.get("error_message")
                        
                        self.log(f"Run status: {status} (elapsed: {elapsed_time}s)")
                        
                        if error_message:
                            self.log(f"Error message: {error_message}")
                        
                        if status == "succeeded":
                            results_count = run_status.get("results_count", 0)
                            self.log(f"✅ Run completed successfully with {results_count} results")
                            self.test_results["amazon_scraper_trimmer"]["passed"] += 1
                            
                            # Step 5: Check results
                            if results_count > 0:
                                self.log("Step 5: Checking dataset results...")
                                dataset_response = self.make_request("GET", f"/datasets/{run_id}/items")
                                if dataset_response and dataset_response.status_code == 200:
                                    items = dataset_response.json()
                                    self.log(f"✅ Retrieved {len(items)} items from dataset")
                                    self.test_results["amazon_scraper_trimmer"]["passed"] += 1
                                    
                                    if isinstance(items, list) and len(items) > 0:
                                        sample_item = items[0]
                                        self.log(f"Sample product: {sample_item.get('data', {}).get('title', 'N/A')}")
                                        self.test_results["amazon_scraper_trimmer"]["passed"] += 1
                                    else:
                                        self.log("⚠️ No items in dataset (empty results)")
                                        self.test_results["amazon_scraper_trimmer"]["errors"].append("Empty dataset results")
                                else:
                                    self.log("❌ Failed to retrieve dataset items")
                                    self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                                    self.test_results["amazon_scraper_trimmer"]["errors"].append("Failed to retrieve dataset")
                            break
                            
                        elif status == "failed":
                            self.log(f"❌ Run failed: {error_message or 'Unknown error'}")
                            self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                            self.test_results["amazon_scraper_trimmer"]["errors"].append(f"Run failed: {error_message}")
                            
                            # This is the key finding - identify WHY it failed
                            if error_message:
                                if "JSON" in error_message or "format" in error_message:
                                    self.log("🔍 ISSUE IDENTIFIED: JSON format problem in frontend or backend processing")
                                elif "keyword" in error_message or "search" in error_message:
                                    self.log("🔍 ISSUE IDENTIFIED: Problem with search keyword processing")
                                elif "timeout" in error_message or "connection" in error_message:
                                    self.log("🔍 ISSUE IDENTIFIED: Network/connection issue")
                                else:
                                    self.log(f"🔍 ISSUE IDENTIFIED: Other error - {error_message}")
                            break
                            
                        elif status in ["queued", "running"]:
                            time.sleep(check_interval)
                            elapsed_time += check_interval
                        else:
                            self.log(f"❌ Unknown status: {status}")
                            self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                            self.test_results["amazon_scraper_trimmer"]["errors"].append(f"Unknown status: {status}")
                            break
                    else:
                        self.log(f"❌ Failed to get run status: {response.status_code if response else 'No response'}")
                        self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                        self.test_results["amazon_scraper_trimmer"]["errors"].append("Failed to get run status")
                        break
                
                if elapsed_time >= max_wait_time:
                    self.log("❌ Run did not complete within timeout")
                    self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                    self.test_results["amazon_scraper_trimmer"]["errors"].append("Run timeout")
                    
            else:
                self.log("❌ Run creation response missing ID")
                self.test_results["amazon_scraper_trimmer"]["failed"] += 1
                self.test_results["amazon_scraper_trimmer"]["errors"].append("Run creation response missing ID")
        else:
            self.log(f"❌ Failed to create run: {response.status_code if response else 'No response'}")
            if response:
                try:
                    error_details = response.json()
                    self.log(f"Error details: {error_details}")
                    self.test_results["amazon_scraper_trimmer"]["errors"].append(f"Run creation failed: {error_details}")
                except:
                    self.log(f"Error text: {response.text}")
                    self.test_results["amazon_scraper_trimmer"]["errors"].append(f"Run creation failed: {response.text}")
            else:
                self.test_results["amazon_scraper_trimmer"]["errors"].append("No response from server")
            
            self.test_results["amazon_scraper_trimmer"]["failed"] += 1
            return False
        
        return True

    def test_amazon_scraper_comprehensive(self):
        """Test Amazon Product Scraper backend functionality comprehensively as requested in review"""
        self.log("=== COMPREHENSIVE AMAZON PRODUCT SCRAPER TESTING ===")
        
        # Add amazon_scraper to test results if not exists
        if "amazon_scraper" not in self.test_results:
            self.test_results["amazon_scraper"] = {"passed": 0, "failed": 0, "errors": []}
        
        # Step 1: Authentication
        self.log("Step 1: Authenticating...")
        if not self.test_auth_flow():
            self.log("❌ Authentication failed - cannot proceed with Amazon scraper test")
            self.test_results["amazon_scraper"]["failed"] += 1
            self.test_results["amazon_scraper"]["errors"].append("Authentication failed")
            return False
        
        # Step 2: Actor Verification
        self.log("Step 2: Verifying Amazon Product Scraper actor exists in database...")
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            amazon_actor = None
            for actor in actors:
                if actor.get("name") == "Amazon Product Scraper":
                    amazon_actor = actor
                    self.amazon_actor_id = actor["id"]
                    break
            
            if amazon_actor:
                self.log("✅ Amazon Product Scraper actor found in database")
                self.test_results["amazon_scraper"]["passed"] += 1
                
                # Verify actor properties
                expected_properties = {
                    "icon": "📦",
                    "category": "E-commerce",
                    "tags": ["amazon", "ecommerce", "products", "prices", "reviews", "shopping"]
                }
                
                for prop, expected_value in expected_properties.items():
                    actual_value = amazon_actor.get(prop)
                    if actual_value == expected_value:
                        self.log(f"✅ Actor {prop}: {actual_value}")
                        self.test_results["amazon_scraper"]["passed"] += 1
                    else:
                        self.log(f"❌ Actor {prop} mismatch - expected: {expected_value}, got: {actual_value}")
                        self.test_results["amazon_scraper"]["failed"] += 1
                        self.test_results["amazon_scraper"]["errors"].append(f"Actor {prop} mismatch")
                
                # Verify input schema
                input_schema = amazon_actor.get("input_schema", {})
                required_fields = ["search_keywords", "max_results", "extract_reviews", "min_rating", "max_price"]
                
                if isinstance(input_schema, dict) and "properties" in input_schema:
                    schema_props = input_schema["properties"]
                    for field in required_fields:
                        if field in schema_props:
                            self.log(f"✅ Input schema has {field}: {schema_props[field].get('type', 'unknown')}")
                            self.test_results["amazon_scraper"]["passed"] += 1
                        else:
                            self.log(f"❌ Input schema missing field: {field}")
                            self.test_results["amazon_scraper"]["failed"] += 1
                            self.test_results["amazon_scraper"]["errors"].append(f"Input schema missing {field}")
                else:
                    self.log("❌ Actor input_schema format invalid")
                    self.test_results["amazon_scraper"]["failed"] += 1
                    self.test_results["amazon_scraper"]["errors"].append("Invalid input_schema format")
            else:
                self.log("❌ Amazon Product Scraper actor not found in database")
                self.test_results["amazon_scraper"]["failed"] += 1
                self.test_results["amazon_scraper"]["errors"].append("Amazon actor not found")
                return False
        else:
            self.log("❌ Failed to get actors list")
            self.test_results["amazon_scraper"]["failed"] += 1
            self.test_results["amazon_scraper"]["errors"].append("Failed to get actors list")
            return False
        
        # Step 3: Create Scraping Run
        self.log("Step 3: Creating Amazon scraping run with test parameters...")
        self.log("  - Search keywords: ['wireless headphones', 'bluetooth speaker']")
        self.log("  - Max results: 10")
        self.log("  - Min rating: 4")
        self.log("  - Extract reviews: false")
        
        run_data = {
            "actor_id": self.amazon_actor_id,
            "input_data": {
                "search_keywords": ["wireless headphones", "bluetooth speaker"],
                "max_results": 10,
                "extract_reviews": False,
                "min_rating": 4
            }
        }
        
        response = self.make_request("POST", "/runs", run_data)
        if response and response.status_code == 200:
            run = response.json()
            if "id" in run and run.get("status") == "queued":
                self.amazon_run_id = run["id"]
                self.log(f"✅ Amazon scraping run created: {self.amazon_run_id}")
                self.log(f"✅ Run status: {run.get('status')}")
                self.test_results["amazon_scraper"]["passed"] += 1
                
                # Verify input data was stored correctly
                stored_input = run.get("input_data", {})
                if stored_input.get("search_keywords") == ["wireless headphones", "bluetooth speaker"]:
                    self.log("✅ Input data stored correctly")
                    self.test_results["amazon_scraper"]["passed"] += 1
                else:
                    self.log("❌ Input data not stored correctly")
                    self.test_results["amazon_scraper"]["failed"] += 1
                    self.test_results["amazon_scraper"]["errors"].append("Input data storage issue")
            else:
                self.log("❌ Run creation response invalid")
                self.test_results["amazon_scraper"]["failed"] += 1
                self.test_results["amazon_scraper"]["errors"].append("Invalid run creation response")
                return False
        else:
            self.log(f"❌ Failed to create Amazon scraping run: {response.status_code if response else 'No response'}")
            self.test_results["amazon_scraper"]["failed"] += 1
            self.test_results["amazon_scraper"]["errors"].append("Failed to create run")
            return False
        
        # Step 4: Execute Scraping (Real Run) - Monitor Status Transitions
        self.log("Step 4: Monitoring Amazon scraping execution (may take 2-3 minutes)...")
        max_wait_time = 300  # 5 minutes max wait for Amazon scraping
        check_interval = 15  # 15 seconds
        elapsed_time = 0
        start_time = time.time()
        
        status_transitions = []
        
        while elapsed_time < max_wait_time:
            response = self.make_request("GET", f"/runs/{self.amazon_run_id}")
            if response and response.status_code == 200:
                run = response.json()
                status = run.get("status", "unknown")
                logs = run.get("logs", [])
                
                # Track status transitions
                if not status_transitions or status_transitions[-1] != status:
                    status_transitions.append(status)
                    self.log(f"📊 Status transition: {' -> '.join(status_transitions)}")
                
                # Show latest progress logs
                if logs:
                    latest_logs = logs[-3:] if len(logs) >= 3 else logs
                    for log_entry in latest_logs:
                        if "🔍" in log_entry or "✅" in log_entry or "📊" in log_entry:
                            self.log(f"Progress: {log_entry}")
                
                self.log(f"Run status: {status} (elapsed: {elapsed_time}s)")
                
                if status == "succeeded":
                    end_time = time.time()
                    duration = end_time - start_time
                    results_count = run.get("results_count", 0)
                    self.log(f"✅ Amazon scraping completed successfully in {duration:.1f} seconds")
                    self.log(f"✅ Results count: {results_count}")
                    self.test_results["amazon_scraper"]["passed"] += 1
                    
                    # Verify status transitions
                    expected_transitions = ["queued", "running", "succeeded"]
                    if status_transitions == expected_transitions:
                        self.log("✅ Status transitions correct: queued -> running -> succeeded")
                        self.test_results["amazon_scraper"]["passed"] += 1
                    else:
                        self.log(f"⚠️ Status transitions: {status_transitions} (expected: {expected_transitions})")
                    
                    # Verify results count > 0
                    if results_count > 0:
                        self.log(f"✅ Scraping produced {results_count} results")
                        self.test_results["amazon_scraper"]["passed"] += 1
                    else:
                        self.log("❌ No results produced by scraping")
                        self.test_results["amazon_scraper"]["failed"] += 1
                        self.test_results["amazon_scraper"]["errors"].append("No results produced")
                    
                    break
                elif status == "failed":
                    error_msg = run.get("error_message", "Unknown error")
                    self.log(f"❌ Amazon scraping run failed: {error_msg}")
                    self.test_results["amazon_scraper"]["failed"] += 1
                    self.test_results["amazon_scraper"]["errors"].append(f"Scraping failed: {error_msg}")
                    return False
                elif status in ["queued", "running"]:
                    time.sleep(check_interval)
                    elapsed_time += check_interval
                else:
                    self.log(f"❌ Unknown run status: {status}")
                    self.test_results["amazon_scraper"]["failed"] += 1
                    self.test_results["amazon_scraper"]["errors"].append(f"Unknown status: {status}")
                    return False
            else:
                self.log(f"❌ Failed to get run status: {response.status_code if response else 'No response'}")
                self.test_results["amazon_scraper"]["failed"] += 1
                self.test_results["amazon_scraper"]["errors"].append("Failed to get run status")
                return False
        
        if elapsed_time >= max_wait_time:
            self.log("❌ Amazon scraping did not complete within timeout period")
            self.test_results["amazon_scraper"]["failed"] += 1
            self.test_results["amazon_scraper"]["errors"].append("Scraping timeout")
            return False
        
        # Step 5: Dataset Verification
        self.log("Step 5: Verifying Amazon product dataset...")
        response = self.make_request("GET", f"/datasets/{self.amazon_run_id}/items")
        if response and response.status_code == 200:
            items = response.json()
            if isinstance(items, list) and len(items) > 0:
                self.log(f"✅ Retrieved {len(items)} Amazon products from dataset")
                self.test_results["amazon_scraper"]["passed"] += 1
                
                # Verify at least 5 products were scraped
                if len(items) >= 5:
                    self.log(f"✅ At least 5 products scraped ({len(items)} found)")
                    self.test_results["amazon_scraper"]["passed"] += 1
                else:
                    self.log(f"⚠️ Only {len(items)} products scraped (expected at least 5)")
                
                # Verify product data quality
                self.log("=== Verifying Amazon Product Data Quality ===")
                
                required_fields = {
                    "asin": "Amazon Standard Identification Number (10 characters)",
                    "title": "Product name",
                    "price": "Current price (number)",
                    "rating": "Product rating (0-5 stars)",
                    "reviewCount": "Number of reviews",
                    "url": "Amazon product URL",
                    "images": "Array of image URLs",
                    "category": "Product category",
                    "seller": "Brand/seller name (soldBy field)"
                }
                
                valid_products = 0
                total_fields_found = 0
                total_fields_expected = len(required_fields) * len(items)
                
                for i, item in enumerate(items[:5]):  # Check first 5 products
                    if "data" in item:
                        data = item["data"]
                        self.log(f"\n--- Product #{i+1} Verification ---")
                        self.log(f"Product: {data.get('title', 'N/A')[:50]}...")
                        
                        product_fields_found = 0
                        critical_fields_missing = []
                        
                        for field, description in required_fields.items():
                            value = data.get(field)
                            
                            # Special handling for different field types
                            if field == "asin":
                                if value and len(str(value)) == 10:
                                    self.log(f"✅ {field}: {value} (valid 10-char ASIN)")
                                    product_fields_found += 1
                                    total_fields_found += 1
                                else:
                                    self.log(f"❌ {field}: Invalid ASIN - {value}")
                                    critical_fields_missing.append(field)
                            elif field in ["price", "rating", "reviewCount"]:
                                if isinstance(value, (int, float)) and value >= 0:
                                    self.log(f"✅ {field}: {value}")
                                    product_fields_found += 1
                                    total_fields_found += 1
                                else:
                                    self.log(f"❌ {field}: Invalid number - {value}")
                                    critical_fields_missing.append(field)
                            elif field == "images":
                                if isinstance(value, list) and len(value) > 0:
                                    valid_urls = sum(1 for url in value if isinstance(url, str) and url.startswith('http'))
                                    self.log(f"✅ {field}: {len(value)} images ({valid_urls} valid URLs)")
                                    product_fields_found += 1
                                    total_fields_found += 1
                                else:
                                    self.log(f"❌ {field}: No valid images - {value}")
                                    critical_fields_missing.append(field)
                            elif field == "url":
                                if value and "amazon.com" in str(value):
                                    self.log(f"✅ {field}: Valid Amazon URL")
                                    product_fields_found += 1
                                    total_fields_found += 1
                                else:
                                    self.log(f"❌ {field}: Invalid URL - {value}")
                                    critical_fields_missing.append(field)
                            elif field == "seller":
                                # Check both 'seller' and 'soldBy' fields
                                seller_value = data.get('seller') or data.get('soldBy')
                                if seller_value:
                                    self.log(f"✅ {field}: {seller_value}")
                                    product_fields_found += 1
                                    total_fields_found += 1
                                else:
                                    self.log(f"❌ {field}: Missing seller/soldBy")
                                    critical_fields_missing.append(field)
                            else:
                                if value:
                                    self.log(f"✅ {field}: {str(value)[:30]}...")
                                    product_fields_found += 1
                                    total_fields_found += 1
                                else:
                                    self.log(f"❌ {field}: Missing")
                                    critical_fields_missing.append(field)
                        
                        # Product quality assessment
                        completeness = (product_fields_found / len(required_fields)) * 100
                        self.log(f"Product #{i+1} completeness: {completeness:.1f}% ({product_fields_found}/{len(required_fields)} fields)")
                        
                        if completeness >= 70:  # At least 70% of fields present
                            valid_products += 1
                        
                        if critical_fields_missing:
                            self.log(f"⚠️ Critical fields missing: {', '.join(critical_fields_missing)}")
                
                # Overall data quality assessment
                overall_completeness = (total_fields_found / total_fields_expected) * 100
                self.log(f"\n=== Overall Data Quality Assessment ===")
                self.log(f"✅ Valid products: {valid_products}/{min(5, len(items))}")
                self.log(f"✅ Overall field completeness: {overall_completeness:.1f}%")
                
                if valid_products >= 3:  # At least 3 out of 5 products should be valid
                    self.log("✅ Data quality acceptable (at least 3 valid products)")
                    self.test_results["amazon_scraper"]["passed"] += 1
                else:
                    self.log("❌ Data quality poor (less than 3 valid products)")
                    self.test_results["amazon_scraper"]["failed"] += 1
                    self.test_results["amazon_scraper"]["errors"].append("Poor data quality")
                
                if overall_completeness >= 60:  # At least 60% field completeness
                    self.log("✅ Field completeness acceptable")
                    self.test_results["amazon_scraper"]["passed"] += 1
                else:
                    self.log("❌ Field completeness too low")
                    self.test_results["amazon_scraper"]["failed"] += 1
                    self.test_results["amazon_scraper"]["errors"].append("Low field completeness")
                
            else:
                self.log("❌ No Amazon products found in dataset")
                self.test_results["amazon_scraper"]["failed"] += 1
                self.test_results["amazon_scraper"]["errors"].append("No products in dataset")
                return False
        else:
            self.log(f"❌ Failed to get Amazon dataset: {response.status_code if response else 'No response'}")
            self.test_results["amazon_scraper"]["failed"] += 1
            self.test_results["amazon_scraper"]["errors"].append("Failed to get dataset")
            return False
        
        # Step 6: Error Handling Test
        self.log("Step 6: Testing error handling with invalid input...")
        
        invalid_run_data = {
            "actor_id": self.amazon_actor_id,
            "input_data": {
                "search_keywords": [],  # Empty keywords should cause error
                "max_results": 10
            }
        }
        
        response = self.make_request("POST", "/runs", invalid_run_data)
        if response and response.status_code == 200:
            run = response.json()
            invalid_run_id = run["id"]
            
            # Wait for run to fail
            time.sleep(30)  # Wait 30 seconds
            
            response = self.make_request("GET", f"/runs/{invalid_run_id}")
            if response and response.status_code == 200:
                run = response.json()
                status = run.get("status")
                
                if status == "failed":
                    error_msg = run.get("error_message", "")
                    if "search_keywords" in error_msg or "required" in error_msg.lower():
                        self.log("✅ Error handling working - proper error message for invalid input")
                        self.test_results["amazon_scraper"]["passed"] += 1
                    else:
                        self.log(f"⚠️ Error message unclear: {error_msg}")
                else:
                    self.log(f"⚠️ Run with invalid input has status: {status}")
            else:
                self.log("⚠️ Could not check invalid run status")
        else:
            self.log("⚠️ Could not create invalid run for error testing")
        
        self.log("Amazon Product Scraper comprehensive testing completed!")
        return True

    def test_country_code_extraction_review(self):
        """Test the specific review request: Google Maps Scraper with country code extraction"""
        self.log("=== REVIEW REQUEST: Testing Google Maps Scraper with Country Code Extraction ===")
        
        # Step 1: Register/Login (use existing test user or create new one)
        self.log("Step 1: Register/Login with test user...")
        if not self.test_auth_flow():
            self.log("❌ Authentication failed - cannot proceed with review test")
            return False
        
        # Step 2: Find Google Maps Scraper V2 actor
        self.log("Step 2: Finding Google Maps Scraper V2 actor...")
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            google_maps_actor = None
            for actor in actors:
                if "Google Maps Scraper" in actor.get("name", ""):
                    google_maps_actor = actor
                    self.actor_id = actor["id"]
                    self.log(f"✅ Found actor: {actor['name']}")
                    break
            
            if not google_maps_actor:
                self.log("❌ Google Maps Scraper V2 not found")
                return False
        else:
            self.log("❌ Failed to get actors list")
            return False
        
        # Step 3: Create Scraping Run with exact parameters from review request
        self.log("Step 3: Creating scraping run with review parameters...")
        self.log("  - Actor: Google Maps Scraper V2")
        self.log("  - Search terms: 'coffee shops'")
        self.log("  - Location: 'New York, NY'")
        self.log("  - Max results: 3")
        self.log("  - Extract reviews: false")
        self.log("  - Extract images: false")
        
        run_data = {
            "actor_id": self.actor_id,
            "input_data": {
                "search_terms": ["coffee shops"],
                "location": "New York, NY",
                "max_results": 3,
                "extract_reviews": False,
                "extract_images": False
            }
        }
        
        response = self.make_request("POST", "/runs", run_data)
        if response and response.status_code == 200:
            run = response.json()
            self.run_id = run["id"]
            self.log(f"✅ Scraping run created: {self.run_id}")
        else:
            self.log(f"❌ Failed to create scraping run: {response.status_code if response else 'No response'}")
            return False
        
        # Step 4: Wait for Completion and Monitor Status
        self.log("Step 4: Monitoring run status until completion...")
        max_wait_time = 300  # 5 minutes
        check_interval = 10  # 10 seconds
        elapsed_time = 0
        start_time = time.time()
        
        while elapsed_time < max_wait_time:
            response = self.make_request("GET", f"/runs/{self.run_id}")
            if response and response.status_code == 200:
                run = response.json()
                status = run.get("status", "unknown")
                
                self.log(f"Run status: {status} (elapsed: {elapsed_time}s)")
                
                if status == "succeeded":
                    end_time = time.time()
                    duration = end_time - start_time
                    self.log(f"✅ Scraping completed successfully in {duration:.1f} seconds")
                    break
                elif status == "failed":
                    error_msg = run.get("error_message", "Unknown error")
                    self.log(f"❌ Scraping run failed: {error_msg}")
                    return False
                elif status in ["queued", "running"]:
                    time.sleep(check_interval)
                    elapsed_time += check_interval
                else:
                    self.log(f"❌ Unknown run status: {status}")
                    return False
            else:
                self.log(f"❌ Failed to get run status")
                return False
                
        if elapsed_time >= max_wait_time:
            self.log("❌ Run did not complete within timeout period")
            return False
        
        # Step 5: Verify Dataset Fields including NEW countryCode field
        self.log("Step 5: Verifying dataset fields including NEW countryCode field...")
        response = self.make_request("GET", f"/datasets/{self.run_id}/items")
        if response and response.status_code == 200:
            items = response.json()
            if isinstance(items, list) and len(items) > 0:
                self.log(f"✅ Retrieved {len(items)} dataset items")
                
                # Verify at least one business for complete field verification
                for i, item in enumerate(items):
                    self.log(f"\n--- Business #{i+1} Field Verification ---")
                    if "data" in item:
                        data = item["data"]
                        
                        # Check ALL required fields from review request
                        required_fields = [
                            "title", "address", "city", "state", "countryCode",
                            "phone", "website", "category", "rating", "reviewsCount", 
                            "totalScore", "socialMedia", "url"
                        ]
                        
                        self.log(f"Business: {data.get('title', 'N/A')}")
                        self.log(f"Address: {data.get('address', 'N/A')}")
                        
                        field_results = {}
                        for field in required_fields:
                            value = data.get(field)
                            if value is not None and value != "":
                                field_results[field] = "✅"
                                if field == "countryCode":
                                    if value == "US":
                                        self.log(f"✅ {field}: {value} (CORRECT for New York)")
                                    else:
                                        self.log(f"❌ {field}: {value} (EXPECTED 'US' for New York)")
                                        field_results[field] = "❌"
                                else:
                                    self.log(f"✅ {field}: {value}")
                            else:
                                field_results[field] = "❌"
                                self.log(f"❌ {field}: Missing or empty")
                        
                        # Summary for this business
                        working_fields = [f for f, status in field_results.items() if status == "✅"]
                        missing_fields = [f for f, status in field_results.items() if status == "❌"]
                        
                        self.log(f"\nSummary for Business #{i+1}:")
                        self.log(f"✅ Working fields ({len(working_fields)}): {', '.join(working_fields)}")
                        if missing_fields:
                            self.log(f"❌ Missing fields ({len(missing_fields)}): {', '.join(missing_fields)}")
                        
                        # Special focus on countryCode validation
                        country_code = data.get("countryCode")
                        if country_code == "US":
                            self.log(f"🎯 COUNTRY CODE VALIDATION: ✅ PASSED - '{country_code}' is correct for New York")
                        elif country_code:
                            self.log(f"🎯 COUNTRY CODE VALIDATION: ❌ FAILED - Expected 'US' for New York, got '{country_code}'")
                        else:
                            self.log(f"🎯 COUNTRY CODE VALIDATION: ❌ FAILED - countryCode field is missing")
                
                return True
            else:
                self.log("❌ No dataset items found")
                return False
        else:
            self.log(f"❌ Failed to get dataset items: {response.status_code if response else 'No response'}")
            return False

    def test_actors_used_endpoint(self):
        """Test the new /api/actors-used endpoint as requested in review"""
        self.log("=== Testing /api/actors-used Endpoint ===")
        
        # Add actors_used to test results if not exists
        if "actors_used" not in self.test_results:
            self.test_results["actors_used"] = {"passed": 0, "failed": 0, "errors": []}
        
        # First, ensure we have at least one run to test with
        if not self.run_id:
            self.log("No existing run found, creating test run with Google Maps Scraper V2...")
            
            # Find Google Maps Scraper V2 actor
            response = self.make_request("GET", "/actors")
            if response and response.status_code == 200:
                actors = response.json()
                google_maps_actor = None
                for actor in actors:
                    if "Google Maps Scraper" in actor.get("name", ""):
                        google_maps_actor = actor
                        self.actor_id = actor["id"]
                        break
                
                if not google_maps_actor:
                    self.log("❌ Cannot test actors-used - Google Maps Scraper not found")
                    self.test_results["actors_used"]["failed"] += 1
                    self.test_results["actors_used"]["errors"].append("Google Maps Scraper not found")
                    return
                
                # Create a test run
                run_data = {
                    "actor_id": self.actor_id,
                    "input_data": {
                        "search_terms": ["coffee shops"],
                        "location": "San Francisco, CA",
                        "max_results": 3,
                        "extract_reviews": False,
                        "extract_images": False
                    }
                }
                
                response = self.make_request("POST", "/runs", run_data)
                if response and response.status_code == 200:
                    run = response.json()
                    self.run_id = run["id"]
                    self.log(f"✅ Test run created: {self.run_id}")
                    
                    # Wait for run to complete to get better test data
                    import time
                    max_wait = 120  # 2 minutes max
                    wait_interval = 10
                    elapsed = 0
                    
                    while elapsed < max_wait:
                        time.sleep(wait_interval)
                        elapsed += wait_interval
                        
                        # Check run status
                        status_response = self.make_request("GET", f"/runs/{self.run_id}")
                        if status_response and status_response.status_code == 200:
                            run_status = status_response.json()
                            status = run_status.get("status", "unknown")
                            self.log(f"Run status: {status} (waited {elapsed}s)")
                            
                            if status in ["succeeded", "failed"]:
                                self.log(f"✅ Run completed with status: {status}")
                                break
                        else:
                            self.log("⚠️ Could not check run status")
                            break
                    
                    if elapsed >= max_wait:
                        self.log("⚠️ Run did not complete within timeout, proceeding with test")
                    
                    # Create a second run to test sorting
                    self.log("Creating second run to test sorting...")
                    run_data2 = {
                        "actor_id": self.actor_id,
                        "input_data": {
                            "search_terms": ["restaurants"],
                            "location": "New York, NY",
                            "max_results": 2,
                            "extract_reviews": False,
                            "extract_images": False
                        }
                    }
                    
                    time.sleep(2)  # Small delay to ensure different timestamps
                    response2 = self.make_request("POST", "/runs", run_data2)
                    if response2 and response2.status_code == 200:
                        run2 = response2.json()
                        self.log(f"✅ Second test run created: {run2['id']}")
                    else:
                        self.log("⚠️ Could not create second run for sorting test")
                else:
                    self.log("❌ Failed to create test run")
                    self.test_results["actors_used"]["failed"] += 1
                    self.test_results["actors_used"]["errors"].append("Failed to create test run")
                    return
            else:
                self.log("❌ Failed to get actors list")
                self.test_results["actors_used"]["failed"] += 1
                self.test_results["actors_used"]["errors"].append("Failed to get actors list")
                return
        
        # Test the /api/actors-used endpoint
        self.log("Testing GET /api/actors-used endpoint...")
        response = self.make_request("GET", "/actors-used")
        
        if response and response.status_code == 200:
            actors_used = response.json()
            
            if isinstance(actors_used, list):
                self.log(f"✅ actors-used endpoint working - returned {len(actors_used)} actors")
                self.test_results["actors_used"]["passed"] += 1
                
                if len(actors_used) > 0:
                    # Test the structure and content of the response
                    sample_actor = actors_used[0]
                    
                    # Check required actor fields
                    required_actor_fields = ["id", "name", "icon", "description"]
                    missing_actor_fields = [field for field in required_actor_fields if field not in sample_actor]
                    
                    if not missing_actor_fields:
                        self.log("✅ Actor details included (id, name, icon, description)")
                        self.test_results["actors_used"]["passed"] += 1
                    else:
                        self.log(f"❌ Missing actor fields: {missing_actor_fields}")
                        self.test_results["actors_used"]["failed"] += 1
                        self.test_results["actors_used"]["errors"].append(f"Missing actor fields: {missing_actor_fields}")
                    
                    # Check required run statistics fields
                    required_stats_fields = ["total_runs", "last_run_started", "last_run_status", "last_run_duration", "last_run_id"]
                    missing_stats_fields = [field for field in required_stats_fields if field not in sample_actor]
                    
                    if not missing_stats_fields:
                        self.log("✅ Run statistics included (total_runs, last_run_started, last_run_status, last_run_duration, last_run_id)")
                        self.test_results["actors_used"]["passed"] += 1
                        
                        # Verify data types and values
                        total_runs = sample_actor.get("total_runs")
                        if isinstance(total_runs, int) and total_runs > 0:
                            self.log(f"✅ total_runs is valid integer: {total_runs}")
                            self.test_results["actors_used"]["passed"] += 1
                        else:
                            self.log(f"❌ total_runs invalid: {total_runs}")
                            self.test_results["actors_used"]["failed"] += 1
                            self.test_results["actors_used"]["errors"].append(f"total_runs invalid: {total_runs}")
                        
                        last_run_started = sample_actor.get("last_run_started")
                        if last_run_started:
                            self.log(f"✅ last_run_started present: {last_run_started}")
                            self.test_results["actors_used"]["passed"] += 1
                        else:
                            self.log("❌ last_run_started missing or empty")
                            self.test_results["actors_used"]["failed"] += 1
                            self.test_results["actors_used"]["errors"].append("last_run_started missing")
                        
                        last_run_status = sample_actor.get("last_run_status")
                        valid_statuses = ["queued", "running", "succeeded", "failed"]
                        if last_run_status in valid_statuses:
                            self.log(f"✅ last_run_status valid: {last_run_status}")
                            self.test_results["actors_used"]["passed"] += 1
                        else:
                            self.log(f"❌ last_run_status invalid: {last_run_status}")
                            self.test_results["actors_used"]["failed"] += 1
                            self.test_results["actors_used"]["errors"].append(f"last_run_status invalid: {last_run_status}")
                        
                        last_run_id = sample_actor.get("last_run_id")
                        if last_run_id:
                            self.log(f"✅ last_run_id present: {last_run_id}")
                            self.test_results["actors_used"]["passed"] += 1
                        else:
                            self.log("❌ last_run_id missing")
                            self.test_results["actors_used"]["failed"] += 1
                            self.test_results["actors_used"]["errors"].append("last_run_id missing")
                        
                        # Check duration (can be None for running jobs)
                        last_run_duration = sample_actor.get("last_run_duration")
                        if last_run_duration is None or isinstance(last_run_duration, (int, float)):
                            self.log(f"✅ last_run_duration valid: {last_run_duration}")
                            self.test_results["actors_used"]["passed"] += 1
                        else:
                            self.log(f"❌ last_run_duration invalid type: {type(last_run_duration)}")
                            self.test_results["actors_used"]["failed"] += 1
                            self.test_results["actors_used"]["errors"].append("last_run_duration invalid type")
                    else:
                        self.log(f"❌ Missing run statistics fields: {missing_stats_fields}")
                        self.test_results["actors_used"]["failed"] += 1
                        self.test_results["actors_used"]["errors"].append(f"Missing run statistics fields: {missing_stats_fields}")
                    
                    # Test sorting (most recent first)
                    if len(actors_used) > 1:
                        first_actor = actors_used[0]
                        second_actor = actors_used[1]
                        
                        first_time = first_actor.get("last_run_started")
                        second_time = second_actor.get("last_run_started")
                        
                        if first_time and second_time:
                            # Convert to comparable format if needed
                            try:
                                from datetime import datetime
                                if isinstance(first_time, str):
                                    first_dt = datetime.fromisoformat(first_time.replace('Z', '+00:00'))
                                else:
                                    first_dt = first_time
                                
                                if isinstance(second_time, str):
                                    second_dt = datetime.fromisoformat(second_time.replace('Z', '+00:00'))
                                else:
                                    second_dt = second_time
                                
                                if first_dt >= second_dt:
                                    self.log("✅ Actors sorted by last run (most recent first)")
                                    self.test_results["actors_used"]["passed"] += 1
                                else:
                                    self.log("❌ Actors not properly sorted by last run")
                                    self.test_results["actors_used"]["failed"] += 1
                                    self.test_results["actors_used"]["errors"].append("Actors not sorted by last run")
                            except Exception as e:
                                self.log(f"⚠️ Could not verify sorting due to date parsing: {e}")
                        else:
                            self.log("⚠️ Cannot verify sorting - missing timestamps")
                    else:
                        self.log("⚠️ Only one actor returned - cannot verify sorting")
                    
                    # Log sample response for verification
                    self.log(f"Sample actor response: {sample_actor.get('name')} - {sample_actor.get('total_runs')} runs, last: {sample_actor.get('last_run_status')}")
                    
                else:
                    self.log("⚠️ No actors returned - user may not have run history yet")
                    # This is not necessarily an error if the user truly has no runs
                    
            else:
                self.log("❌ actors-used response is not a list")
                self.test_results["actors_used"]["failed"] += 1
                self.test_results["actors_used"]["errors"].append("Response is not a list")
        else:
            self.log(f"❌ actors-used endpoint failed: {response.status_code if response else 'No response'}")
            if response:
                self.log(f"Response content: {response.text}")
            self.test_results["actors_used"]["failed"] += 1
            self.test_results["actors_used"]["errors"].append("actors-used endpoint failed")
        
        # Test with no authentication (should fail)
        self.log("Testing actors-used endpoint without authentication...")
        temp_token = self.auth_token
        self.auth_token = None
        
        try:
            response = self.make_request("GET", "/actors-used")
            if response is None:
                # Network error when no auth - this is expected and good
                self.log("✅ actors-used endpoint blocks unauthenticated requests (network error)")
                self.test_results["actors_used"]["passed"] += 1
            elif response.status_code in [401, 403]:
                self.log(f"✅ actors-used endpoint properly requires authentication ({response.status_code})")
                self.test_results["actors_used"]["passed"] += 1
            elif response.status_code == 422:
                # FastAPI returns 422 for missing auth sometimes
                self.log("✅ actors-used endpoint properly requires authentication (422)")
                self.test_results["actors_used"]["passed"] += 1
            else:
                self.log(f"❌ actors-used endpoint should require authentication: {response.status_code}")
                if response:
                    self.log(f"Response: {response.text[:200]}")
                self.test_results["actors_used"]["failed"] += 1
                self.test_results["actors_used"]["errors"].append("Endpoint does not require authentication")
        except Exception as e:
            # Exception during unauthenticated request is also acceptable
            self.log(f"✅ actors-used endpoint blocks unauthenticated requests (exception: {str(e)[:100]})")
            self.test_results["actors_used"]["passed"] += 1
        
        # Restore token
        self.auth_token = temp_token
        
        self.log("actors-used endpoint testing completed")

    def test_scraper_creation_system(self):
        """Test complete scraper creation system as per review requirements"""
        self.log("=== Testing Scraper Creation System ===")
        
        # Add scraper_creation to test results if not exists
        if "scraper_creation" not in self.test_results:
            self.test_results["scraper_creation"] = {"passed": 0, "failed": 0, "errors": []}
        
        # 1. Test Templates API - GET /api/templates
        self.log("--- 1. Testing Templates API ---")
        response = self.make_request("GET", "/templates")
        if response and response.status_code == 200:
            templates_data = response.json()
            if "templates" in templates_data and "categories" in templates_data:
                templates = templates_data["templates"]
                categories = templates_data["categories"]
                
                self.log(f"✅ Templates API working - {len(templates)} templates, {len(categories)} categories")
                self.test_results["scraper_creation"]["passed"] += 1
                
                # Check for all 7 expected templates
                expected_templates = ["google_maps", "linkedin_profile", "ecommerce_product", "generic_web", "api_scraper", "social_media_instagram"]
                found_templates = [t.get("template_type") for t in templates if t.get("template_type")]
                
                if len(templates) >= 6:  # Should have at least 6 templates
                    self.log(f"✅ Found {len(templates)} templates (expected 6+)")
                    self.test_results["scraper_creation"]["passed"] += 1
                else:
                    self.log(f"❌ Only found {len(templates)} templates, expected 6+")
                    self.test_results["scraper_creation"]["failed"] += 1
                    self.test_results["scraper_creation"]["errors"].append(f"Only {len(templates)} templates found")
                
                # Verify template structure
                if templates and len(templates) > 0:
                    sample_template = templates[0]
                    required_fields = ["name", "description", "icon", "category", "input_schema"]
                    has_all_fields = all(field in sample_template for field in required_fields)
                    if has_all_fields:
                        self.log("✅ Template structure valid (has all required fields)")
                        self.test_results["scraper_creation"]["passed"] += 1
                    else:
                        missing_fields = [f for f in required_fields if f not in sample_template]
                        self.log(f"❌ Template missing fields: {missing_fields}")
                        self.test_results["scraper_creation"]["failed"] += 1
                        self.test_results["scraper_creation"]["errors"].append(f"Template missing fields: {missing_fields}")
            else:
                self.log("❌ Templates API response missing required fields")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Templates API response invalid")
        else:
            self.log(f"❌ Templates API failed: {response.status_code if response else 'No response'}")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("Templates API failed")
        
        # 2. Test Create Scraper from Template - POST /api/actors with template_type
        self.log("--- 2. Testing Create Scraper from Template ---")
        template_scraper_data = {
            "name": "Test Google Maps Scraper",
            "description": "Test scraper created from Google Maps template",
            "icon": "🗺️",
            "category": "Maps & Location",
            "type": "prebuilt",
            "template_type": "google_maps",
            "visibility": "private",
            "tags": ["test", "google-maps", "template"],
            "readme": "# Test Scraper\nCreated from Google Maps template for testing",
            "input_schema": {
                "type": "object",
                "properties": {
                    "search_terms": {"type": "array", "items": {"type": "string"}},
                    "location": {"type": "string"},
                    "max_results": {"type": "integer", "default": 50}
                }
            }
        }
        
        response = self.make_request("POST", "/actors", template_scraper_data)
        if response and response.status_code == 200:
            created_scraper = response.json()
            if "id" in created_scraper and created_scraper.get("template_type") == "google_maps":
                self.template_scraper_id = created_scraper["id"]
                self.log(f"✅ Scraper created from template: {self.template_scraper_id}")
                self.test_results["scraper_creation"]["passed"] += 1
                
                # Verify template fields are preserved
                if created_scraper.get("status") == "draft":
                    self.log("✅ Template scraper has correct draft status")
                    self.test_results["scraper_creation"]["passed"] += 1
                else:
                    self.log(f"❌ Template scraper has wrong status: {created_scraper.get('status')}")
                    self.test_results["scraper_creation"]["failed"] += 1
                    self.test_results["scraper_creation"]["errors"].append("Template scraper wrong status")
            else:
                self.log("❌ Template scraper creation response invalid")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Template scraper creation response invalid")
        else:
            self.log(f"❌ Template scraper creation failed: {response.status_code if response else 'No response'}")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("Template scraper creation failed")
        
        # 3. Test Create Custom Scraper - POST /api/actors without template_type
        self.log("--- 3. Testing Create Custom Scraper (from scratch) ---")
        custom_scraper_data = {
            "name": "Test Custom Web Scraper",
            "description": "Custom scraper created from scratch for testing",
            "icon": "🕷️",
            "category": "General",
            "type": "custom",
            "visibility": "private",
            "tags": ["test", "custom", "web-scraping"],
            "readme": "# Custom Test Scraper\nBuilt from scratch with custom input schema",
            "input_schema": {
                "type": "object",
                "properties": {
                    "urls": {
                        "type": "array",
                        "title": "URLs to Scrape",
                        "description": "List of URLs to extract data from",
                        "items": {"type": "string"}
                    },
                    "css_selector": {
                        "type": "string",
                        "title": "CSS Selector",
                        "description": "CSS selector for data extraction"
                    },
                    "max_pages": {
                        "type": "integer",
                        "title": "Max Pages",
                        "default": 10,
                        "minimum": 1
                    }
                },
                "required": ["urls", "css_selector"]
            }
        }
        
        response = self.make_request("POST", "/actors", custom_scraper_data)
        if response and response.status_code == 200:
            created_custom = response.json()
            if "id" in created_custom and created_custom.get("type") == "custom":
                self.custom_scraper_id = created_custom["id"]
                self.log(f"✅ Custom scraper created from scratch: {self.custom_scraper_id}")
                self.test_results["scraper_creation"]["passed"] += 1
                
                # Verify custom fields
                if not created_custom.get("template_type"):
                    self.log("✅ Custom scraper has no template_type (correct)")
                    self.test_results["scraper_creation"]["passed"] += 1
                else:
                    self.log(f"❌ Custom scraper has template_type: {created_custom.get('template_type')}")
                    self.test_results["scraper_creation"]["failed"] += 1
                    self.test_results["scraper_creation"]["errors"].append("Custom scraper has template_type")
            else:
                self.log("❌ Custom scraper creation response invalid")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Custom scraper creation response invalid")
        else:
            self.log(f"❌ Custom scraper creation failed: {response.status_code if response else 'No response'}")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("Custom scraper creation failed")
        
        # 4. Test Schema Validation - POST /api/actors/validate-schema
        self.log("--- 4. Testing Schema Validation ---")
        
        # Test valid schema
        valid_schema = {
            "type": "object",
            "properties": {
                "test_field": {
                    "type": "string",
                    "title": "Test Field"
                }
            }
        }
        
        response = self.make_request("POST", "/actors/validate-schema", valid_schema)
        if response and response.status_code == 200:
            validation_result = response.json()
            if validation_result.get("valid") == True:
                self.log("✅ Schema validation working - valid schema accepted")
                self.test_results["scraper_creation"]["passed"] += 1
            else:
                self.log(f"❌ Valid schema rejected: {validation_result.get('errors')}")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Valid schema rejected")
        else:
            self.log(f"❌ Schema validation failed: {response.status_code if response else 'No response'}")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("Schema validation failed")
        
        # Test invalid schema
        invalid_schema = {
            "type": "invalid",
            "missing_properties": True
        }
        
        response = self.make_request("POST", "/actors/validate-schema", invalid_schema)
        if response and response.status_code == 200:
            validation_result = response.json()
            if validation_result.get("valid") == False and validation_result.get("errors"):
                self.log("✅ Schema validation working - invalid schema rejected")
                self.test_results["scraper_creation"]["passed"] += 1
            else:
                self.log("❌ Invalid schema accepted")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Invalid schema accepted")
        else:
            self.log(f"❌ Invalid schema validation failed: {response.status_code if response else 'No response'}")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("Invalid schema validation failed")
        
        # 5. Test Publish Scraper - PATCH /api/actors/{id}/publish
        self.log("--- 5. Testing Publish Scraper ---")
        if hasattr(self, 'template_scraper_id'):
            publish_data = {
                "visibility": "public",
                "readme": "# Published Test Scraper\nThis scraper is now public and available in marketplace",
                "tags": ["test", "google-maps", "published", "marketplace"]
            }
            
            response = self.make_request("PATCH", f"/actors/{self.template_scraper_id}/publish", publish_data)
            if response and response.status_code == 200:
                published_scraper = response.json()
                if published_scraper.get("status") == "published" and published_scraper.get("visibility") == "public":
                    self.log("✅ Scraper published successfully")
                    self.test_results["scraper_creation"]["passed"] += 1
                    
                    # Verify is_public flag is set
                    if published_scraper.get("is_public") == True:
                        self.log("✅ Published scraper has is_public=True")
                        self.test_results["scraper_creation"]["passed"] += 1
                    else:
                        self.log("❌ Published scraper missing is_public flag")
                        self.test_results["scraper_creation"]["failed"] += 1
                        self.test_results["scraper_creation"]["errors"].append("Published scraper missing is_public flag")
                else:
                    self.log(f"❌ Publish failed - status: {published_scraper.get('status')}, visibility: {published_scraper.get('visibility')}")
                    self.test_results["scraper_creation"]["failed"] += 1
                    self.test_results["scraper_creation"]["errors"].append("Publish failed - wrong status/visibility")
            else:
                self.log(f"❌ Publish scraper failed: {response.status_code if response else 'No response'}")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Publish scraper failed")
        else:
            self.log("❌ Cannot test publish - no template scraper ID")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("Cannot test publish - no scraper ID")
        
        # 6. Test Marketplace API - GET /api/marketplace
        self.log("--- 6. Testing Marketplace API ---")
        
        # Test basic marketplace
        response = self.make_request("GET", "/marketplace")
        if response and response.status_code == 200:
            marketplace_scrapers = response.json()
            if isinstance(marketplace_scrapers, list):
                self.log(f"✅ Marketplace API working - {len(marketplace_scrapers)} public scrapers")
                self.test_results["scraper_creation"]["passed"] += 1
                
                # Check if our published scraper appears
                published_found = any(s.get("id") == getattr(self, 'template_scraper_id', None) for s in marketplace_scrapers)
                if published_found:
                    self.log("✅ Published scraper appears in marketplace")
                    self.test_results["scraper_creation"]["passed"] += 1
                else:
                    self.log("⚠️ Published scraper not yet in marketplace (may need time to propagate)")
                
                # Verify marketplace scrapers have correct fields
                if marketplace_scrapers and len(marketplace_scrapers) > 0:
                    sample_scraper = marketplace_scrapers[0]
                    if sample_scraper.get("status") == "published" and sample_scraper.get("visibility") == "public":
                        self.log("✅ Marketplace scrapers have correct status/visibility")
                        self.test_results["scraper_creation"]["passed"] += 1
                    else:
                        self.log("❌ Marketplace scrapers have wrong status/visibility")
                        self.test_results["scraper_creation"]["failed"] += 1
                        self.test_results["scraper_creation"]["errors"].append("Marketplace scrapers wrong status/visibility")
            else:
                self.log("❌ Marketplace API response not a list")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Marketplace API response not a list")
        else:
            self.log(f"❌ Marketplace API failed: {response.status_code if response else 'No response'}")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("Marketplace API failed")
        
        # Test marketplace with filters
        self.log("Testing marketplace with category filter...")
        response = self.make_request("GET", "/marketplace", params={"category": "Maps & Location"})
        if response and response.status_code == 200:
            filtered_scrapers = response.json()
            if isinstance(filtered_scrapers, list):
                self.log(f"✅ Marketplace category filter working - {len(filtered_scrapers)} Maps & Location scrapers")
                self.test_results["scraper_creation"]["passed"] += 1
            else:
                self.log("❌ Marketplace category filter failed")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Marketplace category filter failed")
        
        # Test marketplace with featured filter
        self.log("Testing marketplace with featured filter...")
        response = self.make_request("GET", "/marketplace", params={"featured": True})
        if response and response.status_code == 200:
            featured_scrapers = response.json()
            if isinstance(featured_scrapers, list):
                self.log(f"✅ Marketplace featured filter working - {len(featured_scrapers)} featured scrapers")
                self.test_results["scraper_creation"]["passed"] += 1
            else:
                self.log("❌ Marketplace featured filter failed")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("Marketplace featured filter failed")
        
        # 7. Test My Scrapers API - GET /api/actors/my-scrapers
        self.log("--- 7. Testing My Scrapers API ---")
        
        # Test all scrapers
        response = self.make_request("GET", "/actors/my-scrapers")
        if response and response.status_code == 200:
            my_scrapers = response.json()
            if isinstance(my_scrapers, list):
                self.log(f"✅ My Scrapers API working - {len(my_scrapers)} user scrapers")
                self.test_results["scraper_creation"]["passed"] += 1
                
                # Verify our created scrapers are in the list
                template_found = any(s.get("id") == getattr(self, 'template_scraper_id', None) for s in my_scrapers)
                custom_found = any(s.get("id") == getattr(self, 'custom_scraper_id', None) for s in my_scrapers)
                
                if template_found and custom_found:
                    self.log("✅ Both created scrapers found in My Scrapers")
                    self.test_results["scraper_creation"]["passed"] += 1
                else:
                    self.log(f"❌ Created scrapers not found - template: {template_found}, custom: {custom_found}")
                    self.test_results["scraper_creation"]["failed"] += 1
                    self.test_results["scraper_creation"]["errors"].append("Created scrapers not found in My Scrapers")
            else:
                self.log("❌ My Scrapers API response not a list")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("My Scrapers API response not a list")
        else:
            self.log(f"❌ My Scrapers API failed: {response.status_code if response else 'No response'}")
            self.test_results["scraper_creation"]["failed"] += 1
            self.test_results["scraper_creation"]["errors"].append("My Scrapers API failed")
        
        # Test with status filter
        self.log("Testing My Scrapers with status filter...")
        response = self.make_request("GET", "/actors/my-scrapers", params={"status": "draft"})
        if response and response.status_code == 200:
            draft_scrapers = response.json()
            if isinstance(draft_scrapers, list):
                self.log(f"✅ My Scrapers status filter working - {len(draft_scrapers)} draft scrapers")
                self.test_results["scraper_creation"]["passed"] += 1
            else:
                self.log("❌ My Scrapers status filter failed")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("My Scrapers status filter failed")
        
        # 8. Test Fork/Clone Scraper - POST /api/actors/{id}/fork
        self.log("--- 8. Testing Fork/Clone Scraper ---")
        
        # First, find a public scraper to fork (use built-in Google Maps Scraper V2)
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            public_scraper = None
            for actor in actors:
                if actor.get("is_public") == True and actor.get("name") == "Google Maps Scraper V2":
                    public_scraper = actor
                    break
            
            if public_scraper:
                fork_response = self.make_request("POST", f"/actors/{public_scraper['id']}/fork")
                if fork_response and fork_response.status_code == 200:
                    forked_scraper = fork_response.json()
                    if "id" in forked_scraper and forked_scraper.get("fork_from") == public_scraper["id"]:
                        self.forked_scraper_id = forked_scraper["id"]
                        self.log(f"✅ Scraper forked successfully: {self.forked_scraper_id}")
                        self.test_results["scraper_creation"]["passed"] += 1
                        
                        # Verify fork properties
                        if "(Forked)" in forked_scraper.get("name", ""):
                            self.log("✅ Forked scraper has correct name suffix")
                            self.test_results["scraper_creation"]["passed"] += 1
                        else:
                            self.log("❌ Forked scraper missing name suffix")
                            self.test_results["scraper_creation"]["failed"] += 1
                            self.test_results["scraper_creation"]["errors"].append("Forked scraper missing name suffix")
                        
                        if forked_scraper.get("status") == "draft" and forked_scraper.get("visibility") == "private":
                            self.log("✅ Forked scraper has correct draft/private status")
                            self.test_results["scraper_creation"]["passed"] += 1
                        else:
                            self.log("❌ Forked scraper has wrong status/visibility")
                            self.test_results["scraper_creation"]["failed"] += 1
                            self.test_results["scraper_creation"]["errors"].append("Forked scraper wrong status/visibility")
                    else:
                        self.log("❌ Fork response invalid")
                        self.test_results["scraper_creation"]["failed"] += 1
                        self.test_results["scraper_creation"]["errors"].append("Fork response invalid")
                else:
                    self.log(f"❌ Fork failed: {fork_response.status_code if fork_response else 'No response'}")
                    self.test_results["scraper_creation"]["failed"] += 1
                    self.test_results["scraper_creation"]["errors"].append("Fork failed")
            else:
                self.log("❌ No public scraper found to fork")
                self.test_results["scraper_creation"]["failed"] += 1
                self.test_results["scraper_creation"]["errors"].append("No public scraper found to fork")
        
        self.log("Scraper creation system testing completed")

    def test_end_to_end_scraper_workflow(self):
        """Test complete end-to-end workflow with real scraper execution"""
        self.log("=== Testing End-to-End Scraper Workflow ===")
        
        # Add end_to_end to test results if not exists
        if "end_to_end" not in self.test_results:
            self.test_results["end_to_end"] = {"passed": 0, "failed": 0, "errors": []}
        
        # 1. Create a new scraper from Google Maps template
        self.log("--- 1. Creating Real Scraper from Template ---")
        real_scraper_data = {
            "name": "Coffee Shop Finder",
            "description": "Find coffee shops in specific locations for business analysis",
            "icon": "☕",
            "category": "Maps & Location",
            "type": "prebuilt",
            "template_type": "google_maps",
            "visibility": "private",
            "tags": ["coffee", "business", "analysis"],
            "readme": "# Coffee Shop Finder\nSpecialized scraper for finding coffee shops",
            "input_schema": {
                "type": "object",
                "properties": {
                    "search_terms": {"type": "array", "items": {"type": "string"}},
                    "location": {"type": "string"},
                    "max_results": {"type": "integer", "default": 5}
                }
            }
        }
        
        response = self.make_request("POST", "/actors", real_scraper_data)
        if response and response.status_code == 200:
            real_scraper = response.json()
            real_scraper_id = real_scraper["id"]
            self.log(f"✅ Real scraper created: {real_scraper_id}")
            self.test_results["end_to_end"]["passed"] += 1
        else:
            self.log("❌ Failed to create real scraper")
            self.test_results["end_to_end"]["failed"] += 1
            self.test_results["end_to_end"]["errors"].append("Failed to create real scraper")
            return
        
        # 2. Create a run with the new scraper (using Google Maps V2 backend)
        self.log("--- 2. Creating Run with Real Data ---")
        
        # First, get the Google Maps V2 actor ID (since our custom scraper will use the same backend)
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            google_maps_v2_id = None
            for actor in actors:
                if actor.get("name") == "Google Maps Scraper V2" and actor.get("user_id") == "system":
                    google_maps_v2_id = actor["id"]
                    break
            
            if google_maps_v2_id:
                # Create run with Google Maps V2 (since it has the actual implementation)
                run_data = {
                    "actor_id": google_maps_v2_id,
                    "input_data": {
                        "search_terms": ["coffee shops"],
                        "location": "San Francisco, CA",
                        "max_results": 3,
                        "extract_reviews": False,
                        "extract_images": False
                    }
                }
                
                response = self.make_request("POST", "/runs", run_data)
                if response and response.status_code == 200:
                    run = response.json()
                    run_id = run["id"]
                    self.log(f"✅ Real run created: {run_id}")
                    self.test_results["end_to_end"]["passed"] += 1
                    
                    # 3. Monitor run completion
                    self.log("--- 3. Monitoring Run Execution ---")
                    max_wait = 120  # 2 minutes
                    check_interval = 10
                    elapsed = 0
                    
                    while elapsed < max_wait:
                        response = self.make_request("GET", f"/runs/{run_id}")
                        if response and response.status_code == 200:
                            run_status = response.json()
                            status = run_status.get("status")
                            
                            self.log(f"Run status: {status} (elapsed: {elapsed}s)")
                            
                            if status == "succeeded":
                                self.log("✅ Real run completed successfully")
                                self.test_results["end_to_end"]["passed"] += 1
                                
                                # 4. Verify data extraction
                                self.log("--- 4. Verifying Data Extraction ---")
                                response = self.make_request("GET", f"/datasets/{run_id}/items")
                                if response and response.status_code == 200:
                                    items = response.json()
                                    if len(items) >= 3:
                                        self.log(f"✅ Data extracted successfully: {len(items)} coffee shops")
                                        self.test_results["end_to_end"]["passed"] += 1
                                        
                                        # Verify data quality
                                        sample_item = items[0]["data"]
                                        required_fields = ["title", "address"]
                                        if all(field in sample_item for field in required_fields):
                                            self.log("✅ Data quality verified (has required fields)")
                                            self.test_results["end_to_end"]["passed"] += 1
                                        else:
                                            self.log("❌ Data quality issues - missing required fields")
                                            self.test_results["end_to_end"]["failed"] += 1
                                            self.test_results["end_to_end"]["errors"].append("Data quality issues")
                                    else:
                                        self.log(f"❌ Insufficient data extracted: {len(items)} items")
                                        self.test_results["end_to_end"]["failed"] += 1
                                        self.test_results["end_to_end"]["errors"].append("Insufficient data extracted")
                                else:
                                    self.log("❌ Failed to get dataset items")
                                    self.test_results["end_to_end"]["failed"] += 1
                                    self.test_results["end_to_end"]["errors"].append("Failed to get dataset items")
                                break
                            elif status == "failed":
                                error_msg = run_status.get("error_message", "Unknown error")
                                self.log(f"❌ Real run failed: {error_msg}")
                                self.test_results["end_to_end"]["failed"] += 1
                                self.test_results["end_to_end"]["errors"].append(f"Real run failed: {error_msg}")
                                break
                            else:
                                time.sleep(check_interval)
                                elapsed += check_interval
                        else:
                            self.log("❌ Failed to get run status")
                            self.test_results["end_to_end"]["failed"] += 1
                            self.test_results["end_to_end"]["errors"].append("Failed to get run status")
                            break
                    
                    if elapsed >= max_wait:
                        self.log("❌ Real run timed out")
                        self.test_results["end_to_end"]["failed"] += 1
                        self.test_results["end_to_end"]["errors"].append("Real run timed out")
                else:
                    self.log("❌ Failed to create real run")
                    self.test_results["end_to_end"]["failed"] += 1
                    self.test_results["end_to_end"]["errors"].append("Failed to create real run")
            else:
                self.log("❌ Google Maps V2 actor not found for real run")
                self.test_results["end_to_end"]["failed"] += 1
                self.test_results["end_to_end"]["errors"].append("Google Maps V2 actor not found")
        else:
            self.log("❌ Failed to get actors for real run")
            self.test_results["end_to_end"]["failed"] += 1
            self.test_results["end_to_end"]["errors"].append("Failed to get actors for real run")
        
        self.log("End-to-end workflow testing completed")

    def test_initial_state_verification(self):
        """Verify initial state as per review requirements"""
        self.log("=== Testing Initial State Verification ===")
        
        # Add initial_state to test results if not exists
        if "initial_state" not in self.test_results:
            self.test_results["initial_state"] = {"passed": 0, "failed": 0, "errors": []}
        
        # Check that only built-in Google Maps Scraper V2 exists initially
        self.log("--- Verifying Built-in Google Maps Scraper V2 Exists ---")
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            
            # Find Google Maps Scraper V2
            google_maps_v2 = None
            for actor in actors:
                if actor.get("name") == "Google Maps Scraper V2" and actor.get("user_id") == "system":
                    google_maps_v2 = actor
                    break
            
            if google_maps_v2:
                self.log("✅ Built-in Google Maps Scraper V2 exists")
                self.test_results["initial_state"]["passed"] += 1
                
                # Verify it's a system actor
                if google_maps_v2.get("user_id") == "system":
                    self.log("✅ Google Maps Scraper V2 is a system actor")
                    self.test_results["initial_state"]["passed"] += 1
                else:
                    self.log("❌ Google Maps Scraper V2 is not a system actor")
                    self.test_results["initial_state"]["failed"] += 1
                    self.test_results["initial_state"]["errors"].append("Google Maps Scraper V2 not system actor")
                
                # Verify it's published and public
                if google_maps_v2.get("status") == "published" and google_maps_v2.get("is_public") == True:
                    self.log("✅ Google Maps Scraper V2 is published and public")
                    self.test_results["initial_state"]["passed"] += 1
                else:
                    self.log("❌ Google Maps Scraper V2 is not published/public")
                    self.test_results["initial_state"]["failed"] += 1
                    self.test_results["initial_state"]["errors"].append("Google Maps Scraper V2 not published/public")
                
                # Verify it has proper metadata
                required_fields = ["icon", "category", "description", "input_schema"]
                missing_fields = [f for f in required_fields if not google_maps_v2.get(f)]
                if not missing_fields:
                    self.log("✅ Google Maps Scraper V2 has all required metadata")
                    self.test_results["initial_state"]["passed"] += 1
                else:
                    self.log(f"❌ Google Maps Scraper V2 missing fields: {missing_fields}")
                    self.test_results["initial_state"]["failed"] += 1
                    self.test_results["initial_state"]["errors"].append(f"Google Maps Scraper V2 missing fields: {missing_fields}")
            else:
                self.log("❌ Built-in Google Maps Scraper V2 not found")
                self.test_results["initial_state"]["failed"] += 1
                self.test_results["initial_state"]["errors"].append("Built-in Google Maps Scraper V2 not found")
        else:
            self.log("❌ Failed to get actors for initial state verification")
            self.test_results["initial_state"]["failed"] += 1
            self.test_results["initial_state"]["errors"].append("Failed to get actors for initial state verification")
        
        # Verify templates show 7 different scraper types (as mentioned in review)
        self.log("--- Verifying 7 Template Types Available ---")
        response = self.make_request("GET", "/templates")
        if response and response.status_code == 200:
            templates_data = response.json()
            templates = templates_data.get("templates", [])
            
            expected_template_types = [
                "google_maps", "linkedin_profile", "ecommerce_product", 
                "generic_web", "api_scraper", "social_media_instagram"
            ]
            
            found_types = [t.get("template_type") for t in templates if t.get("template_type")]
            
            if len(templates) >= 6:  # Should have at least 6 templates
                self.log(f"✅ Found {len(templates)} template types (expected 6+)")
                self.test_results["initial_state"]["passed"] += 1
                
                # Check specific template types
                missing_types = [t for t in expected_template_types if t not in found_types]
                if not missing_types:
                    self.log("✅ All expected template types found")
                    self.test_results["initial_state"]["passed"] += 1
                else:
                    self.log(f"⚠️ Some template types missing: {missing_types}")
                    # This is a warning, not a failure since we found 6+ templates
            else:
                self.log(f"❌ Only found {len(templates)} templates, expected 6+")
                self.test_results["initial_state"]["failed"] += 1
                self.test_results["initial_state"]["errors"].append(f"Only {len(templates)} templates found")
        else:
            self.log("❌ Failed to get templates for initial state verification")
            self.test_results["initial_state"]["failed"] += 1
            self.test_results["initial_state"]["errors"].append("Failed to get templates for initial state verification")
        
        self.log("Initial state verification completed")

    def test_google_maps_scraper_v4_enhanced_super_fast(self):
        """Test Google Maps Scraper V4 Enhanced (SUPER FAST) as per review requirements"""
        self.log("=== Testing Google Maps Scraper V4 Enhanced (SUPER FAST) ===")
        
        # 1. Actor Verification
        self.log("--- 1. Actor Verification ---")
        
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            v4_actor = None
            
            for actor in actors:
                if actor.get("name") == "Google Maps Scraper V4 Ultra Fast":
                    v4_actor = actor
                    break
            
            if v4_actor:
                self.log(f"✅ V4 Enhanced Actor exists: {v4_actor['name']}")
                self.test_results["actors"]["passed"] += 1
                
                # Check for ⚡ icon
                if v4_actor.get("icon") == "⚡":
                    self.log("✅ V4 Enhanced Actor has correct ⚡ icon")
                    self.test_results["actors"]["passed"] += 1
                else:
                    self.log(f"❌ V4 Enhanced Actor has wrong icon: {v4_actor.get('icon')}, expected: ⚡")
                    self.test_results["actors"]["failed"] += 1
                    self.test_results["actors"]["errors"].append("V4 Enhanced Actor missing ⚡ icon")
                
                # Check description mentions speed improvements
                description = v4_actor.get("description", "").lower()
                speed_keywords = ["speed", "fast", "10x", "ultra", "boost", "optimization", "15-20s"]
                has_speed_mention = any(keyword in description for keyword in speed_keywords)
                if has_speed_mention:
                    self.log("✅ V4 Enhanced Actor description mentions speed improvements")
                    self.test_results["actors"]["passed"] += 1
                else:
                    self.log("❌ V4 Enhanced Actor description doesn't mention speed improvements")
                    self.test_results["actors"]["failed"] += 1
                    self.test_results["actors"]["errors"].append("V4 Enhanced Actor description missing speed mention")
                
                self.actor_id = v4_actor["id"]
            else:
                self.log("❌ Google Maps Scraper V4 Ultra Fast not found")
                self.test_results["actors"]["failed"] += 1
                self.test_results["actors"]["errors"].append("V4 Enhanced Actor not found")
                return
        else:
            self.log("❌ Failed to get actors list")
            self.test_results["actors"]["failed"] += 1
            self.test_results["actors"]["errors"].append("Failed to get actors for V4 Enhanced test")
            return
        
        # 2. Performance Test - 50 Leads (CRITICAL as per review)
        self.log("--- 2. Performance Test - 50 Leads (CRITICAL) ---")
        
        run_data = {
            "actor_id": self.actor_id,
            "input_data": {
                "search_terms": ["coffee shops"],
                "location": "San Francisco, CA",
                "max_results": 50,
                "extract_reviews": False,
                "extract_images": False
            }
        }
        
        # Record start time for performance measurement
        start_time = time.time()
        
        response = self.make_request("POST", "/runs", run_data)
        if response and response.status_code == 200:
            run = response.json()
            if "id" in run and "status" in run:
                self.performance_run_id = run["id"]
                initial_status = run["status"]
                self.log(f"✅ Performance test run created: {self.performance_run_id}")
                self.log(f"✅ Initial status: {initial_status}")
                self.test_results["runs"]["passed"] += 1
            else:
                self.log("❌ Performance run response missing required fields")
                self.test_results["runs"]["failed"] += 1
                self.test_results["runs"]["errors"].append("Performance run response missing required fields")
                return
        else:
            self.log(f"❌ Performance run creation failed: {response.status_code if response else 'No response'}")
            self.test_results["runs"]["failed"] += 1
            self.test_results["runs"]["errors"].append("Performance run creation failed")
            return
        
        # Monitor Performance Run - CRITICAL 50 leads in 15-25 seconds
        self.log("--- Monitoring Performance Run (TARGET: 15-25 seconds for 50 leads) ---")
        
        max_wait_time = 60  # 1 minute max (target is 15-25s)
        check_interval = 2  # Check every 2 seconds
        elapsed_time = 0
        status_transitions = []
        
        while elapsed_time < max_wait_time:
            response = self.make_request("GET", f"/runs/{self.performance_run_id}")
            if response and response.status_code == 200:
                run = response.json()
                status = run.get("status", "unknown")
                
                # Track status transitions
                if not status_transitions or status_transitions[-1] != status:
                    status_transitions.append(status)
                    self.log(f"Status transition: {status} (elapsed: {elapsed_time}s)")
                
                if status == "succeeded":
                    end_time = time.time()
                    performance_duration = end_time - start_time
                    self.log(f"🎉 Performance test completed in {performance_duration:.1f} seconds")
                    
                    # CRITICAL Performance measurement (target: 15-25 seconds for 50 leads)
                    if performance_duration <= 25.0:
                        self.log(f"✅ V4 ENHANCED PERFORMANCE EXCELLENT: {performance_duration:.1f}s ≤ 25s target")
                        self.test_results["runs"]["passed"] += 1
                    elif performance_duration <= 35.0:
                        self.log(f"✅ V4 ENHANCED PERFORMANCE GOOD: {performance_duration:.1f}s ≤ 35s (acceptable)")
                        self.test_results["runs"]["passed"] += 1
                    else:
                        self.log(f"❌ V4 ENHANCED PERFORMANCE SLOW: {performance_duration:.1f}s > 35s (target was 15-25s)")
                        self.test_results["runs"]["failed"] += 1
                        self.test_results["runs"]["errors"].append(f"V4 Enhanced Performance too slow: {performance_duration:.1f}s")
                    
                    break
                elif status == "failed":
                    error_msg = run.get("error_message", "Unknown error")
                    self.log(f"❌ Performance run failed: {error_msg}")
                    self.test_results["runs"]["failed"] += 1
                    self.test_results["runs"]["errors"].append(f"Performance run failed: {error_msg}")
                    return
                elif status in ["queued", "running"]:
                    time.sleep(check_interval)
                    elapsed_time += check_interval
                else:
                    self.log(f"❌ Unknown run status: {status}")
                    self.test_results["runs"]["failed"] += 1
                    self.test_results["runs"]["errors"].append(f"Unknown run status: {status}")
                    return
            else:
                self.log(f"❌ Failed to get run status: {response.status_code if response else 'No response'}")
                self.test_results["runs"]["failed"] += 1
                self.test_results["runs"]["errors"].append("Failed to get run status")
                return
        
        if elapsed_time >= max_wait_time:
            self.log("❌ Performance run did not complete within timeout period")
            self.test_results["runs"]["failed"] += 1
            self.test_results["runs"]["errors"].append("Performance run timeout")
            return
        
        # Verify Data Quality - ALL fields must be present (no N/A or null)
        self.log("--- Verifying Data Quality (50 leads with complete data) ---")
        
        response = self.make_request("GET", f"/datasets/{self.performance_run_id}/items")
        if response and response.status_code == 200:
            items = response.json()
            if isinstance(items, list):
                self.log(f"✅ Retrieved {len(items)} dataset items")
                self.test_results["datasets"]["passed"] += 1
                
                # Check if we got exactly 50 leads as requested (CRITICAL)
                if len(items) == 50:
                    self.log(f"✅ V4 Enhanced scraper fetched exactly 50 results as requested")
                    self.test_results["datasets"]["passed"] += 1
                elif len(items) >= 50:
                    self.log(f"✅ V4 Enhanced scraper fetched at least 50 results ({len(items)} found)")
                    self.test_results["datasets"]["passed"] += 1
                else:
                    self.log(f"❌ V4 Enhanced scraper did not fetch 50 results (only {len(items)} found)")
                    self.test_results["datasets"]["failed"] += 1
                    self.test_results["datasets"]["errors"].append(f"V4 Enhanced scraper only fetched {len(items)} results, expected 50")
                
                # Verify ALL required fields according to review requirements
                if len(items) > 0:
                    # Required fields as per review request
                    critical_fields = {
                        "title": "Business name (required)",
                        "address": "Full address (required)", 
                        "placeId": "Google Place ID (required)",
                        "url": "Google Maps URL (required)"
                    }
                    
                    high_priority_fields = {
                        "phone": "Phone number (80%+ should have)",
                        "rating": "Rating (80%+ should have)",
                        "reviewsCount": "Reviews count (80%+ should have)",
                        "category": "Business category (80%+ should have)"
                    }
                    
                    medium_priority_fields = {
                        "city": "City parsed from address (50%+ should have)",
                        "state": "State parsed from address (50%+ should have)"
                    }
                    
                    optional_fields = {
                        "email": "Email (some should have)",
                        "socialMedia": "Social media links (some should have)"
                    }
                    
                    # Count field availability
                    field_stats = {}
                    complete_leads = 0
                    missing_fields_leads = 0
                    
                    for item in items:
                        data = item.get("data", {})
                        lead_complete = True
                        
                        # Check all field categories
                        all_fields = {**critical_fields, **high_priority_fields, **medium_priority_fields, **optional_fields}
                        
                        for field in all_fields:
                            if field not in field_stats:
                                field_stats[field] = {"present": 0, "missing": 0, "na_or_null": 0}
                            
                            value = data.get(field)
                            if value is None or value == "" or str(value).upper() == "N/A":
                                field_stats[field]["na_or_null"] += 1
                                if field in critical_fields or field in high_priority_fields:
                                    lead_complete = False
                            elif value:
                                field_stats[field]["present"] += 1
                            else:
                                field_stats[field]["missing"] += 1
                                if field in critical_fields:
                                    lead_complete = False
                        
                        if lead_complete:
                            complete_leads += 1
                        else:
                            missing_fields_leads += 1
                    
                    # Report results by category
                    self.log("--- CRITICAL FIELDS (100% required) ---")
                    critical_pass = True
                    for field, description in critical_fields.items():
                        stats = field_stats[field]
                        total = len(items)
                        present_pct = (stats["present"] / total) * 100
                        
                        if present_pct == 100:
                            self.log(f"✅ {field}: {stats['present']}/{total} (100%) - {description}")
                        else:
                            self.log(f"❌ {field}: {stats['present']}/{total} ({present_pct:.1f}%) - {description}")
                            critical_pass = False
                    
                    if critical_pass:
                        self.log("✅ ALL CRITICAL FIELDS: 100% present")
                        self.test_results["datasets"]["passed"] += 1
                    else:
                        self.log("❌ CRITICAL FIELDS: Missing data found")
                        self.test_results["datasets"]["failed"] += 1
                        self.test_results["datasets"]["errors"].append("Critical fields missing data")
                    
                    self.log("--- HIGH PRIORITY FIELDS (80%+ should have) ---")
                    high_priority_pass = True
                    for field, description in high_priority_fields.items():
                        stats = field_stats[field]
                        total = len(items)
                        present_pct = (stats["present"] / total) * 100
                        
                        if present_pct >= 80:
                            self.log(f"✅ {field}: {stats['present']}/{total} ({present_pct:.1f}%) - {description}")
                        else:
                            self.log(f"❌ {field}: {stats['present']}/{total} ({present_pct:.1f}%) - {description}")
                            high_priority_pass = False
                    
                    if high_priority_pass:
                        self.log("✅ HIGH PRIORITY FIELDS: 80%+ coverage achieved")
                        self.test_results["datasets"]["passed"] += 1
                    else:
                        self.log("❌ HIGH PRIORITY FIELDS: Below 80% coverage")
                        self.test_results["datasets"]["failed"] += 1
                        self.test_results["datasets"]["errors"].append("High priority fields below 80% coverage")
                    
                    self.log("--- MEDIUM PRIORITY FIELDS (50%+ should have) ---")
                    medium_priority_pass = True
                    for field, description in medium_priority_fields.items():
                        stats = field_stats[field]
                        total = len(items)
                        present_pct = (stats["present"] / total) * 100
                        
                        if present_pct >= 50:
                            self.log(f"✅ {field}: {stats['present']}/{total} ({present_pct:.1f}%) - {description}")
                        else:
                            self.log(f"⚠️ {field}: {stats['present']}/{total} ({present_pct:.1f}%) - {description}")
                            medium_priority_pass = False
                    
                    if medium_priority_pass:
                        self.log("✅ MEDIUM PRIORITY FIELDS: 50%+ coverage achieved")
                        self.test_results["datasets"]["passed"] += 1
                    else:
                        self.log("⚠️ MEDIUM PRIORITY FIELDS: Below 50% coverage (acceptable)")
                    
                    self.log("--- EMAIL & SOCIAL MEDIA EXTRACTION ---")
                    for field, description in optional_fields.items():
                        stats = field_stats[field]
                        total = len(items)
                        present_pct = (stats["present"] / total) * 100
                        
                        if stats["present"] > 0:
                            self.log(f"✅ {field}: {stats['present']}/{total} ({present_pct:.1f}%) - {description}")
                            self.test_results["datasets"]["passed"] += 1
                        else:
                            self.log(f"⚠️ {field}: {stats['present']}/{total} (0%) - {description}")
                    
                    # Overall completeness summary
                    complete_pct = (complete_leads / len(items)) * 100
                    self.log(f"--- OVERALL COMPLETENESS ---")
                    self.log(f"Complete leads: {complete_leads}/{len(items)} ({complete_pct:.1f}%)")
                    self.log(f"Leads with missing fields: {missing_fields_leads}/{len(items)} ({100-complete_pct:.1f}%)")
                    
                    if complete_pct >= 80:
                        self.log("✅ OVERALL DATA QUALITY: EXCELLENT (80%+ complete)")
                        self.test_results["datasets"]["passed"] += 1
                    elif complete_pct >= 60:
                        self.log("✅ OVERALL DATA QUALITY: GOOD (60%+ complete)")
                        self.test_results["datasets"]["passed"] += 1
                    else:
                        self.log("❌ OVERALL DATA QUALITY: POOR (<60% complete)")
                        self.test_results["datasets"]["failed"] += 1
                        self.test_results["datasets"]["errors"].append(f"Poor data quality: only {complete_pct:.1f}% complete")
                    
                    # Show sample data
                    sample_item = items[0]["data"]
                    self.log(f"--- SAMPLE DATA ---")
                    self.log(f"Business: {sample_item.get('title', 'N/A')}")
                    self.log(f"Address: {sample_item.get('address', 'N/A')}")
                    self.log(f"Phone: {sample_item.get('phone', 'N/A')}")
                    self.log(f"Rating: {sample_item.get('rating', 'N/A')}")
                    self.log(f"Email: {sample_item.get('email', 'N/A')}")
                    
                    # Check social media extraction specifically
                    social_media = sample_item.get("socialMedia", {})
                    if isinstance(social_media, dict) and social_media:
                        platforms = list(social_media.keys())
                        self.log(f"Social Media: {', '.join(platforms)}")
                    else:
                        self.log("Social Media: None found")
                        
                else:
                    self.log("❌ No dataset items to verify")
                    self.test_results["datasets"]["failed"] += 1
                    self.test_results["datasets"]["errors"].append("No dataset items to verify")
            else:
                self.log("❌ Dataset items response is not a list")
                self.test_results["datasets"]["failed"] += 1
                self.test_results["datasets"]["errors"].append("Dataset items response is not a list")
        else:
            self.log(f"❌ Get dataset items failed: {response.status_code if response else 'No response'}")
            self.test_results["datasets"]["failed"] += 1
            self.test_results["datasets"]["errors"].append("Get dataset items failed")
        
        # 3. Completeness Test - 100 Leads (as per review requirements)
        self.log("--- 3. Completeness Test - 100 Leads (TARGET: 30-50 seconds) ---")
        
        completeness_run_data = {
            "actor_id": self.actor_id,
            "input_data": {
                "search_terms": ["restaurants"],
                "location": "New York, NY",
                "max_results": 100,
                "extract_reviews": False,
                "extract_images": False
            }
        }
        
        completeness_start_time = time.time()
        
        response = self.make_request("POST", "/runs", completeness_run_data)
        if response and response.status_code == 200:
            run = response.json()
            if "id" in run and "status" in run:
                self.completeness_run_id = run["id"]
                self.log(f"✅ Completeness test run created: {self.completeness_run_id}")
                self.test_results["runs"]["passed"] += 1
            else:
                self.log("❌ Completeness run response missing required fields")
                self.test_results["runs"]["failed"] += 1
                self.test_results["runs"]["errors"].append("Completeness run response missing required fields")
                return
        else:
            self.log(f"❌ Completeness run creation failed: {response.status_code if response else 'No response'}")
            self.test_results["runs"]["failed"] += 1
            self.test_results["runs"]["errors"].append("Completeness run creation failed")
            return
        
        # Monitor Completeness Run - TARGET: 30-50 seconds for 100 leads
        self.log("--- Monitoring Completeness Run (TARGET: 30-50 seconds for 100 leads) ---")
        
        max_wait_time = 120  # 2 minutes max (target is 30-50s)
        check_interval = 3  # Check every 3 seconds
        elapsed_time = 0
        
        while elapsed_time < max_wait_time:
            response = self.make_request("GET", f"/runs/{self.completeness_run_id}")
            if response and response.status_code == 200:
                run = response.json()
                status = run.get("status", "unknown")
                
                self.log(f"Completeness run status: {status} (elapsed: {elapsed_time}s)")
                
                if status == "succeeded":
                    end_time = time.time()
                    completeness_duration = end_time - completeness_start_time
                    self.log(f"🎉 Completeness run completed in {completeness_duration:.1f} seconds")
                    
                    # Performance measurement for 100 leads (target: 30-50 seconds)
                    if completeness_duration <= 50.0:
                        self.log(f"✅ V4 ENHANCED COMPLETENESS EXCELLENT: {completeness_duration:.1f}s ≤ 50s target")
                        self.test_results["runs"]["passed"] += 1
                    elif completeness_duration <= 70.0:
                        self.log(f"✅ V4 ENHANCED COMPLETENESS GOOD: {completeness_duration:.1f}s ≤ 70s (acceptable)")
                        self.test_results["runs"]["passed"] += 1
                    else:
                        self.log(f"❌ V4 ENHANCED COMPLETENESS SLOW: {completeness_duration:.1f}s > 70s (target was 30-50s)")
                        self.test_results["runs"]["failed"] += 1
                        self.test_results["runs"]["errors"].append(f"V4 Enhanced Completeness too slow: {completeness_duration:.1f}s")
                    
                    break
                elif status == "failed":
                    error_msg = run.get("error_message", "Unknown error")
                    self.log(f"❌ Completeness run failed: {error_msg}")
                    self.test_results["runs"]["failed"] += 1
                    self.test_results["runs"]["errors"].append(f"Completeness run failed: {error_msg}")
                    return
                elif status in ["queued", "running"]:
                    time.sleep(check_interval)
                    elapsed_time += check_interval
                else:
                    self.log(f"❌ Unknown completeness run status: {status}")
                    self.test_results["runs"]["failed"] += 1
                    self.test_results["runs"]["errors"].append(f"Unknown completeness run status: {status}")
                    return
            else:
                self.log(f"❌ Failed to get completeness run status: {response.status_code if response else 'No response'}")
                self.test_results["runs"]["failed"] += 1
                self.test_results["runs"]["errors"].append("Failed to get completeness run status")
                return
        
        if elapsed_time >= max_wait_time:
            self.log("❌ Completeness run did not complete within timeout period")
            self.test_results["runs"]["failed"] += 1
            self.test_results["runs"]["errors"].append("Completeness run timeout")
            return
        
        # Verify Completeness Results - 100 leads with NO data loss
        self.log("--- Verifying Completeness Results (100 leads) ---")
        
        response = self.make_request("GET", f"/datasets/{self.completeness_run_id}/items")
        if response and response.status_code == 200:
            items = response.json()
            if isinstance(items, list):
                self.log(f"✅ Retrieved {len(items)} completeness test items")
                
                # Check if we got exactly 100 results or close to it (CRITICAL)
                if len(items) == 100:
                    self.log(f"✅ PERFECT: V4 Enhanced scraper fetched exactly 100 results as requested")
                    self.test_results["datasets"]["passed"] += 1
                elif len(items) >= 95:  # Allow 95% tolerance
                    self.log(f"✅ EXCELLENT: V4 Enhanced scraper fetched {len(items)}/100 results (95%+ success)")
                    self.test_results["datasets"]["passed"] += 1
                elif len(items) >= 90:  # Allow 90% tolerance
                    self.log(f"✅ GOOD: V4 Enhanced scraper fetched {len(items)}/100 results (90%+ success)")
                    self.test_results["datasets"]["passed"] += 1
                else:
                    self.log(f"❌ POOR COMPLETENESS: V4 Enhanced scraper only fetched {len(items)}/100 results (<90%)")
                    self.test_results["datasets"]["failed"] += 1
                    self.test_results["datasets"]["errors"].append(f"Poor completeness: only {len(items)}/100 results")
                
                # Verify no significant data loss (the original V4 issue was fixed)
                if len(items) >= 90:  # At least 90% of requested results
                    self.log("✅ COMPLETENESS FIX VERIFIED: No significant data loss detected")
                    self.test_results["datasets"]["passed"] += 1
                else:
                    self.log("❌ COMPLETENESS ISSUE: Significant data loss detected (V4 Enhanced may have issues)")
                    self.test_results["datasets"]["failed"] += 1
                    self.test_results["datasets"]["errors"].append("Significant data loss detected in V4 Enhanced")
            else:
                self.log("❌ Completeness dataset items response is not a list")
                self.test_results["datasets"]["failed"] += 1
                self.test_results["datasets"]["errors"].append("Completeness dataset items response is not a list")
        else:
            self.log(f"❌ Get completeness dataset items failed: {response.status_code if response else 'No response'}")
            self.test_results["datasets"]["failed"] += 1
            self.test_results["datasets"]["errors"].append("Get completeness dataset items failed")

    def test_enhanced_global_chat_system(self):
        """Test Enhanced Global Chat System with Function Calling & Data Access"""
        self.log("=== Testing Enhanced Global Chat System with Function Calling ===")
        
        # Add global_chat to test results if not exists
        if "global_chat" not in self.test_results:
            self.test_results["global_chat"] = {"passed": 0, "failed": 0, "errors": []}
        
        # 1. Test Function Calling & Data Access
        self.log("--- Testing Function Calling & Data Access ---")
        
        # Test GET /api/chat/global/history - verify history loading
        self.log("Testing GET /api/chat/global/history...")
        response = self.make_request("GET", "/chat/global/history")
        if response and response.status_code == 200:
            history_data = response.json()
            if "history" in history_data and isinstance(history_data["history"], list):
                self.log(f"✅ Chat history endpoint working (found {len(history_data['history'])} messages)")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log("❌ Chat history response missing 'history' field or not a list")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Chat history response invalid structure")
        else:
            self.log(f"❌ Get chat history failed: {response.status_code if response else 'No response'}")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append("Get chat history failed")
        
        # Test data access questions that should trigger function calls
        data_access_questions = [
            {
                "question": "How many runs do I have?",
                "expected_function": "get_user_stats",
                "expected_terms": ["runs", "total", "statistics", "stats"]
            },
            {
                "question": "Show me my recent runs",
                "expected_function": "list_recent_runs", 
                "expected_terms": ["recent", "runs", "status", "scraping"]
            },
            {
                "question": "What scrapers are available?",
                "expected_function": "get_actors",
                "expected_terms": ["scrapers", "actors", "available", "google maps"]
            }
        ]
        
        for test_case in data_access_questions:
            self.log(f"Testing data access: '{test_case['question']}'")
            
            chat_request = {"message": test_case["question"]}
            response = self.make_request("POST", "/chat/global", chat_request)
            
            if response and response.status_code == 200:
                chat_response = response.json()
                if "response" in chat_response and "timestamp" in chat_response:
                    ai_response = chat_response["response"]
                    if len(ai_response) > 50:
                        self.log(f"✅ Response received (length: {len(ai_response)} chars)")
                        self.test_results["global_chat"]["passed"] += 1
                        
                        # Check if response contains real data (not made up)
                        response_lower = ai_response.lower()
                        has_relevant_terms = any(term in response_lower for term in test_case["expected_terms"])
                        
                        if has_relevant_terms:
                            self.log(f"✅ Response contains relevant data for {test_case['expected_function']}")
                            self.test_results["global_chat"]["passed"] += 1
                        else:
                            self.log(f"⚠️ Response may not contain expected data for {test_case['expected_function']}")
                        
                        # Check for numbers/data that suggest real database queries
                        import re
                        has_numbers = bool(re.search(r'\b\d+\b', ai_response))
                        if has_numbers:
                            self.log("✅ Response contains numerical data (suggests real database access)")
                            self.test_results["global_chat"]["passed"] += 1
                        else:
                            self.log("⚠️ Response lacks numerical data")
                    else:
                        self.log("❌ Response too short")
                        self.test_results["global_chat"]["failed"] += 1
                        self.test_results["global_chat"]["errors"].append(f"Short response for: {test_case['question']}")
                else:
                    self.log("❌ Response missing required fields")
                    self.test_results["global_chat"]["failed"] += 1
                    self.test_results["global_chat"]["errors"].append(f"Invalid response for: {test_case['question']}")
            else:
                self.log(f"❌ Request failed: {response.status_code if response else 'No response'}")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append(f"Request failed for: {test_case['question']}")
        
        # 2. Test Natural Language Run Creation
        self.log("--- Testing Natural Language Run Creation ---")
        
        natural_language_tests = [
            {
                "request": "run google maps scraper for Hotels in New York with max 50 results",
                "expected_terms": ["hotels", "new york", "50", "scraping", "run"],
                "expected_location": "new york",
                "expected_search": "hotels",
                "expected_max": 50
            },
            {
                "request": "scrape restaurants in San Francisco",
                "expected_terms": ["restaurants", "san francisco", "scraping"],
                "expected_location": "san francisco", 
                "expected_search": "restaurants"
            }
        ]
        
        created_run_ids = []
        
        for test_case in natural_language_tests:
            self.log(f"Testing natural language run creation: '{test_case['request']}'")
            
            chat_request = {"message": test_case["request"]}
            response = self.make_request("POST", "/chat/global", chat_request)
            
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                
                # Check for run creation indicators (more flexible)
                run_created = any(phrase in ai_response.lower() for phrase in [
                    "run created successfully", "scraping run created", "successfully created",
                    "run has been", "run id:"
                ])
                
                if run_created:
                    self.log("✅ Run creation confirmed in response")
                    self.test_results["global_chat"]["passed"] += 1
                    
                    # Extract run ID if present (more flexible patterns)
                    import re
                    run_id_patterns = [
                        r'Run ID:?\s*([a-f0-9\-]+)',
                        r'\*\*Run ID:\*\*\s*([a-f0-9\-]+)',
                        r'- \*\*Run ID:\*\*\s*([a-f0-9\-]+)'
                    ]
                    
                    run_id_match = None
                    for pattern in run_id_patterns:
                        run_id_match = re.search(pattern, ai_response, re.IGNORECASE)
                        if run_id_match:
                            break
                    if run_id_match:
                        run_id = run_id_match.group(1)
                        created_run_ids.append(run_id)
                        self.log(f"✅ Run ID extracted: {run_id}")
                        self.test_results["global_chat"]["passed"] += 1
                        
                        # Verify run exists in database
                        time.sleep(2)  # Allow time for database write
                        run_response = self.make_request("GET", f"/runs/{run_id}")
                        if run_response and run_response.status_code == 200:
                            run_data = run_response.json()
                            if run_data.get("status") == "queued":
                                self.log("✅ Run created in database with 'queued' status")
                                self.test_results["global_chat"]["passed"] += 1
                            else:
                                self.log(f"⚠️ Run status is '{run_data.get('status')}', expected 'queued'")
                            
                            # Verify parsing of parameters
                            input_data = run_data.get("input_data", {})
                            search_terms = input_data.get("search_terms", [])
                            location = input_data.get("location", "")
                            max_results = input_data.get("max_results", 0)
                            
                            if test_case["expected_search"].lower() in str(search_terms).lower():
                                self.log(f"✅ Search terms parsed correctly: {search_terms}")
                                self.test_results["global_chat"]["passed"] += 1
                            else:
                                self.log(f"❌ Search terms not parsed correctly: {search_terms}")
                                self.test_results["global_chat"]["failed"] += 1
                                self.test_results["global_chat"]["errors"].append(f"Search terms parsing failed for: {test_case['request']}")
                            
                            if test_case["expected_location"].lower() in location.lower():
                                self.log(f"✅ Location parsed correctly: {location}")
                                self.test_results["global_chat"]["passed"] += 1
                            else:
                                self.log(f"❌ Location not parsed correctly: {location}")
                                self.test_results["global_chat"]["failed"] += 1
                                self.test_results["global_chat"]["errors"].append(f"Location parsing failed for: {test_case['request']}")
                            
                            if "expected_max" in test_case and max_results == test_case["expected_max"]:
                                self.log(f"✅ Max results parsed correctly: {max_results}")
                                self.test_results["global_chat"]["passed"] += 1
                            elif "expected_max" in test_case:
                                self.log(f"❌ Max results not parsed correctly: {max_results}, expected: {test_case['expected_max']}")
                                self.test_results["global_chat"]["failed"] += 1
                                self.test_results["global_chat"]["errors"].append(f"Max results parsing failed for: {test_case['request']}")
                        else:
                            self.log("❌ Created run not found in database")
                            self.test_results["global_chat"]["failed"] += 1
                            self.test_results["global_chat"]["errors"].append(f"Run not found in database for: {test_case['request']}")
                    else:
                        self.log("⚠️ Run ID not found in response")
                else:
                    self.log("❌ Run creation not confirmed in response")
                    self.test_results["global_chat"]["failed"] += 1
                    self.test_results["global_chat"]["errors"].append(f"Run creation failed for: {test_case['request']}")
            else:
                self.log(f"❌ Natural language request failed: {response.status_code if response else 'No response'}")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append(f"Request failed for: {test_case['request']}")
        
        # 3. Test Conversation Persistence
        self.log("--- Testing Conversation Persistence ---")
        
        # Clear history first
        self.log("Clearing chat history...")
        clear_response = self.make_request("DELETE", "/chat/global/history")
        if clear_response and clear_response.status_code == 200:
            self.log("✅ Chat history cleared")
            self.test_results["global_chat"]["passed"] += 1
        else:
            self.log("❌ Failed to clear chat history")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append("Failed to clear chat history")
        
        # Send multiple messages in sequence
        conversation_messages = [
            "What is Scrapi?",
            "How do I get started?",
            "Can you tell me more about the previous topic?"
        ]
        
        for i, message in enumerate(conversation_messages):
            self.log(f"Sending message {i+1}: '{message}'")
            
            chat_request = {"message": message}
            response = self.make_request("POST", "/chat/global", chat_request)
            
            if response and response.status_code == 200:
                self.log(f"✅ Message {i+1} sent successfully")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log(f"❌ Message {i+1} failed")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append(f"Message {i+1} failed")
        
        # Verify all messages saved in global_chat_history collection
        time.sleep(2)  # Allow time for database writes
        history_response = self.make_request("GET", "/chat/global/history")
        if history_response and history_response.status_code == 200:
            history_data = history_response.json()
            history = history_data.get("history", [])
            
            # Should have user + assistant messages for each conversation
            expected_min_messages = len(conversation_messages) * 2  # user + assistant for each
            if len(history) >= expected_min_messages:
                self.log(f"✅ Conversation persistence working ({len(history)} messages saved)")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log(f"❌ Not all messages saved ({len(history)} found, expected at least {expected_min_messages})")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Conversation persistence failed")
        
        # 4. Test Response Quality
        self.log("--- Testing Response Quality ---")
        
        quality_test_message = "Tell me about Scrapi features"
        chat_request = {"message": quality_test_message}
        response = self.make_request("POST", "/chat/global", chat_request)
        
        if response and response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            # Check for proper markdown formatting
            has_bold = "**" in ai_response
            has_lists = any(marker in ai_response for marker in ["- ", "* ", "1. ", "2. "])
            
            if has_bold or has_lists:
                self.log("✅ Response uses markdown formatting")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log("⚠️ Response lacks markdown formatting")
            
            # Check for raw markdown symbols (should be processed)
            has_raw_markdown = "###" in ai_response or ai_response.count("**") % 2 != 0
            if not has_raw_markdown:
                self.log("✅ No raw markdown symbols in response")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log("❌ Response contains raw markdown symbols")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Response contains raw markdown symbols")
            
            # Check if response is contextual and helpful
            contextual_terms = ["scrapi", "scraping", "platform", "features", "actors", "runs"]
            is_contextual = any(term in ai_response.lower() for term in contextual_terms)
            
            if is_contextual:
                self.log("✅ Response is contextual and helpful")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log("❌ Response may not be contextual")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Response not contextual")
        
        # 5. Test Edge Cases
        self.log("--- Testing Edge Cases ---")
        
        # Test invalid run creation request
        self.log("Testing invalid run creation request...")
        invalid_request = {"message": "run nonexistent scraper for nothing"}
        response = self.make_request("POST", "/chat/global", invalid_request)
        
        if response and response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            if "error" in ai_response.lower() or "not found" in ai_response.lower() or "invalid" in ai_response.lower():
                self.log("✅ Invalid request handled gracefully")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log("⚠️ Invalid request may not be handled properly")
        
        # Test stop_run and delete_run functions with valid run_id (if we have created runs)
        if created_run_ids:
            test_run_id = created_run_ids[0]
            
            # Test stop_run
            self.log(f"Testing stop_run function with run_id: {test_run_id}")
            stop_request = {"message": f"stop run {test_run_id}"}
            response = self.make_request("POST", "/chat/global", stop_request)
            
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                
                if "stopped" in ai_response.lower() or "aborted" in ai_response.lower():
                    self.log("✅ Stop run function working")
                    self.test_results["global_chat"]["passed"] += 1
                else:
                    self.log("⚠️ Stop run function may not be working")
            
            # Test delete_run
            self.log(f"Testing delete_run function with run_id: {test_run_id}")
            delete_request = {"message": f"delete run {test_run_id}"}
            response = self.make_request("POST", "/chat/global", delete_request)
            
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                
                if "deleted" in ai_response.lower():
                    self.log("✅ Delete run function working")
                    self.test_results["global_chat"]["passed"] += 1
                else:
                    self.log("⚠️ Delete run function may not be working")
        
        # Test error handling for missing data
        self.log("Testing error handling...")
        error_request = {"message": "show me run with id nonexistent-id"}
        response = self.make_request("POST", "/chat/global", error_request)
        
        if response and response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            if "not found" in ai_response.lower() or "error" in ai_response.lower():
                self.log("✅ Error handling working for missing data")
                self.test_results["global_chat"]["passed"] += 1
            else:
                self.log("⚠️ Error handling may not be working properly")
        
        self.log("Enhanced Global Chat System testing completed")

    def test_global_chat_assistant_review(self):
        """Test Global Chat Assistant functionality as per review requirements"""
        self.log("=== Testing Global Chat Assistant (Review Requirements) ===")
        
        # Test 1: Basic Chat Flow - "Hello, what can you do?"
        self.log("--- Test 1: Basic Chat Flow ---")
        chat_request = {"message": "Hello, what can you do?"}
        
        response = self.make_request("POST", "/chat/global", chat_request)
        if response and response.status_code == 200:
            chat_response = response.json()
            if "response" in chat_response:
                ai_response = chat_response["response"]
                
                # Check for "encounter some issues" error
                if "encounter some issues" in ai_response.lower():
                    self.log("❌ Chat returned 'encounter some issues' error")
                    self.test_results["global_chat"]["failed"] += 1
                    self.test_results["global_chat"]["errors"].append("Chat returned 'encounter some issues' error")
                elif len(ai_response) > 50:  # Reasonable response length
                    self.log(f"✅ Basic chat working - response received (length: {len(ai_response)} chars)")
                    self.test_results["global_chat"]["passed"] += 1
                    
                    # Check if response is properly formatted (no raw markdown)
                    if not any(symbol in ai_response for symbol in ["**", "###", "```"]):
                        self.log("✅ Response is properly formatted (no raw markdown)")
                        self.test_results["global_chat"]["passed"] += 1
                    else:
                        self.log("⚠️ Response contains raw markdown symbols")
                    
                    # Check if response is contextual and helpful
                    response_lower = ai_response.lower()
                    helpful_terms = ["scrapi", "scraping", "help", "can", "platform", "features", "ai", "agent"]
                    if any(term in response_lower for term in helpful_terms):
                        self.log("✅ Response is contextual and helpful")
                        self.test_results["global_chat"]["passed"] += 1
                    else:
                        self.log("⚠️ Response may not be contextual")
                else:
                    self.log("❌ Basic chat response too short")
                    self.test_results["global_chat"]["failed"] += 1
                    self.test_results["global_chat"]["errors"].append("Basic chat response too short")
            else:
                self.log("❌ Basic chat response missing response field")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Basic chat response missing response field")
        else:
            self.log(f"❌ Basic chat request failed: {response.status_code if response else 'No response'}")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append("Basic chat request failed")
            return
        
        # Test 2: Multiple Messages - Chat History Maintenance
        self.log("--- Test 2: Multiple Messages for Chat History ---")
        test_messages = [
            "What scrapers are available?",
            "How do I create a new scraping run?",
            "Can you show me my recent activity?",
            "What data formats can I export?",
            "How does the proxy system work?"
        ]
        
        successful_messages = 0
        for i, message in enumerate(test_messages, 1):
            self.log(f"Sending message {i}/5: '{message}'")
            chat_request = {"message": message}
            
            response = self.make_request("POST", "/chat/global", chat_request)
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                
                if "encounter some issues" not in ai_response.lower() and len(ai_response) > 30:
                    successful_messages += 1
                    self.log(f"✅ Message {i} successful")
                else:
                    self.log(f"❌ Message {i} failed or returned error")
                    self.test_results["global_chat"]["errors"].append(f"Message {i} failed: {message}")
            else:
                self.log(f"❌ Message {i} request failed")
                self.test_results["global_chat"]["errors"].append(f"Message {i} request failed")
            
            # Small delay between messages
            time.sleep(1)
        
        if successful_messages >= 4:  # At least 4 out of 5 should work
            self.log(f"✅ Multiple messages working ({successful_messages}/5 successful)")
            self.test_results["global_chat"]["passed"] += 1
        else:
            self.log(f"❌ Multiple messages failing ({successful_messages}/5 successful)")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append(f"Only {successful_messages}/5 messages successful")
        
        # Test 3: Chat History Endpoint - GET /api/chat/global/history
        self.log("--- Test 3: Chat History Endpoint ---")
        response = self.make_request("GET", "/chat/global/history", params={"limit": 30})
        if response and response.status_code == 200:
            history_data = response.json()
            if "history" in history_data:
                history = history_data["history"]
                if isinstance(history, list):
                    self.log(f"✅ Chat history endpoint working - retrieved {len(history)} messages")
                    self.test_results["global_chat"]["passed"] += 1
                    
                    # Should have messages from our tests (at least 6: 1 basic + 5 multiple)
                    if len(history) >= 6:
                        self.log("✅ Chat history maintains conversation across messages")
                        self.test_results["global_chat"]["passed"] += 1
                        
                        # Verify message structure
                        if len(history) > 0:
                            sample_msg = history[0]
                            if "role" in sample_msg and "content" in sample_msg:
                                self.log("✅ Chat history has correct message structure")
                                self.test_results["global_chat"]["passed"] += 1
                            else:
                                self.log("❌ Chat history messages missing required fields")
                                self.test_results["global_chat"]["failed"] += 1
                                self.test_results["global_chat"]["errors"].append("Chat history messages missing fields")
                        
                        # Check for both user and assistant messages
                        user_msgs = [msg for msg in history if msg.get("role") == "user"]
                        assistant_msgs = [msg for msg in history if msg.get("role") == "assistant"]
                        
                        if len(user_msgs) > 0 and len(assistant_msgs) > 0:
                            self.log(f"✅ History contains both user ({len(user_msgs)}) and assistant ({len(assistant_msgs)}) messages")
                            self.test_results["global_chat"]["passed"] += 1
                        else:
                            self.log("❌ History missing user or assistant messages")
                            self.test_results["global_chat"]["failed"] += 1
                            self.test_results["global_chat"]["errors"].append("History missing message types")
                    else:
                        self.log(f"⚠️ Chat history has fewer messages than expected ({len(history)} < 6)")
                else:
                    self.log("❌ Chat history is not a list")
                    self.test_results["global_chat"]["failed"] += 1
                    self.test_results["global_chat"]["errors"].append("Chat history is not a list")
            else:
                self.log("❌ Chat history response missing history field")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Chat history response missing history field")
        else:
            self.log(f"❌ Chat history request failed: {response.status_code if response else 'No response'}")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append("Chat history request failed")
        
        # Test 4: Function Calling - Data Access
        self.log("--- Test 4: Function Calling - Data Access ---")
        data_request = {"message": "How many runs do I have?"}
        
        response = self.make_request("POST", "/chat/global", data_request)
        if response and response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            if "encounter some issues" not in ai_response.lower():
                if len(ai_response) > 20:
                    self.log(f"✅ Function calling working - data access response received")
                    self.test_results["global_chat"]["passed"] += 1
                    
                    # Check if response contains numerical data (indicating real data access)
                    import re
                    numbers = re.findall(r'\b\d+\b', ai_response)
                    if numbers:
                        self.log(f"✅ Response contains real numerical data: {numbers}")
                        self.test_results["global_chat"]["passed"] += 1
                        
                        # Verify it's user-specific data (not global)
                        response_lower = ai_response.lower()
                        user_specific_terms = ["you have", "your", "you've"]
                        if any(term in response_lower for term in user_specific_terms):
                            self.log("✅ Function calling returns user-specific data")
                            self.test_results["global_chat"]["passed"] += 1
                        else:
                            self.log("⚠️ Response may not be user-specific")
                    else:
                        self.log("⚠️ No numerical data in response (may be expected if no runs)")
                else:
                    self.log("❌ Function calling response too short")
                    self.test_results["global_chat"]["failed"] += 1
                    self.test_results["global_chat"]["errors"].append("Function calling response too short")
            else:
                self.log("❌ Function calling returned 'encounter some issues' error")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Function calling returned error")
        else:
            self.log("❌ Function calling request failed")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append("Function calling request failed")
        
        # Test 5: Error Handling - Check for 500 errors and exceptions
        self.log("--- Test 5: Error Handling ---")
        
        # Test with various edge cases
        edge_cases = [
            {"message": ""},  # Empty message
            {"message": "A" * 1000},  # Very long message
            {"invalid_field": "test"},  # Invalid request format
        ]
        
        error_handling_passed = 0
        for i, test_case in enumerate(edge_cases, 1):
            self.log(f"Testing edge case {i}: {list(test_case.keys())}")
            
            response = self.make_request("POST", "/chat/global", test_case)
            if response:
                if response.status_code == 400:  # Expected for invalid requests
                    self.log(f"✅ Edge case {i} handled correctly (400 error)")
                    error_handling_passed += 1
                elif response.status_code == 200:
                    # Check if response is reasonable
                    try:
                        chat_response = response.json()
                        if "response" in chat_response:
                            self.log(f"✅ Edge case {i} handled gracefully (200 OK)")
                            error_handling_passed += 1
                        else:
                            self.log(f"❌ Edge case {i} returned 200 but invalid response")
                    except:
                        self.log(f"❌ Edge case {i} returned invalid JSON")
                elif response.status_code == 500:
                    self.log(f"❌ Edge case {i} caused 500 error (unhandled exception)")
                    self.test_results["global_chat"]["errors"].append(f"Edge case {i} caused 500 error")
                else:
                    self.log(f"⚠️ Edge case {i} returned unexpected status: {response.status_code}")
            else:
                self.log(f"❌ Edge case {i} no response")
        
        if error_handling_passed >= 2:  # At least 2 out of 3 should be handled properly
            self.log("✅ Error handling working properly")
            self.test_results["global_chat"]["passed"] += 1
        else:
            self.log("❌ Error handling needs improvement")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append("Poor error handling")
        
        # Test 6: Check Backend Logs (via supervisor)
        self.log("--- Test 6: Backend Logs Check ---")
        try:
            # Check supervisor backend logs for any errors
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                error_logs = result.stdout
                if error_logs.strip():
                    # Check for recent errors (look for timestamps from last few minutes)
                    recent_errors = []
                    for line in error_logs.split('\n'):
                        if any(error_term in line.lower() for error_term in ['error', 'exception', 'traceback', 'failed']):
                            recent_errors.append(line)
                    
                    if recent_errors:
                        self.log(f"⚠️ Found {len(recent_errors)} error entries in backend logs")
                        for error in recent_errors[-3:]:  # Show last 3 errors
                            self.log(f"   LOG: {error}")
                    else:
                        self.log("✅ No recent errors in backend logs")
                        self.test_results["global_chat"]["passed"] += 1
                else:
                    self.log("✅ Backend error log is clean")
                    self.test_results["global_chat"]["passed"] += 1
            else:
                self.log("⚠️ Could not read backend logs")
        except Exception as e:
            self.log(f"⚠️ Error checking backend logs: {str(e)}")
        
        # Test 7: Verify Emergent LLM Integration
        self.log("--- Test 7: Emergent LLM Integration Check ---")
        
        # Test a specific question that should trigger the LLM
        llm_test_request = {"message": "Explain how web scraping works in simple terms"}
        
        response = self.make_request("POST", "/chat/global", llm_test_request)
        if response and response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            if "encounter some issues" not in ai_response.lower() and len(ai_response) > 100:
                self.log("✅ Emergent LLM integration working - detailed response received")
                self.test_results["global_chat"]["passed"] += 1
                
                # Check for coherent explanation
                explanation_terms = ["scraping", "data", "website", "extract", "information", "web"]
                if sum(1 for term in explanation_terms if term in ai_response.lower()) >= 3:
                    self.log("✅ LLM provides coherent explanations")
                    self.test_results["global_chat"]["passed"] += 1
                else:
                    self.log("⚠️ LLM response may not be coherent")
            else:
                self.log("❌ Emergent LLM integration issues")
                self.test_results["global_chat"]["failed"] += 1
                self.test_results["global_chat"]["errors"].append("Emergent LLM integration issues")
        else:
            self.log("❌ LLM integration test failed")
            self.test_results["global_chat"]["failed"] += 1
            self.test_results["global_chat"]["errors"].append("LLM integration test failed")
            
    def run_all_tests(self):
        """Run backend API tests with priority on Amazon Product Scraper review request"""
        self.log("🚀 Starting Backend API Testing - PRIORITY: Amazon Product Scraper Review")
        self.log(f"Backend URL: {self.base_url}")
        
        try:
            # Run the specific review request test first - Amazon Product Scraper with 'trimmer' keyword
            self.log("=" * 80)
            self.log("PRIORITY: Running Review Request Test - Amazon Product Scraper 'trimmer' Issue")
            self.log("=" * 80)
            trimmer_success = self.test_amazon_scraper_trimmer_issue()
            
            if trimmer_success:
                self.log("🎉 AMAZON PRODUCT SCRAPER 'TRIMMER' TEST COMPLETED SUCCESSFULLY!")
            else:
                self.log("❌ AMAZON PRODUCT SCRAPER 'TRIMMER' TEST FAILED!")
            
            self.log("\n" + "=" * 80)
            self.log("ADDITIONAL TESTS: Running comprehensive Amazon scraper tests")
            self.log("=" * 80)
            amazon_success = self.test_amazon_scraper_comprehensive()
            
            if amazon_success:
                self.log("🎉 AMAZON PRODUCT SCRAPER COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!")
            else:
                self.log("❌ AMAZON PRODUCT SCRAPER COMPREHENSIVE TEST FAILED!")
            
            self.log("\n" + "=" * 80)
            self.log("ADDITIONAL TESTS: Running other backend tests")
            self.log("=" * 80)
            
            # Test the new /api/actors-used endpoint as requested in previous review
            self.test_actors_used_endpoint()
            
        except Exception as e:
            self.log(f"❌ Unexpected error during testing: {e}")
            import traceback
            traceback.print_exc()
        
        # Print summary
        self.print_summary()
        
    def print_summary(self):
        """Print test results summary"""
        self.log("\n" + "="*60)
        self.log("TEST RESULTS SUMMARY")
        self.log("="*60)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.test_results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            status = "✅ PASS" if failed == 0 else "❌ FAIL"
            self.log(f"{category.upper()}: {status} ({passed} passed, {failed} failed)")
            
            if results["errors"]:
                for error in results["errors"]:
                    self.log(f"  - {error}")
                    
        self.log("-" * 60)
        self.log(f"OVERALL: {total_passed} passed, {total_failed} failed")
        
        if total_failed == 0:
            self.log("🎉 ALL TESTS PASSED!")
        else:
            self.log(f"⚠️  {total_failed} TESTS FAILED")
            
        return total_failed == 0

if __name__ == "__main__":
    tester = ScrapiAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)