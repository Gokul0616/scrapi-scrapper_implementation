#!/usr/bin/env python3
"""
Debug specific issues found in backend testing
"""

import requests
import json
import time

BACKEND_URL = "https://visual-crawler-2.preview.emergentagent.com/api"

def test_actor_update_issue():
    """Debug the actor update 404 issue"""
    
    # First register/login to get token
    register_data = {
        "username": "debug_user_scrapi",
        "email": "debug@scrapi.com", 
        "password": "SecurePass123!",
        "organization_name": "Debug Org"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
    if response.status_code != 200:
        # Try login
        login_data = {"username": "debug_user_scrapi", "password": "SecurePass123!"}
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"Auth failed: {response.status_code}")
        return
        
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get actors
    response = requests.get(f"{BACKEND_URL}/actors", headers=headers)
    if response.status_code != 200:
        print(f"Get actors failed: {response.status_code}")
        return
        
    actors = response.json()
    print(f"Found {len(actors)} actors")
    
    if not actors:
        print("No actors found")
        return
        
    actor = actors[0]
    actor_id = actor["id"]
    print(f"Testing actor: {actor_id}")
    print(f"Actor user_id: {actor.get('user_id')}")
    print(f"Actor is_public: {actor.get('is_public')}")
    
    # Try to update the actor
    update_data = {"is_starred": True}
    response = requests.patch(f"{BACKEND_URL}/actors/{actor_id}", json=update_data, headers=headers)
    print(f"Update response: {response.status_code}")
    if response.status_code != 200:
        print(f"Update failed: {response.text}")
    else:
        print("Update successful!")

def test_scraping_with_playwright():
    """Test if scraping works now with Playwright installed"""
    
    # Register/login
    register_data = {
        "username": "scrape_test_user",
        "email": "scrapetest@scrapi.com", 
        "password": "SecurePass123!",
        "organization_name": "Scrape Test Org"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
    if response.status_code != 200:
        login_data = {"username": "scrape_test_user", "password": "SecurePass123!"}
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"Auth failed: {response.status_code}")
        return
        
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get actors
    response = requests.get(f"{BACKEND_URL}/actors", headers=headers)
    actors = response.json()
    
    if not actors:
        print("No actors found")
        return
        
    actor_id = actors[0]["id"]
    
    # Create a scraping run
    run_data = {
        "actor_id": actor_id,
        "input_data": {
            "search_terms": ["pizza restaurant"],
            "location": "New York, NY",
            "max_results": 3,
            "extract_reviews": False,
            "extract_images": False
        }
    }
    
    print("Creating scraping run...")
    response = requests.post(f"{BACKEND_URL}/runs", json=run_data, headers=headers)
    if response.status_code != 200:
        print(f"Create run failed: {response.status_code} - {response.text}")
        return
        
    run = response.json()
    run_id = run["id"]
    print(f"Created run: {run_id}")
    
    # Monitor for 60 seconds
    for i in range(12):  # 12 * 5 = 60 seconds
        time.sleep(5)
        response = requests.get(f"{BACKEND_URL}/runs/{run_id}", headers=headers)
        if response.status_code == 200:
            run_status = response.json()
            status = run_status.get("status", "unknown")
            print(f"Run status: {status}")
            
            if status == "succeeded":
                print("✅ Scraping completed successfully!")
                
                # Check dataset
                response = requests.get(f"{BACKEND_URL}/datasets/{run_id}/items", headers=headers)
                if response.status_code == 200:
                    items = response.json()
                    print(f"Retrieved {len(items)} items")
                    if items:
                        print("Sample item:", json.dumps(items[0]["data"], indent=2))
                break
            elif status == "failed":
                error = run_status.get("error_message", "Unknown error")
                print(f"❌ Scraping failed: {error}")
                break
        else:
            print(f"Failed to get run status: {response.status_code}")
            break

if __name__ == "__main__":
    print("=== Debugging Actor Update Issue ===")
    test_actor_update_issue()
    
    print("\n=== Testing Scraping with Playwright ===")
    test_scraping_with_playwright()