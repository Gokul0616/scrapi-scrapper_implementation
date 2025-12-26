import asyncio
import websockets
import requests
import json
import os
from dotenv import load_dotenv

# Load env
load_dotenv('/app/backend/.env')

async def test_websocket():
    # 1. Register/Login to get a token
    url = "http://localhost:8001/api/auth/login"
    # We need a valid user. Let's create one first.
    register_url = "http://localhost:8001/api/auth/register"
    email = f"ws_test_{int(os.urandom(4).hex(), 16)}@example.com"
    username = f"ws_user_{int(os.urandom(4).hex(), 16)}"
    
    print(f"Registering {username}...")
    reg_response = requests.post(register_url, json={
        "username": username,
        "email": email,
        "password": "password123"
    })
    
    if reg_response.status_code != 200:
        print(f"Registration failed: {reg_response.text}")
        return

    token = reg_response.json()['access_token']
    print(f"Got token: {token[:20]}...")

    # 2. Connect to WebSocket
    ws_url = f"ws://localhost:8001/api/notifications/ws?token={token}"
    print(f"Connecting to {ws_url}...")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket Connected!")
            
            # Wait for welcome notification
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"Received message: {message}")
                data = json.loads(message)
                if data.get('type') == 'new_notification' and data['notification']['type'] == 'welcome':
                    print("✅ Verified: Received welcome notification via WebSocket")
                else:
                    print(f"⚠️ Received something else: {data}")
            except asyncio.TimeoutError:
                print("❌ Timeout waiting for welcome message")
                
            # Send ping
            await websocket.send("ping")
            pong = await websocket.recv()
            print(f"Ping response: {pong}")
            
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
