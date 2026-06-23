import requests

url = "https://www.tcs.com/content/dam/tcs/investor-relations/financial-statements/2025-26/q1/Presentations/Q1%202025-26%20Fact%20Sheet.pdf"

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0"
}

print("Attempting simple request...")
res = requests.get(url, headers=headers, timeout=10)
print("Status code:", res.status_code)

if res.status_code == 403:
    print("403 Forbidden. Let's try with a session and additional browser headers...")
    session = requests.Session()
    session.headers.update(headers)
    # First hit the home page to get cookies
    session.get("https://www.tcs.com/", timeout=10)
    # Try fetching the PDF again
    res2 = session.get(url, timeout=10)
    print("Status code with session:", res2.status_code)
