import requests
from bs4 import BeautifulSoup
import re

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

symbols = ["TCS", "ATHERENERG", "AEROENTER", "WABAG", "E2E", "KMEW", "NETWEB", "SJS", "VINCOFE", "PREMEXPLN"]

for symbol in symbols:
    url = f"https://www.screener.in/company/{symbol}/"
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            print(f"\n=================== {symbol} ===================")
            # Find the Annual Reports section
            # Often it is under a div/section with header containing "Annual Reports" or "documents" or "analysis"
            # Let's search all links with "xml-data/corpfiling/AttachHis" or "/bseplus/AnnualReport/"
            found = 0
            for a in soup.find_all("a"):
                href = a.get("href", "")
                text = a.get_text().strip()
                if not href:
                    continue
                if "corpfiling/AttachHis" in href or "bseplus/AnnualReport" in href or "Annual-Report" in href or "annual-report" in href.lower():
                    # Parse the financial year if possible from the link text (e.g. "Financial Year 2024" or "Annual Report 2024")
                    year_match = re.search(r'(?:Financial\s+Year|FY|Annual\s+Report|20)\s*(\d{4})', text, re.IGNORECASE)
                    if not year_match:
                        year_match = re.search(r'(\d{4})', text)
                    year_str = year_match.group(1) if year_match else "unknown"
                    print(f"Year {year_str} | Href: {href} | Text: {text}")
                    found += 1
            if not found:
                print("No annual report links found on screener page.")
        else:
            print(f"\nFailed for {symbol}: Status {res.status_code}")
    except Exception as e:
        print(f"\nError for {symbol}: {e}")
