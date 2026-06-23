import logging
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

from app.services.ingestion import search_internet_for_pdf_links, fetch_and_save_pdf

print("Starting Bing search test...")
query = "TCS annual report 2024 filetype:pdf"
links = search_internet_for_pdf_links(query)
print(f"Links found for '{query}':")
for link in links:
    print(" -", link)

print("\nTrying fetch_and_save_pdf for WABAG 2024...")
res = fetch_and_save_pdf("WABAG", 2024)
print("Result path:", res)
