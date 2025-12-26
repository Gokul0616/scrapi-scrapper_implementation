import requests
import time
import os
import json

def test_notification_timezone():
    # 1. Register User
    url = "http://localhost:8001/api/auth/register"
    email = f"tz_test_{int(time.time())}@example.com"
    username = f"tz_user_{int(time.time())}"
    payload = {
        "username": username,
        "email": email,
        "password": "password123"
    }
    
    print(f"Registering user: {username}")
    response = requests.post(url, json=payload)
    if response.status_code != 200:
        print(f"Registration failed: {response.text}")
        return
        
    token = response.json()['access_token']
    
    # 2. Fetch Notifications
    notif_url = "http://localhost:8001/api/notifications"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Fetching notifications...")
    resp = requests.get(notif_url, headers=headers)
    
    if resp.status_code == 200:
        notifs = resp.json()
        for n in notifs:
            if n['type'] == 'welcome':
                print(f"✅ Notification Found. created_at: {n['created_at']}")
                # Check for timezone info (Z or +)
                if 'Z' in n['created_at'] or '+' in n['created_at']:
                    print("✅ Timestamp has timezone info.")
                else:
                    print("❌ Timestamp is NAIVE (missing timezone info).")
    else:
        print(f"Failed to fetch notifications: {resp.text}")

if __name__ == "__main__":
    test_notification_timezone()
