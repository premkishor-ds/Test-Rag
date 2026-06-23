import requests
from bs4 import BeautifulSoup

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

url = "https://www.screener.in/company/E2E/"
print("Fetching company page:", url)
res = requests.get(url, headers=headers)
print("Status code:", res.status_code)
if res.status_code == 200:
    soup = BeautifulSoup(res.text, "html.parser")
    print("Screener company page successfully fetched.")
    # Look for annual reports section or any link with ".pdf"
    pdf_links = []
    for a in soup.find_all("a"):
        href = a.get("href", "")
        text = a.get_text().strip()
        if ".pdf" in href.lower() or "pdf" in text.lower():
            pdf_links.append((href, text))
            
    print(f"Found {len(pdf_links)} PDF-like links:")
    for href, text in pdf_links[:50]:
        # Walk up to find parent section or header
        parent = None
        for a in soup.find_all("a", href=href):
            curr = a.parent
            while curr and curr.name not in ["section", "div"] or (curr.name == "div" and not curr.get("id") and not curr.get("class")):
                curr = curr.parent
            if curr:
                parent = f"{curr.name} id={curr.get('id')} class={curr.get('class')}"
                # Let's also see if we can find a heading in that parent
                heading = curr.find(["h1", "h2", "h3", "h4", "h5", "h6"])
                if heading:
                    parent += f" [Heading: {heading.get_text().strip()}]"
        print(f" - Href: {href}\n   Text: {text}\n   Parent: {parent}\n---")
else:
    print("Failed to fetch Screener.in page. Body preview:")
    print(res.text[:500])
