#!/usr/bin/env python3
"""
Comprehensive Amazon Product Scraper Test
Tests all requirements from the review request
"""

import requests
import json
import time
from datetime import datetime

BACKEND_URL = "https://scrapper-error-fix.preview.emergentagent.com/api"

def log(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def authenticate():
    """Authenticate and get token"""
    login_data = {"username": "testuser_scrapi", "password": "password123"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def test_amazon_scraper_comprehensive():
    """Test Amazon Product Scraper comprehensively as requested"""
    log("=== COMPREHENSIVE AMAZON PRODUCT SCRAPER TESTING ===")
    
    # Step 1: Authentication
    log("Step 1: Authenticating...")
    token = authenticate()
    if not token:
        log("❌ Authentication failed")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    log("✅ Authentication successful")
    
    # Step 2: Actor Verification
    log("Step 2: Verifying Amazon Product Scraper actor...")
    response = requests.get(f"{BACKEND_URL}/actors", headers=headers)
    if response.status_code != 200:
        log("❌ Failed to get actors")
        return False
    
    actors = response.json()
    amazon_actor = None
    for actor in actors:
        if actor.get("name") == "Amazon Product Scraper":
            amazon_actor = actor
            break
    
    if not amazon_actor:
        log("❌ Amazon Product Scraper actor not found")
        return False
    
    log("✅ Amazon Product Scraper actor found")
    
    # Verify actor properties
    expected_props = {
        "icon": "📦",
        "category": "E-commerce"
    }
    
    for prop, expected in expected_props.items():
        actual = amazon_actor.get(prop)
        if actual == expected:
            log(f"✅ Actor {prop}: {actual}")
        else:
            log(f"❌ Actor {prop} mismatch - expected: {expected}, got: {actual}")
    
    # Verify input schema
    input_schema = amazon_actor.get("input_schema", {})
    required_fields = ["search_keywords", "max_results", "extract_reviews", "min_rating", "max_price"]
    
    if "properties" in input_schema:
        schema_props = input_schema["properties"]
        for field in required_fields:
            if field in schema_props:
                log(f"✅ Input schema has {field}")
            else:
                log(f"❌ Input schema missing {field}")
    
    # Step 3: Create Scraping Run
    log("Step 3: Creating Amazon scraping run...")
    log("  Parameters: search_keywords=['wireless mouse'], max_results=5, min_rating=4")
    
    run_data = {
        "actor_id": amazon_actor["id"],
        "input_data": {
            "search_keywords": ["wireless mouse"],
            "max_results": 5,
            "extract_reviews": False,
            "min_rating": 4
        }
    }
    
    response = requests.post(f"{BACKEND_URL}/runs", json=run_data, headers=headers)
    if response.status_code != 200:
        log(f"❌ Failed to create run: {response.status_code}")
        return False
    
    run = response.json()
    run_id = run["id"]
    log(f"✅ Run created: {run_id}")
    log(f"✅ Initial status: {run.get('status')}")
    
    # Step 4: Monitor Execution
    log("Step 4: Monitoring execution (max 2 minutes)...")
    max_wait = 120  # 2 minutes
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        response = requests.get(f"{BACKEND_URL}/runs/{run_id}", headers=headers)
        if response.status_code != 200:
            log("❌ Failed to get run status")
            return False
        
        run_status = response.json()
        status = run_status.get("status")
        logs = run_status.get("logs", [])
        
        # Show progress
        if logs:
            latest_log = logs[-1] if logs else ""
            if "🔍" in latest_log or "✅" in latest_log or "📊" in latest_log:
                log(f"Progress: {latest_log}")
        
        elapsed = int(time.time() - start_time)
        log(f"Status: {status} (elapsed: {elapsed}s)")
        
        if status == "succeeded":
            results_count = run_status.get("results_count", 0)
            log(f"✅ Scraping completed in {elapsed}s")
            log(f"✅ Results count: {results_count}")
            break
        elif status == "failed":
            error_msg = run_status.get("error_message", "Unknown error")
            log(f"❌ Scraping failed: {error_msg}")
            return False
        
        time.sleep(10)
    else:
        log("❌ Scraping timeout")
        return False
    
    # Step 5: Dataset Verification
    log("Step 5: Verifying dataset...")
    response = requests.get(f"{BACKEND_URL}/datasets/{run_id}/items", headers=headers)
    if response.status_code != 200:
        log(f"❌ Failed to get dataset: {response.status_code}")
        return False
    
    dataset_response = response.json()
    items = dataset_response.get("items", [])
    
    if not items:
        log("❌ No products in dataset")
        return False
    
    log(f"✅ Retrieved {len(items)} products")
    
    # Verify we got at least 3-5 products
    if len(items) >= 3:
        log(f"✅ At least 3 products extracted ({len(items)} found)")
    else:
        log(f"⚠️ Only {len(items)} products (expected 3-5)")
    
    # Step 6: Data Quality Verification
    log("Step 6: Verifying data quality...")
    
    required_fields = {
        "asin": "Amazon product ID (10 characters)",
        "title": "Product name",
        "price": "Price (number)",
        "rating": "Rating (0-5 stars)",
        "reviewCount": "Number of reviews",
        "url": "Amazon product URL",
        "images": "Array of image URLs",
        "category": "Product category",
        "seller": "Brand/seller name"
    }
    
    valid_products = 0
    
    for i, item in enumerate(items[:5]):  # Check first 5
        if "data" not in item:
            log(f"❌ Product {i+1}: Missing data field")
            continue
        
        data = item["data"]
        log(f"\n--- Product {i+1} Verification ---")
        log(f"Title: {data.get('title', 'N/A')[:50]}...")
        
        fields_found = 0
        critical_missing = []
        
        for field, description in required_fields.items():
            value = data.get(field)
            
            if field == "asin":
                if value and len(str(value)) == 10:
                    log(f"✅ {field}: {value}")
                    fields_found += 1
                else:
                    log(f"❌ {field}: Invalid ASIN - {value}")
                    critical_missing.append(field)
            elif field in ["price", "rating", "reviewCount"]:
                if isinstance(value, (int, float)) and value >= 0:
                    log(f"✅ {field}: {value}")
                    fields_found += 1
                else:
                    log(f"❌ {field}: Invalid number - {value}")
                    critical_missing.append(field)
            elif field == "images":
                if isinstance(value, list) and len(value) > 0:
                    valid_urls = sum(1 for url in value if isinstance(url, str) and url.startswith('http'))
                    log(f"✅ {field}: {len(value)} images ({valid_urls} valid URLs)")
                    fields_found += 1
                else:
                    log(f"❌ {field}: No valid images - {value}")
                    critical_missing.append(field)
            elif field == "url":
                if value and "amazon.com" in str(value):
                    log(f"✅ {field}: Valid Amazon URL")
                    fields_found += 1
                else:
                    log(f"❌ {field}: Invalid URL - {value}")
                    critical_missing.append(field)
            else:
                if value and str(value).strip():
                    log(f"✅ {field}: {str(value)[:30]}...")
                    fields_found += 1
                else:
                    log(f"❌ {field}: Missing or empty")
                    critical_missing.append(field)
        
        completeness = (fields_found / len(required_fields)) * 100
        log(f"Completeness: {fields_found}/{len(required_fields)} fields ({completeness:.1f}%)")
        
        if completeness >= 80:  # 80% completeness threshold
            valid_products += 1
            log("✅ Product data quality: GOOD")
        else:
            log("❌ Product data quality: POOR")
    
    log(f"\n=== FINAL RESULTS ===")
    log(f"Products extracted: {len(items)}")
    log(f"Valid products: {valid_products}/{min(5, len(items))}")
    
    # Step 7: Error Handling Test
    log("Step 7: Testing error handling...")
    
    invalid_run_data = {
        "actor_id": amazon_actor["id"],
        "input_data": {
            "search_keywords": [],  # Empty keywords
            "max_results": 5
        }
    }
    
    response = requests.post(f"{BACKEND_URL}/runs", json=invalid_run_data, headers=headers)
    if response.status_code == 200:
        # Check if run fails properly
        invalid_run = response.json()
        invalid_run_id = invalid_run["id"]
        
        # Wait a bit and check status
        time.sleep(15)
        response = requests.get(f"{BACKEND_URL}/runs/{invalid_run_id}", headers=headers)
        if response.status_code == 200:
            status_check = response.json()
            if status_check.get("status") == "failed":
                log("✅ Error handling: Empty keywords properly rejected")
            else:
                log("⚠️ Error handling: Run should have failed with empty keywords")
    
    # Summary
    success_rate = (valid_products / min(5, len(items))) * 100 if items else 0
    
    log(f"\n=== AMAZON SCRAPER TEST SUMMARY ===")
    log(f"✅ Actor verification: PASSED")
    log(f"✅ Run creation: PASSED")
    log(f"✅ Execution monitoring: PASSED")
    log(f"✅ Dataset retrieval: PASSED")
    log(f"✅ Data quality: {success_rate:.1f}% success rate")
    
    if success_rate >= 80:
        log("🎉 AMAZON SCRAPER: FULLY FUNCTIONAL")
        return True
    else:
        log("⚠️ AMAZON SCRAPER: NEEDS IMPROVEMENT")
        return False

if __name__ == "__main__":
    success = test_amazon_scraper_comprehensive()
    exit(0 if success else 1)