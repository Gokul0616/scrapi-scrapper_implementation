#!/usr/bin/env python3
"""
Indeed Jobs Scraper Zero Results Fix Test
CRITICAL TESTING - Verify scraper shows "FAILED" status when 0 results found
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://zero-result-fix.preview.emergentagent.com/api"

class IndeedJobsScraperTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_data = None
        self.test_results = {
            "indeed_zero_results": {"passed": 0, "failed": 0, "errors": []}
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

    def test_indeed_jobs_scraper_zero_results_fix(self):
        """Test Indeed Jobs Scraper Zero Results Fix - CRITICAL TESTING as requested in review"""
        self.log("=== CRITICAL TESTING - Indeed Jobs Scraper Zero Results Fix ===")
        
        # Step 1: Authentication with test credentials
        self.log("Step 1: Authenticating with test credentials (username: test, password: test)...")
        login_data = {
            "username": "test",
            "password": "test"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.auth_token = data["access_token"]
                self.user_data = data["user"]
                self.log("✅ Login successful with test credentials")
                self.test_results["indeed_zero_results"]["passed"] += 1
            else:
                self.log("❌ Login response missing access_token")
                self.test_results["indeed_zero_results"]["failed"] += 1
                self.test_results["indeed_zero_results"]["errors"].append("Login failed - missing access_token")
                return False
        else:
            self.log(f"❌ Login failed: {response.status_code if response else 'No response'}")
            self.test_results["indeed_zero_results"]["failed"] += 1
            self.test_results["indeed_zero_results"]["errors"].append("Login failed with test credentials")
            return False
        
        # Step 2: Find Indeed Jobs Scraper actor
        self.log("Step 2: Finding Indeed Jobs Scraper actor...")
        response = self.make_request("GET", "/actors")
        if response and response.status_code == 200:
            actors = response.json()
            indeed_actor = None
            for actor in actors:
                if actor.get("name") == "Indeed Jobs Scraper":
                    indeed_actor = actor
                    indeed_actor_id = actor["id"]
                    break
            
            if indeed_actor:
                self.log(f"✅ Found Indeed Jobs Scraper actor: {indeed_actor_id}")
                self.test_results["indeed_zero_results"]["passed"] += 1
            else:
                self.log("❌ Indeed Jobs Scraper actor not found")
                self.test_results["indeed_zero_results"]["failed"] += 1
                self.test_results["indeed_zero_results"]["errors"].append("Indeed Jobs Scraper actor not found")
                return False
        else:
            self.log(f"❌ Failed to get actors: {response.status_code if response else 'No response'}")
            self.test_results["indeed_zero_results"]["failed"] += 1
            self.test_results["indeed_zero_results"]["errors"].append("Failed to get actors")
            return False
        
        # Step 3: Create run with parameters likely to return 0 results
        self.log("Step 3: Creating run with parameters likely to return 0 results...")
        self.log("  - keyword: 'python developer'")
        self.log("  - location: 'chennai'")
        self.log("  - max_pages: 5")
        
        run_data = {
            "actor_id": indeed_actor_id,
            "input_data": {
                "keyword": "python developer",
                "location": "chennai",
                "max_pages": 5
            }
        }
        
        response = self.make_request("POST", "/runs", run_data)
        if response and response.status_code == 200:
            run = response.json()
            if "id" in run:
                run_id = run["id"]
                self.log(f"✅ Run created successfully: {run_id}")
                self.log(f"✅ Initial status: {run.get('status', 'unknown')}")
                self.test_results["indeed_zero_results"]["passed"] += 1
            else:
                self.log("❌ Run creation response missing ID")
                self.test_results["indeed_zero_results"]["failed"] += 1
                self.test_results["indeed_zero_results"]["errors"].append("Run creation response missing ID")
                return False
        else:
            self.log(f"❌ Failed to create run: {response.status_code if response else 'No response'}")
            self.test_results["indeed_zero_results"]["failed"] += 1
            self.test_results["indeed_zero_results"]["errors"].append("Failed to create run")
            return False
        
        # Step 4: Monitor run status - CRITICAL VALIDATION
        self.log("Step 4: Monitoring run status for CRITICAL validation...")
        self.log("EXPECTED BEHAVIOR:")
        self.log("  ✅ Run should show status 'failed' or 'aborted' (NOT 'succeeded')")
        self.log("  ✅ Error message should mention anti-bot detection, no jobs, incorrect location, or HTML changes")
        self.log("  ✅ Results count should be 0")
        self.log("  ✅ Backend logs should show progress messages and debugging info")
        self.log("  ✅ HTML samples should be saved to /tmp/indeed_debug_page*.html")
        
        max_wait_time = 300  # 5 minutes
        check_interval = 15  # 15 seconds
        elapsed_time = 0
        final_status = None
        error_message = None
        results_count = None
        
        while elapsed_time < max_wait_time:
            response = self.make_request("GET", f"/runs/{run_id}")
            if response and response.status_code == 200:
                run_status = response.json()
                status = run_status.get("status", "unknown")
                error_message = run_status.get("error_message")
                results_count = run_status.get("results_count", 0)
                logs = run_status.get("logs", [])
                
                # Show latest progress logs
                if logs:
                    latest_logs = logs[-3:] if len(logs) >= 3 else logs
                    for log_entry in latest_logs:
                        self.log(f"Progress: {log_entry}")
                
                self.log(f"Run status: {status} | Results: {results_count} | Elapsed: {elapsed_time}s")
                
                if error_message:
                    self.log(f"Error message: {error_message}")
                
                if status in ["succeeded", "failed", "aborted"]:
                    final_status = status
                    break
                elif status in ["queued", "running"]:
                    elapsed_time += check_interval
                    time.sleep(check_interval)
                else:
                    self.log(f"❌ Unknown status: {status}")
                    self.test_results["indeed_zero_results"]["failed"] += 1
                    self.test_results["indeed_zero_results"]["errors"].append(f"Unknown status: {status}")
                    return False
            else:
                self.log(f"❌ Failed to get run status: {response.status_code if response else 'No response'}")
                self.test_results["indeed_zero_results"]["failed"] += 1
                self.test_results["indeed_zero_results"]["errors"].append("Failed to get run status")
                return False
        
        if elapsed_time >= max_wait_time:
            self.log("❌ Run did not complete within timeout")
            self.test_results["indeed_zero_results"]["failed"] += 1
            self.test_results["indeed_zero_results"]["errors"].append("Run timeout")
            return False
        
        # Step 5: CRITICAL VALIDATION - Verify the fix works
        self.log("Step 5: CRITICAL VALIDATION - Verifying zero results fix...")
        
        # Validation 1: Status should be "failed" (NOT "succeeded")
        if final_status == "failed":
            self.log("✅ CRITICAL VALIDATION PASSED: Run status is 'failed' (NOT 'succeeded')")
            self.test_results["indeed_zero_results"]["passed"] += 1
        elif final_status == "aborted":
            self.log("✅ CRITICAL VALIDATION PASSED: Run status is 'aborted' (acceptable)")
            self.test_results["indeed_zero_results"]["passed"] += 1
        elif final_status == "succeeded":
            self.log("❌ CRITICAL VALIDATION FAILED: Run status is 'succeeded' - this is the bug we're testing!")
            self.test_results["indeed_zero_results"]["failed"] += 1
            self.test_results["indeed_zero_results"]["errors"].append("CRITICAL BUG: Run succeeded with 0 results instead of failing")
        else:
            self.log(f"❌ CRITICAL VALIDATION FAILED: Unexpected status '{final_status}'")
            self.test_results["indeed_zero_results"]["failed"] += 1
            self.test_results["indeed_zero_results"]["errors"].append(f"Unexpected final status: {final_status}")
        
        # Validation 2: Results count should be 0
        if results_count == 0:
            self.log("✅ Results count is 0 as expected")
            self.test_results["indeed_zero_results"]["passed"] += 1
        else:
            self.log(f"⚠️ Results count is {results_count} (unexpected - may have found actual jobs)")
        
        # Validation 3: Error message should explain why scraping failed
        if error_message:
            expected_terms = ["anti-bot detection", "no jobs available", "incorrect location", "HTML structure changes"]
            has_expected_term = any(term in error_message.lower() for term in expected_terms)
            
            if has_expected_term:
                self.log("✅ Error message explains failure reason (anti-bot, no jobs, location, or HTML changes)")
                self.test_results["indeed_zero_results"]["passed"] += 1
            else:
                self.log(f"⚠️ Error message doesn't contain expected terms: {error_message}")
            
            self.log(f"Full error message: {error_message}")
        else:
            if final_status == "failed":
                self.log("❌ No error message provided for failed run")
                self.test_results["indeed_zero_results"]["failed"] += 1
                self.test_results["indeed_zero_results"]["errors"].append("No error message for failed run")
        
        # Step 6: Check for HTML debug files (if accessible)
        self.log("Step 6: Checking for HTML debug files...")
        try:
            import os
            debug_files = [f for f in os.listdir('/tmp') if f.startswith('indeed_debug_page') and f.endswith('.html')]
            if debug_files:
                self.log(f"✅ HTML debug files found: {debug_files}")
                self.test_results["indeed_zero_results"]["passed"] += 1
            else:
                self.log("⚠️ No HTML debug files found in /tmp/ (may not be accessible from test environment)")
        except Exception as e:
            self.log(f"⚠️ Could not check debug files: {e}")
        
        # Step 7: Test with invalid location (additional test if first test found jobs)
        if final_status == "succeeded" and results_count > 0:
            self.log("Step 7: First test found jobs - trying with invalid location...")
            self.log("  - keyword: 'software engineer'")
            self.log("  - location: 'xyz123invalid'")
            self.log("  - max_pages: 3")
            
            run_data_invalid = {
                "actor_id": indeed_actor_id,
                "input_data": {
                    "keyword": "software engineer",
                    "location": "xyz123invalid",
                    "max_pages": 3
                }
            }
            
            response = self.make_request("POST", "/runs", run_data_invalid)
            if response and response.status_code == 200:
                run = response.json()
                if "id" in run:
                    run_id_invalid = run["id"]
                    self.log(f"✅ Invalid location run created: {run_id_invalid}")
                    
                    # Monitor this run too
                    elapsed_time = 0
                    while elapsed_time < max_wait_time:
                        response = self.make_request("GET", f"/runs/{run_id_invalid}")
                        if response and response.status_code == 200:
                            run_status = response.json()
                            status = run_status.get("status", "unknown")
                            
                            if status in ["succeeded", "failed", "aborted"]:
                                if status == "failed":
                                    self.log("✅ ADDITIONAL TEST PASSED: Invalid location run failed as expected")
                                    self.test_results["indeed_zero_results"]["passed"] += 1
                                elif status == "succeeded":
                                    results = run_status.get("results_count", 0)
                                    if results == 0:
                                        self.log("❌ ADDITIONAL TEST FAILED: Invalid location run succeeded with 0 results")
                                        self.test_results["indeed_zero_results"]["failed"] += 1
                                        self.test_results["indeed_zero_results"]["errors"].append("Invalid location run succeeded with 0 results")
                                    else:
                                        self.log(f"⚠️ Invalid location run unexpectedly found {results} results")
                                break
                            elif status in ["queued", "running"]:
                                elapsed_time += check_interval
                                time.sleep(check_interval)
                            else:
                                break
                        else:
                            break
        
        self.log("Indeed Jobs Scraper zero results fix testing completed")
        return True

    def print_summary(self):
        """Print test results summary"""
        self.log("\n" + "="*80)
        self.log("INDEED JOBS SCRAPER ZERO RESULTS FIX - TEST SUMMARY")
        self.log("="*80)
        
        total_passed = self.test_results["indeed_zero_results"]["passed"]
        total_failed = self.test_results["indeed_zero_results"]["failed"]
        total_tests = total_passed + total_failed
        
        self.log(f"Total Tests: {total_tests}")
        self.log(f"✅ Passed: {total_passed}")
        self.log(f"❌ Failed: {total_failed}")
        
        if self.test_results["indeed_zero_results"]["errors"]:
            self.log("\nErrors encountered:")
            for error in self.test_results["indeed_zero_results"]["errors"]:
                self.log(f"  - {error}")
        
        if total_failed == 0:
            self.log("\n🎉 ALL TESTS PASSED - Indeed Jobs Scraper zero results fix is working correctly!")
            self.log("✅ Scraper now shows 'FAILED' status when 0 results are found (instead of 'succeeded')")
        else:
            self.log(f"\n❌ {total_failed} TEST(S) FAILED - Issues found with zero results fix")

def main():
    """Run Indeed Jobs Scraper zero results fix test"""
    tester = IndeedJobsScraperTester()
    
    try:
        success = tester.test_indeed_jobs_scraper_zero_results_fix()
        tester.print_summary()
        
        if success and tester.test_results["indeed_zero_results"]["failed"] == 0:
            sys.exit(0)  # Success
        else:
            sys.exit(1)  # Failure
            
    except KeyboardInterrupt:
        tester.log("\n❌ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        tester.log(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()