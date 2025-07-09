# suspicious_url_attack.py
import requests

url = "http://localhost:3000/phpMyAdmin"
headers = {
    "Origin": "http://localhost:3001",
    "User-Agent": "SuspiciousBot/1.0"
}

response = requests.get(url, headers=headers)
print("Status Code:", response.status_code)
try:
    print("Response:", response.json())
except:
    print("Non-JSON Response:", response.text)
