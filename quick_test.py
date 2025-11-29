#!/usr/bin/env python3
"""
Quick test for Enhanced Global Chat System run creation
"""

import requests
import json
import re

# Get backend URL from environment
BACKEND_URL = "https://fullstack-scraper.preview.emergentagent.com/api"

def test_run_creation():
    # Authenticate
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
    message = "run google maps scraper for Hotels in New York with max 50 results"
    print(f"Testing: {message}")
    
    chat_request = {"message": message}
    response = requests.post(f"{BACKEND_URL}/chat/global", json=chat_request, headers=headers)
    
    if response.status_code == 200:
        chat_response = response.json()
        ai_response = chat_response.get("response", "")
        print(f"Response: {ai_response}")
        
        # Check for run creation indicators
        run_created = any(phrase in ai_response.lower() for phrase in [
            "run created successfully", "scraping run created", "successfully created",
            "run has been", "run id:", "created successfully"
        ])
        
        print(f"Run creation detected: {run_created}")
        
        # Test multiple regex patterns
        run_id_patterns = [
            r'Run ID:?\s*([a-f0-9\-]+)',
            r'\*\*Run ID:\*\*\s*([a-f0-9\-]+)',
            r'- \*\*Run ID:\*\*\s*([a-f0-9\-]+)'
        ]
        
        run_id_match = None
        for i, pattern in enumerate(run_id_patterns):
            match = re.search(pattern, ai_response, re.IGNORECASE)
            print(f"Pattern {i+1} ({pattern}): {'✅' if match else '❌'}")
            if match and not run_id_match:
                run_id_match = match
        
        if run_id_match:
            run_id = run_id_match.group(1)
            print(f"✅ Run ID extracted: {run_id}")
            
            # Verify run exists
            run_response = requests.get(f"{BACKEND_URL}/runs/{run_id}", headers=headers)
            if run_response.status_code == 200:
                run_data = run_response.json()
                print(f"✅ Run verified in database: status={run_data.get('status')}")
            else:
                print("❌ Run not found in database")
        else:
            print("❌ No run ID found")

if __name__ == "__main__":
    test_run_creation()