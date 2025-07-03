import requests

url = "http://localhost:3000/auth/login"
payload = {
    "email": "<script>alert('xss')</script>",
    "password": "irrelevant"
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(f"Status Code: {response.status_code}")
print("Response:", response.json())
