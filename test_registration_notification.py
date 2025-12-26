import requests
import os
import time
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env
load_dotenv('/app/backend/.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

def test_registration_notification():
    # 1. Register User
    url = "http://localhost:8001/api/auth/register"
    email = f"test_{int(time.time())}@example.com"
    payload = {
        "username": f"user_{int(time.time())}",
        "email": email,
        "password": "password123"
    }
    
    print(f"Registering user with email: {email}")
    response = requests.post(url, json=payload)
    
    if response.status_code != 200:
        print(f"Registration failed: {response.text}")
        return
        
    data = response.json()
    user_id = data['user']['id']
    print(f"User registered with ID: {user_id}")
    
    # 2. Check MongoDB for Notification
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Checking notifications collection...")
    notification = db.notifications.find_one({"user_id": user_id, "type": "welcome"})
    
    if notification:
        print("✅ SUCCESS: Welcome notification found!")
        print(f"Title: {notification.get('title')}")
        print(f"Message: {notification.get('message')}")
    else:
        print("❌ FAILURE: Welcome notification NOT found.")

if __name__ == "__main__":
    test_registration_notification()
