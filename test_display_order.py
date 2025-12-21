#!/usr/bin/env python3
"""
Test script for display order validation and swap functionality
"""
import requests
import json

BASE_URL = "http://localhost:8001/api"

# You'll need to get a valid token from your admin console
# For testing, you can use curl or browser dev tools to get the token
TOKEN = "your_token_here"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_check_display_order():
    """Test the check-display-order endpoint"""
    print("\n=== Testing Check Display Order Endpoint ===")
    
    response = requests.get(f"{BASE_URL}/categories/check-display-order/0", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_max_display_order():
    """Test the max-display-order endpoint"""
    print("\n=== Testing Max Display Order Endpoint ===")
    
    response = requests.get(f"{BASE_URL}/categories/max-display-order", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_get_categories():
    """Get all categories"""
    print("\n=== Getting All Categories ===")
    
    response = requests.get(f"{BASE_URL}/categories", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        categories = response.json()
        print(f"Total categories: {len(categories)}")
        for cat in categories:
            print(f"  - {cat['name']}: display_order={cat['display_order']}")
        return categories
    else:
        print(f"Error: {response.text}")
        return []

def test_create_duplicate_order():
    """Test creating category with duplicate display order"""
    print("\n=== Testing Create with Duplicate Display Order ===")
    
    data = {
        "name": "Test Category",
        "description": "Testing duplicate order",
        "display_order": 0
    }
    
    response = requests.post(f"{BASE_URL}/categories", headers=headers, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_swap_display_order(category_id_1, category_id_2):
    """Test swapping display orders"""
    print("\n=== Testing Swap Display Order ===")
    
    data = {
        "category_id_1": category_id_1,
        "category_id_2": category_id_2
    }
    
    response = requests.post(f"{BASE_URL}/categories/swap-display-order", headers=headers, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    print("=" * 60)
    print("Display Order Validation & Swap Functionality Test")
    print("=" * 60)
    
    # Note: You need to set TOKEN variable above with a valid admin token
    if TOKEN == "your_token_here":
        print("\n⚠️  WARNING: You need to set a valid TOKEN in the script!")
        print("Get the token from localStorage in your browser after logging in to admin console")
        print("Then update TOKEN variable in this script")
    else:
        test_max_display_order()
        categories = test_get_categories()
        test_check_display_order()
        test_create_duplicate_order()
        
        if len(categories) >= 2:
            print("\n=== Would test swap between first two categories ===")
            print(f"Category 1: {categories[0]['name']} (order: {categories[0]['display_order']})")
            print(f"Category 2: {categories[1]['name']} (order: {categories[1]['display_order']})")
            # Uncomment to actually test swap:
            # test_swap_display_order(categories[0]['id'], categories[1]['id'])
