import requests

email = "invalid-format-email"
url = "http://localhost:8001/api/email-validation/validate"

print(f"Testing invalid format: {email}...\n")
try:
    response = requests.post(url, json={"email": email, "check_mx": False})
    print(response.json())
except Exception as e:
    print(e)
