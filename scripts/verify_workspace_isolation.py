
import os
import sys
import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8001/api"
PERSONAL_USER = {
    "email": f"verify_personal_{int(time.time())}@example.com",
    "password": "Password123!",
    "username": f"user_{int(time.time())}",
    "first_name": "Test",
    "last_name": "User"
}

def log(msg, type="INFO"):
    print(f"[{type}] {msg}")

def run_verification():
    log("Starting Workspace Isolation Verification")
    
    # 1. Register User
    log("Registering user...")
    resp = requests.post(f"{BASE_URL}/auth/register", json=PERSONAL_USER)
    if resp.status_code != 200:
        log(f"Registration failed: {resp.text}", "ERROR")
        return
    token = resp.json()["access_token"]
    user_id = resp.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    log(f"User registered: {user_id}")

    # 2. Create Organization
    log("Creating organization...")
    org_data = {
        "name": f"test-org-{int(time.time())}",
        "display_name": "Test Organization",
        "description": "For verification",
        "billing_email": PERSONAL_USER["email"]
    }
    resp = requests.post(f"{BASE_URL}/organizations", json=org_data, headers=headers)
    if resp.status_code != 200:
        log(f"Org creation failed: {resp.text}", "ERROR")
        return
    org = resp.json()
    org_id = org["id"]
    log(f"Organization created: {org_id}")

    # Define Workspace Headers
    headers_personal = {
        "Authorization": f"Bearer {token}",
        "X-Workspace-Type": "personal",
        "X-Workspace-Id": user_id
    }
    
    headers_org = {
        "Authorization": f"Bearer {token}",
        "X-Workspace-Type": "organization",
        "X-Workspace-Id": org_id
    }

    # 3. Test Actor Isolation
    log("\n--- Testing Actor Isolation ---")
    
    # Create Actor in Personal
    actor_p_data = {"name": "Personal Actor", "description": "Personal", "category": "General"}
    resp = requests.post(f"{BASE_URL}/actors", json=actor_p_data, headers=headers_personal)
    if resp.status_code != 200:
        log(f"Personal actor creation failed: {resp.text}", "ERROR")
    actor_p_id = resp.json()["id"]
    log(f"Created Personal Actor: {actor_p_id}")

    # Create Actor in Org
    actor_o_data = {"name": "Org Actor", "description": "Org", "category": "General"}
    resp = requests.post(f"{BASE_URL}/actors", json=actor_o_data, headers=headers_org)
    if resp.status_code != 200:
        log(f"Org actor creation failed: {resp.text}", "ERROR")
    actor_o_id = resp.json()["id"]
    log(f"Created Org Actor: {actor_o_id}")

    # Verify Visibility
    resp = requests.get(f"{BASE_URL}/actors", headers=headers_personal)
    personal_actors = [a["id"] for a in resp.json()]
    if actor_p_id in personal_actors and actor_o_id not in personal_actors:
        log("✅ Personal workspace sees only personal actor")
    else:
        log(f"❌ Personal workspace visibility failed. Seen: {personal_actors}", "ERROR")

    resp = requests.get(f"{BASE_URL}/actors", headers=headers_org)
    org_actors = [a["id"] for a in resp.json()]
    if actor_o_id in org_actors and actor_p_id not in org_actors:
        log("✅ Org workspace sees only org actor")
    else:
        log(f"❌ Org workspace visibility failed. Seen: {org_actors}", "ERROR")

    # 4. Test Run Isolation
    log("\n--- Testing Run Isolation ---")
    
    # Create Run in Personal
    run_p_data = {"actor_id": actor_p_id, "input_data": {"url": "http://example.com"}}
    resp = requests.post(f"{BASE_URL}/runs", json=run_p_data, headers=headers_personal)
    if resp.status_code != 200:
        log(f"Personal run creation failed: {resp.text}", "ERROR")
        # Proceeding might fail if actor not found, which is good actually if cross-access denied
    else:
        run_p_id = resp.json()["id"]
        log(f"Created Personal Run: {run_p_id}")

        # Create Run in Org
        run_o_data = {"actor_id": actor_o_id, "input_data": {"url": "http://example.com"}}
        resp = requests.post(f"{BASE_URL}/runs", json=run_o_data, headers=headers_org)
        run_o_id = resp.json()["id"]
        log(f"Created Org Run: {run_o_id}")

        # Verify Visibility
        resp = requests.get(f"{BASE_URL}/runs", headers=headers_personal)
        personal_runs = [r["id"] for r in resp.json()["runs"]]
        if run_p_id in personal_runs and run_o_id not in personal_runs:
            log("✅ Personal workspace sees only personal run")
        else:
            log(f"❌ Personal workspace run visibility failed. Seen: {personal_runs}", "ERROR")

        resp = requests.get(f"{BASE_URL}/runs", headers=headers_org)
        org_runs = [r["id"] for r in resp.json()["runs"]]
        if run_o_id in org_runs and run_p_id not in org_runs:
            log("✅ Org workspace sees only org run")
        else:
            log(f"❌ Org workspace run visibility failed. Seen: {org_runs}", "ERROR")

    # 5. Test Schedule Isolation
    log("\n--- Testing Schedule Isolation ---")
    
    # Create Schedule in Personal
    sch_p_data = {
        "actor_id": actor_p_id,
        "name": "Personal Schedule",
        "cron_expression": "0 0 * * *",
        "input_data": {}
    }
    resp = requests.post(f"{BASE_URL}/schedules", json=sch_p_data, headers=headers_personal)
    sch_p_id = resp.json()["id"]
    log(f"Created Personal Schedule: {sch_p_id}")

    # Create Schedule in Org
    sch_o_data = {
        "actor_id": actor_o_id,
        "name": "Org Schedule",
        "cron_expression": "0 0 * * *",
        "input_data": {}
    }
    resp = requests.post(f"{BASE_URL}/schedules", json=sch_o_data, headers=headers_org)
    sch_o_id = resp.json()["id"]
    log(f"Created Org Schedule: {sch_o_id}")

    # Verify Visibility
    resp = requests.get(f"{BASE_URL}/schedules", headers=headers_personal)
    personal_schs = [s["id"] for s in resp.json()["schedules"]]
    if sch_p_id in personal_schs and sch_o_id not in personal_schs:
        log("✅ Personal workspace sees only personal schedule")
    else:
        log(f"❌ Personal workspace schedule visibility failed. Seen: {personal_schs}", "ERROR")

    resp = requests.get(f"{BASE_URL}/schedules", headers=headers_org)
    org_schs = [s["id"] for s in resp.json()["schedules"]]
    if sch_o_id in org_schs and sch_p_id not in org_schs:
        log("✅ Org workspace sees only org schedule")
    else:
        log(f"❌ Org workspace schedule visibility failed. Seen: {org_schs}", "ERROR")

    log("\nVerification Complete.")

if __name__ == "__main__":
    run_verification()
