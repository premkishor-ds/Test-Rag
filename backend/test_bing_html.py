import requests
from bs4 import BeautifulSoup
import urllib.parse

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "DNT": "1",
}

query = "TCS annual report 2024 filetype:pdf"
encoded_query = urllib.parse.quote_plus(query)
url = f"https://www.bing.com/search?q={encoded_query}"
print("Fetching url:", url)

res = requests.get(url, headers=headers)
print("Status code:", res.status_code)
if res.status_code == 200:
    soup = BeautifulSoup(res.text, "html.parser")
    print("Total links found:", len(soup.find_all("a")))
    pdf_links = []
    other_interesting = []
    for a in soup.find_all("a"):
        href = a.get("href", "")
        text = a.get_text().strip()
        if not href:
            continue
        if ".pdf" in href.lower() or "pdf" in text.lower():
            pdf_links.append((href, text))
        elif "bing.com/ck" in href:
            other_interesting.append((href, text))
            
    print("\nPDF links found in href or text:")
    for href, text in pdf_links[:20]:
        print(f"Href: {href}\nText: {text}\n---")
        
    print("\nBing redirect links found:")
    for href, text in other_interesting[:20]:
        print(f"Href: {href}\nText: {text}\n---")
        
    # Let's save a snippet of the HTML to see what the search results structure looks like
    with open("bing_results.html", "w", encoding="utf-8") as f:
        f.write(res.text)
    print("Saved html to bing_results.html")
