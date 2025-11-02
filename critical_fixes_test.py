#!/usr/bin/env python3
"""
Critical Fixes Test Suite for Scrapi Platform
Tests the two specific user-reported issues that were fixed:
1. Parallel Task Execution for Scraping Jobs
2. Global Chat Memory/Context Retention
"""

import requests
import json
import time
import sys
import os
from datetime import datetime
import asyncio

# Get backend URL from environment
BACKEND_URL = "https://login-harvest.preview.emergentagent.com/api"

class CriticalFixesTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_data = None
        self.actor_id = None
        self.test_results = {
            "parallel_execution": {"passed": 0, "failed": 0, "errors": []},
            "chat_memory": {"passed": 0, "failed": 0, "errors": []}
        }
        
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
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}")
            return None
    
    def authenticate(self):
        """Authenticate with existing user credentials"""
        self.log("=== Authenticating with testuser_scrapi ===")
        
        login_data = {
            "username": "testuser_scrapi",
            "password": "SecurePass123!"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]
                self.user_data = data["user"]
                self.log("✅ Authentication successful")
                return True
            else:
                self.log("❌ Login response missing required fields")
                return False
        else:
            self.log(f"❌ Authentication failed: {response.status_code if response else 'No response'}")
            return False
    
    def get_google_maps_actor(self):
        """Get Google Maps Scraper actor ID"""
        self.log("Getting Google Maps Scraper actor...")
        
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            for actor in actors:
                if "Google Maps Scraper" in actor.get("name", ""):
                    self.actor_id = actor["id"]
                    self.log(f"✅ Found Google Maps Scraper: {actor['name']}")
                    return True
            
            self.log("❌ Google Maps Scraper not found")
            return False
        else:
            self.log(f"❌ Failed to get actors: {response.status_code if response else 'No response'}")
            return False
    
    def test_parallel_task_execution(self):
        """
        TEST 1: Parallel Task Execution for Scraping Jobs
        
        User reported: Jobs staying in "queued" status instead of running in parallel
        Fix: Created TaskManager class using asyncio.create_task() for concurrent execution
        
        Test Scenarios:
        1. Login with existing user credentials (username: testuser_scrapi)
        2. Create 3 scraping runs rapidly (within 10 seconds):
           - Run 1: Search "Hotels" in "Miami, FL" with max_results: 3
           - Run 2: Search "Restaurants" in "Boston, MA" with max_results: 3  
           - Run 3: Search "Coffee Shops" in "Seattle, WA" with max_results: 3
        3. CRITICAL: Immediately check all run statuses - verify that multiple runs show "running" status simultaneously
        4. Monitor runs for 60 seconds to confirm parallel execution
        """
        self.log("=== TEST 1: PARALLEL TASK EXECUTION FOR SCRAPING JOBS ===")
        
        if not self.actor_id:
            self.log("❌ Cannot test - no Google Maps Scraper actor available")
            self.test_results["parallel_execution"]["failed"] += 1
            self.test_results["parallel_execution"]["errors"].append("No Google Maps Scraper actor available")
            return
        
        # Define 3 test runs as specified in requirements
        test_runs = [
            {
                "name": "Hotels in Miami",
                "search_terms": ["Hotels"],
                "location": "Miami, FL",
                "max_results": 3
            },
            {
                "name": "Restaurants in Boston", 
                "search_terms": ["Restaurants"],
                "location": "Boston, MA",
                "max_results": 3
            },
            {
                "name": "Coffee Shops in Seattle",
                "search_terms": ["Coffee Shops"],
                "location": "Seattle, WA", 
                "max_results": 3
            }
        ]
        
        created_run_ids = []
        start_time = time.time()
        
        # Step 1: Create 3 runs rapidly (within 10 seconds)
        self.log("Creating 3 scraping runs rapidly...")
        
        for i, run_config in enumerate(test_runs):
            self.log(f"Creating run {i+1}: {run_config['name']}")
            
            run_data = {
                "actor_id": self.actor_id,
                "input_data": {
                    "search_terms": run_config["search_terms"],
                    "location": run_config["location"],
                    "max_results": run_config["max_results"],
                    "extract_reviews": False,
                    "extract_images": False
                }
            }
            
            response = self.make_request("POST", "/runs", run_data)
            if response and response.status_code == 200:
                run = response.json()
                if "id" in run:
                    created_run_ids.append(run["id"])
                    self.log(f"✅ Run {i+1} created: {run['id']}")
                else:
                    self.log(f"❌ Run {i+1} response missing ID")
                    self.test_results["parallel_execution"]["failed"] += 1
                    self.test_results["parallel_execution"]["errors"].append(f"Run {i+1} response missing ID")
            else:
                self.log(f"❌ Failed to create run {i+1}: {response.status_code if response else 'No response'}")
                self.test_results["parallel_execution"]["failed"] += 1
                self.test_results["parallel_execution"]["errors"].append(f"Failed to create run {i+1}")
        
        creation_time = time.time() - start_time
        self.log(f"All runs created in {creation_time:.2f} seconds")
        
        if len(created_run_ids) < 3:
            self.log("❌ Could not create all 3 runs - aborting parallel execution test")
            self.test_results["parallel_execution"]["failed"] += 1
            self.test_results["parallel_execution"]["errors"].append("Could not create all 3 runs")
            return
        
        # Step 2: CRITICAL - Immediately check run statuses for parallel execution
        self.log("🔍 CRITICAL CHECK: Verifying parallel execution...")
        time.sleep(2)  # Brief pause to allow runs to start
        
        # Check statuses multiple times over 60 seconds
        parallel_execution_detected = False
        running_simultaneously_count = 0
        max_simultaneous_running = 0
        
        for check_round in range(12):  # Check every 5 seconds for 60 seconds
            self.log(f"--- Status Check Round {check_round + 1} ---")
            
            current_statuses = {}
            running_count = 0
            
            for run_id in created_run_ids:
                response = self.make_request("GET", f"/runs/{run_id}")
                if response and response.status_code == 200:
                    run_data = response.json()
                    status = run_data.get("status", "unknown")
                    current_statuses[run_id] = status
                    
                    if status == "running":
                        running_count += 1
                else:
                    current_statuses[run_id] = "error"
            
            # Track maximum simultaneous running tasks
            max_simultaneous_running = max(max_simultaneous_running, running_count)
            
            # Log current status
            status_summary = []
            for run_id, status in current_statuses.items():
                status_summary.append(f"{run_id[:8]}...:{status}")
            
            self.log(f"Statuses: {', '.join(status_summary)} | Running: {running_count}")
            
            # CRITICAL: Check for parallel execution (multiple runs "running" simultaneously)
            if running_count >= 2:
                parallel_execution_detected = True
                running_simultaneously_count += 1
                self.log(f"🎉 PARALLEL EXECUTION DETECTED: {running_count} runs running simultaneously!")
            
            # Check if all runs completed
            all_completed = all(status in ["succeeded", "failed"] for status in current_statuses.values())
            if all_completed:
                self.log("All runs completed")
                break
            
            time.sleep(5)  # Wait 5 seconds before next check
        
        # Step 3: Evaluate results
        self.log("=== PARALLEL EXECUTION TEST RESULTS ===")
        
        if parallel_execution_detected:
            self.log(f"✅ PARALLEL EXECUTION CONFIRMED: Detected {running_simultaneously_count} rounds with multiple runs running simultaneously")
            self.log(f"✅ Maximum simultaneous running tasks: {max_simultaneous_running}")
            self.test_results["parallel_execution"]["passed"] += 1
        else:
            self.log("❌ PARALLEL EXECUTION FAILED: No instances of multiple runs running simultaneously detected")
            self.log("❌ This indicates jobs are still queuing sequentially instead of running in parallel")
            self.test_results["parallel_execution"]["failed"] += 1
            self.test_results["parallel_execution"]["errors"].append("No parallel execution detected - jobs appear to be queuing sequentially")
        
        # Additional checks
        if max_simultaneous_running >= 2:
            self.log(f"✅ TaskManager working: Up to {max_simultaneous_running} tasks ran simultaneously")
            self.test_results["parallel_execution"]["passed"] += 1
        else:
            self.log("❌ TaskManager may not be working: Never saw multiple tasks running simultaneously")
            self.test_results["parallel_execution"]["failed"] += 1
            self.test_results["parallel_execution"]["errors"].append("TaskManager not enabling parallel execution")
        
        # Check final statuses
        final_statuses = {}
        for run_id in created_run_ids:
            response = self.make_request("GET", f"/runs/{run_id}")
            if response and response.status_code == 200:
                run_data = response.json()
                final_statuses[run_id] = run_data.get("status", "unknown")
        
        succeeded_count = sum(1 for status in final_statuses.values() if status == "succeeded")
        failed_count = sum(1 for status in final_statuses.values() if status == "failed")
        
        self.log(f"Final results: {succeeded_count} succeeded, {failed_count} failed")
        
        if succeeded_count >= 1:
            self.log("✅ At least one run completed successfully")
            self.test_results["parallel_execution"]["passed"] += 1
        else:
            self.log("❌ No runs completed successfully")
            self.test_results["parallel_execution"]["failed"] += 1
            self.test_results["parallel_execution"]["errors"].append("No runs completed successfully")
    
    def test_global_chat_memory(self):
        """
        TEST 2: Global Chat Memory/Context Retention
        
        User reported: Chatbot doesn't remember previous messages - loses context between turns
        Fix: Modified global_chat_service_v2.py to include conversation history in system prompt
        
        Test Scenarios:
        1. Clear chat history: DELETE /api/chat/global/history
        2. Test multi-turn conversation requiring memory:
           - Message 1: "How many scrapers do I have available?"
           - Verify response mentions scrapers/actors
           - Message 2: "Which one is best for finding business data?"
           - CRITICAL: Verify response references "scrapers" from Message 1 without user repeating the question
           - Message 3: "Can you run it for restaurants in Chicago with 5 results?"
           - CRITICAL: Verify bot understands "it" refers to the Google Maps scraper from previous context
        3. Another conversation test:
           - Message 1: "Show me my recent runs"
           - Message 2: "How many succeeded?"
           - CRITICAL: Verify bot knows "succeeded" refers to runs from Message 1
        4. Verify conversation history is stored in global_chat_history collection
        """
        self.log("=== TEST 2: GLOBAL CHAT MEMORY/CONTEXT RETENTION ===")
        
        # Step 1: Clear chat history
        self.log("Step 1: Clearing chat history...")
        response = self.make_request("DELETE", "/chat/global/history")
        if response and response.status_code == 200:
            self.log("✅ Chat history cleared successfully")
            self.test_results["chat_memory"]["passed"] += 1
        else:
            self.log(f"❌ Failed to clear chat history: {response.status_code if response else 'No response'}")
            self.test_results["chat_memory"]["failed"] += 1
            self.test_results["chat_memory"]["errors"].append("Failed to clear chat history")
        
        # Step 2: Test multi-turn conversation requiring memory
        self.log("Step 2: Testing multi-turn conversation with context retention...")
        
        conversation_1 = [
            {
                "message": "How many scrapers do I have available?",
                "expected_terms": ["scraper", "actor", "available", "google maps"],
                "context_check": None
            },
            {
                "message": "Which one is best for finding business data?",
                "expected_terms": ["business", "data", "google maps", "best"],
                "context_check": "scrapers"  # Should reference scrapers from previous message
            },
            {
                "message": "Can you run it for restaurants in Chicago with 5 results?",
                "expected_terms": ["run", "restaurants", "chicago", "5"],
                "context_check": "google maps"  # Should understand "it" refers to Google Maps scraper
            }
        ]
        
        conversation_1_responses = []
        
        for i, turn in enumerate(conversation_1):
            self.log(f"Message {i+1}: '{turn['message']}'")
            
            chat_request = {"message": turn["message"]}
            response = self.make_request("POST", "/chat/global", chat_request)
            
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                conversation_1_responses.append(ai_response)
                
                self.log(f"✅ Response received (length: {len(ai_response)} chars)")
                self.test_results["chat_memory"]["passed"] += 1
                
                # Check for expected terms
                response_lower = ai_response.lower()
                has_expected_terms = any(term in response_lower for term in turn["expected_terms"])
                
                if has_expected_terms:
                    self.log(f"✅ Response contains expected terms: {turn['expected_terms']}")
                    self.test_results["chat_memory"]["passed"] += 1
                else:
                    self.log(f"⚠️ Response may not contain expected terms: {turn['expected_terms']}")
                
                # CRITICAL: Check for context retention
                if turn["context_check"]:
                    context_retained = turn["context_check"].lower() in response_lower
                    
                    if context_retained:
                        self.log(f"🎉 CONTEXT RETENTION CONFIRMED: Response references '{turn['context_check']}' from previous context")
                        self.test_results["chat_memory"]["passed"] += 1
                    else:
                        self.log(f"❌ CONTEXT RETENTION FAILED: Response does not reference '{turn['context_check']}' from previous messages")
                        self.log(f"   This indicates the chatbot is not remembering previous conversation turns")
                        self.test_results["chat_memory"]["failed"] += 1
                        self.test_results["chat_memory"]["errors"].append(f"Context retention failed for '{turn['context_check']}'")
                
                # Show partial response for debugging
                preview = ai_response[:200] + "..." if len(ai_response) > 200 else ai_response
                self.log(f"Response preview: {preview}")
                
            else:
                self.log(f"❌ Message {i+1} failed: {response.status_code if response else 'No response'}")
                self.test_results["chat_memory"]["failed"] += 1
                self.test_results["chat_memory"]["errors"].append(f"Message {i+1} failed")
            
            time.sleep(1)  # Brief pause between messages
        
        # Step 3: Another conversation test
        self.log("Step 3: Testing another conversation requiring context...")
        
        conversation_2 = [
            {
                "message": "Show me my recent runs",
                "expected_terms": ["runs", "recent", "scraping"],
                "context_check": None
            },
            {
                "message": "How many succeeded?",
                "expected_terms": ["succeeded", "success", "completed"],
                "context_check": "runs"  # Should understand "succeeded" refers to runs from previous message
            }
        ]
        
        for i, turn in enumerate(conversation_2):
            self.log(f"Follow-up Message {i+1}: '{turn['message']}'")
            
            chat_request = {"message": turn["message"]}
            response = self.make_request("POST", "/chat/global", chat_request)
            
            if response and response.status_code == 200:
                chat_response = response.json()
                ai_response = chat_response.get("response", "")
                
                self.log(f"✅ Response received (length: {len(ai_response)} chars)")
                self.test_results["chat_memory"]["passed"] += 1
                
                # Check for expected terms
                response_lower = ai_response.lower()
                has_expected_terms = any(term in response_lower for term in turn["expected_terms"])
                
                if has_expected_terms:
                    self.log(f"✅ Response contains expected terms: {turn['expected_terms']}")
                    self.test_results["chat_memory"]["passed"] += 1
                
                # CRITICAL: Check for context retention
                if turn["context_check"]:
                    context_retained = turn["context_check"].lower() in response_lower
                    
                    if context_retained:
                        self.log(f"🎉 CONTEXT RETENTION CONFIRMED: Response references '{turn['context_check']}' from previous context")
                        self.test_results["chat_memory"]["passed"] += 1
                    else:
                        self.log(f"❌ CONTEXT RETENTION FAILED: Response does not reference '{turn['context_check']}' from previous messages")
                        self.test_results["chat_memory"]["failed"] += 1
                        self.test_results["chat_memory"]["errors"].append(f"Context retention failed for '{turn['context_check']}'")
                
                # Show partial response for debugging
                preview = ai_response[:200] + "..." if len(ai_response) > 200 else ai_response
                self.log(f"Response preview: {preview}")
                
            else:
                self.log(f"❌ Follow-up message {i+1} failed: {response.status_code if response else 'No response'}")
                self.test_results["chat_memory"]["failed"] += 1
                self.test_results["chat_memory"]["errors"].append(f"Follow-up message {i+1} failed")
            
            time.sleep(1)
        
        # Step 4: Verify conversation history is stored
        self.log("Step 4: Verifying conversation history storage...")
        
        response = self.make_request("GET", "/chat/global/history")
        if response and response.status_code == 200:
            history_data = response.json()
            history = history_data.get("history", [])
            
            if len(history) >= 10:  # Should have at least 5 user + 5 assistant messages
                self.log(f"✅ Conversation history stored: {len(history)} messages in global_chat_history collection")
                self.test_results["chat_memory"]["passed"] += 1
                
                # Check message structure
                user_messages = [msg for msg in history if msg.get("role") == "user"]
                assistant_messages = [msg for msg in history if msg.get("role") == "assistant"]
                
                if len(user_messages) >= 5 and len(assistant_messages) >= 5:
                    self.log("✅ Conversation history contains both user and assistant messages")
                    self.test_results["chat_memory"]["passed"] += 1
                else:
                    self.log("❌ Conversation history missing user or assistant messages")
                    self.test_results["chat_memory"]["failed"] += 1
                    self.test_results["chat_memory"]["errors"].append("Conversation history missing message types")
            else:
                self.log(f"❌ Insufficient conversation history: {len(history)} messages (expected at least 10)")
                self.test_results["chat_memory"]["failed"] += 1
                self.test_results["chat_memory"]["errors"].append("Insufficient conversation history stored")
        else:
            self.log(f"❌ Failed to retrieve conversation history: {response.status_code if response else 'No response'}")
            self.test_results["chat_memory"]["failed"] += 1
            self.test_results["chat_memory"]["errors"].append("Failed to retrieve conversation history")
    
    def run_critical_fixes_tests(self):
        """Run all critical fixes tests"""
        self.log("🚀 STARTING CRITICAL FIXES TESTING FOR USER-REPORTED ISSUES")
        self.log(f"Backend URL: {self.base_url}")
        
        # Authenticate first
        if not self.authenticate():
            self.log("❌ Authentication failed - stopping tests")
            return False
        
        # Get Google Maps Scraper actor
        if not self.get_google_maps_actor():
            self.log("❌ Could not find Google Maps Scraper - stopping tests")
            return False
        
        # Run the two critical tests
        self.test_parallel_task_execution()
        self.test_global_chat_memory()
        
        # Print summary
        self.print_summary()
        
        return self.get_overall_success()
    
    def print_summary(self):
        """Print test results summary"""
        self.log("\n" + "="*80)
        self.log("CRITICAL FIXES TEST RESULTS SUMMARY")
        self.log("="*80)
        
        total_passed = 0
        total_failed = 0
        
        for test_name, results in self.test_results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            status = "✅ PASS" if failed == 0 else "❌ FAIL"
            test_display = test_name.replace("_", " ").title()
            self.log(f"{test_display}: {status} ({passed} passed, {failed} failed)")
            
            if results["errors"]:
                for error in results["errors"]:
                    self.log(f"  - {error}")
        
        self.log("-" * 80)
        self.log(f"OVERALL: {total_passed} passed, {total_failed} failed")
        
        if total_failed == 0:
            self.log("🎉 ALL CRITICAL FIXES WORKING!")
            self.log("✅ Parallel task execution is working correctly")
            self.log("✅ Global chat memory/context retention is working correctly")
        else:
            self.log(f"⚠️  {total_failed} CRITICAL ISSUES STILL PRESENT")
            
            # Specific guidance for each fix
            if any("parallel" in error.lower() for results in self.test_results.values() for error in results["errors"]):
                self.log("❌ PARALLEL EXECUTION ISSUE: Jobs may still be queuing sequentially instead of running in parallel")
                self.log("   → Check TaskManager implementation and asyncio.create_task() usage")
            
            if any("context" in error.lower() or "retention" in error.lower() for results in self.test_results.values() for error in results["errors"]):
                self.log("❌ CHAT MEMORY ISSUE: Chatbot is not retaining context between conversation turns")
                self.log("   → Check global_chat_service_v2.py conversation history inclusion in system prompt")
    
    def get_overall_success(self):
        """Check if all tests passed"""
        total_failed = sum(results["failed"] for results in self.test_results.values())
        return total_failed == 0

if __name__ == "__main__":
    tester = CriticalFixesTester()
    success = tester.run_critical_fixes_tests()
    sys.exit(0 if success else 1)