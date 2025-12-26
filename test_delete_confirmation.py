import requests
import time
import os

def test_delete_account_confirmation():
    base_url = "http://localhost:8001/api"
    
    # 1. Register User
    username = f"del_user_{int(time.time())}"
    email = f"del_{int(time.time())}@example.com"
    password = "password123"
    
    print(f"Registering user: {email} / {username}")
    resp = requests.post(f"{base_url}/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    
    if resp.status_code != 200:
        print(f"Registration failed: {resp.text}")
        return
        
    token = resp.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Try deleting with USERNAME (should fail)
    print("Attempting delete with USERNAME (should fail)...")
    resp = requests.delete(f"{base_url}/settings/account", headers=headers, json={
        "confirmation_text": username,
        "password": password
    })
    
    if resp.status_code == 400 and "does not match your email" in resp.text:
        print("✅ Correctly rejected username confirmation.")
    else:
        print(f"❌ Unexpected response for username confirmation: {resp.status_code} {resp.text}")

    # 3. Try deleting with EMAIL (should success)
    print("Attempting delete with EMAIL (should succeed)...")
    resp = requests.delete(f"{base_url}/settings/account", headers=headers, json={
        "confirmation_text": email,
        "password": password
    })
    
    if resp.status_code == 200:
        print("✅ Account deletion scheduled successfully.")
        print(resp.json())
    else:
        print(f"❌ Delete failed with email: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    test_delete_account_confirmation()
