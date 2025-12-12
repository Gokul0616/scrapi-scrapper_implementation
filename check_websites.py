import requests

domains = ["idlbay.com", "alexida.com"]

for domain in domains:
    print(f"Checking {domain}...")
    try:
        response = requests.get(f"http://{domain}", timeout=5)
        print(f"  Status: {response.status_code}")
    except Exception as e:
        print(f"  Error: {e}")
