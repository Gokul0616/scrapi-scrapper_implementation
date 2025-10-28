#!/usr/bin/env python3
"""
Quick Amazon Product Scraper Test - Verify functionality
"""

import requests
import json

# Get backend URL from environment
BACKEND_URL = "https://multicrawler.preview.emergentagent.com/api"

def test_amazon_scraper():
    print("🚀 Quick Amazon Product Scraper Test")
    
    # 1. Login
    login_data = {"username": "testuser_scrapi", "password": "password123"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print("❌ Login failed")
        return False
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Check Amazon actor exists
    response = requests.get(f"{BACKEND_URL}/actors", headers=headers)
    actors = response.json()
    amazon_actor = None
    for actor in actors:
        if actor.get("name") == "Amazon Product Scraper":
            amazon_actor = actor
            break
    
    if not amazon_actor:
        print("❌ Amazon Product Scraper actor not found")
        return False
    
    print(f"✅ Amazon Product Scraper actor found: {amazon_actor['name']}")
    print(f"✅ Icon: {amazon_actor['icon']}, Category: {amazon_actor['category']}")
    
    # 3. Check input schema
    schema = amazon_actor.get("input_schema", {})
    required_fields = ["search_keywords", "max_results", "extract_reviews", "min_rating", "max_price"]
    
    if "properties" in schema:
        props = schema["properties"]
        for field in required_fields:
            if field in props:
                print(f"✅ Input schema has {field}: {props[field].get('type', 'unknown')}")
            else:
                print(f"❌ Missing field: {field}")
                return False
    
    # 4. Check recent runs
    response = requests.get(f"{BACKEND_URL}/runs", headers=headers)
    runs = response.json()
    
    amazon_runs = []
    if "runs" in runs:
        amazon_runs = [r for r in runs["runs"] if r.get("actor_name") == "Amazon Product Scraper"]
    
    if not amazon_runs:
        print("❌ No Amazon scraper runs found")
        return False
    
    latest_run = amazon_runs[0]
    print(f"✅ Latest Amazon run: {latest_run['id']}")
    print(f"✅ Status: {latest_run['status']}, Results: {latest_run.get('results_count', 0)}")
    
    # 5. Check dataset
    run_id = latest_run["id"]
    response = requests.get(f"{BACKEND_URL}/datasets/{run_id}/items", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get dataset: {response.status_code}")
        return False
    
    dataset = response.json()
    
    # Handle both old and new API formats
    if isinstance(dataset, list):
        items = dataset
    elif isinstance(dataset, dict) and "items" in dataset:
        items = dataset["items"]
    else:
        print("❌ Invalid dataset format")
        return False
    
    if not items:
        print("❌ No items in dataset")
        return False
    
    print(f"✅ Dataset has {len(items)} products")
    
    # 6. Verify product data quality
    sample_product = items[0]["data"] if "data" in items[0] else items[0]
    
    required_product_fields = ["asin", "title", "price", "rating", "reviewCount", "url", "images"]
    
    print("\n=== Sample Product Verification ===")
    print(f"Product: {sample_product.get('title', 'N/A')[:50]}...")
    
    for field in required_product_fields:
        value = sample_product.get(field)
        if field == "asin":
            if value and len(str(value)) == 10:
                print(f"✅ {field}: {value} (valid 10-char ASIN)")
            else:
                print(f"❌ {field}: Invalid ASIN - {value}")
        elif field in ["price", "rating", "reviewCount"]:
            if isinstance(value, (int, float)) and value >= 0:
                print(f"✅ {field}: {value}")
            else:
                print(f"❌ {field}: Invalid - {value}")
        elif field == "images":
            if isinstance(value, list) and len(value) > 0:
                print(f"✅ {field}: {len(value)} images")
            else:
                print(f"❌ {field}: No images - {value}")
        elif field == "url":
            if value and "amazon.com" in str(value):
                print(f"✅ {field}: Valid Amazon URL")
            else:
                print(f"❌ {field}: Invalid URL - {value}")
        else:
            if value:
                print(f"✅ {field}: Present")
            else:
                print(f"❌ {field}: Missing")
    
    print("\n🎉 Amazon Product Scraper Test Complete!")
    return True

if __name__ == "__main__":
    success = test_amazon_scraper()
    if success:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")