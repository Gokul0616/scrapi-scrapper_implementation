#!/usr/bin/env python3
"""
Debug script to test global chat responses
"""

import requests
import json

# Get backend URL from environment
BACKEND_URL = "https://indeed-bot-bypass.preview.emergentagent.com/api"

def test_chat_response():
    # First authenticate
    login_data = {
        "username": "testuser_scrapi",
        "password": "SecurePass123!"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print("Authentication failed")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test natural language run creation
    test_messages = [
        "run google maps scraper for Hotels in New York with max 50 results",
        "scrape restaurants in San Francisco"
    ]
    
    for message in test_messages:
        print(f"\n=== Testing: {message} ===")
        
        chat_request = {"message": message}
        response = requests.post(f"{BACKEND_URL}/chat/global", json=chat_request, headers=headers)
        
        if response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            print(f"Response: {ai_response}")
            print(f"Length: {len(ai_response)} chars")
            
            # Check for run creation indicators
            if "run created successfully" in ai_response.lower():
                print("✅ Contains 'run created successfully'")
            elif "scraping run created" in ai_response.lower():
                print("✅ Contains 'scraping run created'")
            else:
                print("❌ No run creation confirmation found")
                
        else:
            print(f"Request failed: {response.status_code}")

if __name__ == "__main__":
    test_chat_response()