#!/usr/bin/env python3
"""
Debug Edge Case Tests - Check actual responses
"""

import requests
import json

BACKEND_URL = "https://jobdata-fixer.preview.emergentagent.com/api"

def test_invalid_login():
    print("=== Testing Invalid Login ===")
    response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "username": "nonexistent_user",
        "password": "wrong_password"
    })
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    print()

def test_missing_fields():
    print("=== Testing Missing Fields ===")
    response = requests.post(f"{BACKEND_URL}/auth/register", json={
        "username": "testuser"
    })
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    print()

def test_protected_endpoint():
    print("=== Testing Protected Endpoint ===")
    response = requests.get(f"{BACKEND_URL}/auth/me")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    print()

def test_invalid_actor_id():
    print("=== Testing Invalid Actor ID ===")
    # First login
    login_response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "username": "testuser_scrapi",
        "password": "SecurePass123!"
    })
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BACKEND_URL}/actors/invalid-uuid", headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    else:
        print("Could not login for test")
    print()

if __name__ == "__main__":
    test_invalid_login()
    test_missing_fields()
    test_protected_endpoint()
    test_invalid_actor_id()