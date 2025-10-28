#!/usr/bin/env python3
"""
Simple test for Global Chat Assistant functionality
"""

import requests
import json

# Backend URL
BACKEND_URL = "https://amazon-scraper-3.preview.emergentagent.com/api"

def test_basic_chat():
    print("=== Testing Global Chat Assistant ===")
    
    # Step 1: Register/Login
    print("1. Registering user...")
    register_data = {
        "username": "testuser_chat",
        "email": "testuser_chat@scrapi.com",
        "password": "password123",
        "organization_name": "Test Org"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data, timeout=30)
    if response.status_code == 200:
        auth_data = response.json()
        token = auth_data.get("access_token")
        print("✅ Registration successful")
    else:
        # Try login if user exists
        print("Registration failed, trying login...")
        login_data = {
            "username": "testuser_chat",
            "password": "password123"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=30)
        if response.status_code != 200:
            print(f"❌ Both registration and login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        auth_data = response.json()
        token = auth_data.get("access_token")
        print("✅ Login successful")
    
    if not token:
        print("❌ No access token received")
        return
    
    # Step 2: Test basic chat
    print("\n2. Testing basic chat...")
    headers = {"Authorization": f"Bearer {token}"}
    chat_request = {"message": "Hello, what can you do?"}
    
    response = requests.post(f"{BACKEND_URL}/chat/global", json=chat_request, headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        chat_response = response.json()
        ai_response = chat_response.get("response", "")
        print(f"✅ Chat working - Response: {ai_response}")
        
        # Check for error messages
        if "encounter some issues" in ai_response.lower():
            print("❌ Chat returned 'encounter some issues' error")
        else:
            print("✅ No error messages detected")
            
    else:
        print(f"❌ Chat failed: {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    # Step 3: Test function calling
    print("\n3. Testing function calling...")
    data_request = {"message": "How many runs do I have?"}
    
    response = requests.post(f"{BACKEND_URL}/chat/global", json=data_request, headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        chat_response = response.json()
        ai_response = chat_response.get("response", "")
        print(f"✅ Function calling - Response: {ai_response}")
        
        # Check for numerical data
        import re
        numbers = re.findall(r'\b\d+\b', ai_response)
        if numbers:
            print(f"✅ Contains numerical data: {numbers}")
        else:
            print("⚠️ No numerical data found")
            
    else:
        print(f"❌ Function calling failed: {response.status_code}")
        print(f"Response: {response.text}")
    
    # Step 4: Test chat history
    print("\n4. Testing chat history...")
    response = requests.get(f"{BACKEND_URL}/chat/global/history", headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        history_data = response.json()
        history = history_data.get("history", [])
        print(f"✅ Chat history working - {len(history)} messages")
        
        if len(history) >= 2:
            print("✅ History contains multiple messages")
        else:
            print("⚠️ History may be empty")
            
    else:
        print(f"❌ Chat history failed: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_basic_chat()