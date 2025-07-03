import requests

urls = [
    "http://localhost:3000/admin",
    "http://localhost:3000/.env",
    "http://localhost:3000/phpMyAdmin"
]

for url in urls:
    response = requests.get(url)
    print(f"URL: {url} => {response.status_code}")
