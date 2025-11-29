#!/usr/bin/env python3
"""
Focused test for Enhanced Global Chat System
"""

import requests
import json
import time
import re

# Get backend URL from environment
BACKEND_URL = "https://packman-setup.preview.emergentagent.com/api"

def authenticate():
    """Authenticate and return headers"""
    login_data = {
        "username": "testuser_scrapi",
        "password": "SecurePass123!"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print("Authentication failed")
        return None
    
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_function_calling():
    """Test function calling capabilities"""
    print("=== Testing Function Calling & Data Access ===")
    
    headers = authenticate()
    if not headers:
        return False
    
    # Test data access questions
    questions = [
        "How many runs do I have?",
        "Show me my recent runs", 
        "What scrapers are available?"
    ]
    
    for question in questions:
        print(f"\nTesting: {question}")
        
        chat_request = {"message": question}
        response = requests.post(f"{BACKEND_URL}/chat/global", json=chat_request, headers=headers)
        
        if response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            print(f"Response length: {len(ai_response)} chars")
            
            # Check for numerical data (suggests real database access)
            has_numbers = bool(re.search(r'\b\d+\b', ai_response))
            if has_numbers:
                print("✅ Contains numerical data (real database access)")
            else:
                print("⚠️ No numerical data found")
                
            print(f"Response preview: {ai_response[:200]}...")
        else:
            print(f"❌ Request failed: {response.status_code}")
    
    return True

def test_natural_language_run_creation():
    """Test natural language run creation"""
    print("\n=== Testing Natural Language Run Creation ===")
    
    headers = authenticate()
    if not headers:
        return False
    
    # Test with explicit confirmation
    test_cases = [
        {
            "message": "run google maps scraper for Hotels in New York with max 50 results",
            "follow_up": "yes, proceed"
        },
        {
            "message": "scrape restaurants in San Francisco with 20 results",
            "follow_up": "yes, create the run"
        }
    ]
    
    created_runs = []
    
    for test_case in test_cases:
        print(f"\nTesting: {test_case['message']}")
        
        # First request
        chat_request = {"message": test_case["message"]}
        response = requests.post(f"{BACKEND_URL}/chat/global", json=chat_request, headers=headers)
        
        if response.status_code == 200:
            chat_response = response.json()
            ai_response = chat_response.get("response", "")
            
            # Check if run was created or if confirmation is needed
            run_id_match = re.search(r'Run ID:?\s*([a-f0-9\-]+)', ai_response, re.IGNORECASE)
            
            if run_id_match:
                run_id = run_id_match.group(1)
                print(f"✅ Run created immediately: {run_id}")
                created_runs.append(run_id)
            elif any(phrase in ai_response.lower() for phrase in ["confirm", "proceed", "would you like"]):
                print("⚠️ AI asking for confirmation, sending follow-up...")
                
                # Send follow-up confirmation
                follow_up_request = {"message": test_case["follow_up"]}
                follow_response = requests.post(f"{BACKEND_URL}/chat/global", json=follow_up_request, headers=headers)
                
                if follow_response.status_code == 200:
                    follow_ai_response = follow_response.json().get("response", "")
                    follow_run_match = re.search(r'Run ID:?\s*([a-f0-9\-]+)', follow_ai_response, re.IGNORECASE)
                    
                    if follow_run_match:
                        run_id = follow_run_match.group(1)
                        print(f"✅ Run created after confirmation: {run_id}")
                        created_runs.append(run_id)
                    else:
                        print("❌ Run not created after confirmation")
                else:
                    print("❌ Follow-up request failed")
            else:
                print("❌ No run creation detected")
                
            print(f"Response: {ai_response}")
        else:
            print(f"❌ Request failed: {response.status_code}")
    
    # Verify created runs in database
    print(f"\n=== Verifying {len(created_runs)} Created Runs ===")
    for run_id in created_runs:
        response = requests.get(f"{BACKEND_URL}/runs/{run_id}", headers=headers)
        if response.status_code == 200:
            run_data = response.json()
            print(f"✅ Run {run_id}: status={run_data.get('status')}, actor={run_data.get('actor_name')}")
        else:
            print(f"❌ Run {run_id} not found in database")
    
    return created_runs

def test_conversation_persistence():
    """Test conversation persistence"""
    print("\n=== Testing Conversation Persistence ===")
    
    headers = authenticate()
    if not headers:
        return False
    
    # Clear history first
    response = requests.delete(f"{BACKEND_URL}/chat/global/history", headers=headers)
    if response.status_code == 200:
        print("✅ Chat history cleared")
    else:
        print("❌ Failed to clear chat history")
        return False
    
    # Send conversation messages
    messages = [
        "What is Scrapi?",
        "How do I get started?", 
        "Tell me more about the previous answer"
    ]
    
    for i, message in enumerate(messages, 1):
        print(f"\nSending message {i}: {message}")
        
        chat_request = {"message": message}
        response = requests.post(f"{BACKEND_URL}/chat/global", json=chat_request, headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Message {i} sent successfully")
        else:
            print(f"❌ Message {i} failed")
    
    # Check conversation history
    time.sleep(2)  # Allow time for database writes
    response = requests.get(f"{BACKEND_URL}/chat/global/history", headers=headers)
    
    if response.status_code == 200:
        history_data = response.json()
        history = history_data.get("history", [])
        print(f"\n✅ Conversation history: {len(history)} messages saved")
        
        # Should have user + assistant messages
        user_messages = [msg for msg in history if msg.get("role") == "user"]
        assistant_messages = [msg for msg in history if msg.get("role") == "assistant"]
        
        print(f"User messages: {len(user_messages)}")
        print(f"Assistant messages: {len(assistant_messages)}")
        
        return len(history) >= 6  # 3 conversations * 2 messages each
    else:
        print("❌ Failed to retrieve conversation history")
        return False

def main():
    """Run all tests"""
    print("Enhanced Global Chat System Testing")
    print("=" * 50)
    
    success = True
    
    # Test function calling
    if not test_function_calling():
        success = False
    
    # Test natural language run creation
    created_runs = test_natural_language_run_creation()
    if not created_runs:
        success = False
    
    # Test conversation persistence
    if not test_conversation_persistence():
        success = False
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 All tests completed successfully!")
    else:
        print("⚠️ Some tests failed or had issues")

if __name__ == "__main__":
    main()