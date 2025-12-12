import requests
import json
import time

email = "gokul@gmail.com"
url = "http://localhost:8001/api/email-validation/validate"

print(f"Testing {email} against {url}...\n")

payload = {
    "email": email,
    "check_mx": True,
    "check_smtp": False,
    "enable_dynamic_checks": True
}

try:
    start_time = time.time()
    response = requests.post(url, json=payload)
    elapsed = time.time() - start_time
    
    print(f"--- Testing: {email} ---")
    if response.status_code == 200:
        data = response.json()
        print(f"Status: {response.status_code} (Time: {elapsed:.2f}s)")
        print(f"Valid: {data.get('is_valid')}")
        if not data.get('is_valid'):
            print(f"Errors: {data.get('errors')}")
        print(f"Warnings: {data.get('warnings')}")
        print(f"Checks: {json.dumps(data.get('checks'), indent=2)}")
    else:
        print(f"FAILED: Status {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"EXCEPTION: {e}")
