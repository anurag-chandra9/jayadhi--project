import requests
import time

TARGET_URL = 'http://localhost:3000/auth/login'  # adjust if needed
ATTEMPTS = 110  # Go above 100 to trigger rate limit
DELAY_BETWEEN_REQUESTS = 0.1  # seconds

# Dummy credentials (optional - can also just hit any POST route)
payload = {
    "email": "randomuser@example.com",
    "password": "invalid123"
}

headers = {
    "Content-Type": "application/json"
}

print(f"🚀 Starting DoS Simulation: {ATTEMPTS} requests...")

for i in range(ATTEMPTS):
    try:
        response = requests.post(TARGET_URL, json=payload, headers=headers)
        print(f"[{i+1}] Status: {response.status_code} | Message: {response.json().get('message')}")
        
        if response.status_code == 429:
            print("🚫 Rate limit triggered. IP should be blocked soon.")
            break
        
        time.sleep(DELAY_BETWEEN_REQUESTS)

    except Exception as e:
        print(f"[{i+1}] Error: {str(e)}")
        break

print("✅ DoS simulation finished.")
