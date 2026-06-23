import os
import sys
import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ingestion import fetch_and_save_pdf

symbols = ["TCS", "ATHERENERG", "AEROENTER", "WABAG", "E2E", "KMEW", "NETWEB", "SJS", "VINCOFE", "PREMEXPLN"]
current_year = datetime.datetime.now().year
target_years = [current_year - 2, current_year - 1, current_year]

print("====================================================")
print("Testing PDF Download for ALL stocks and years")
print("====================================================")

for symbol in symbols:
    print(f"\n--- {symbol} ---")
    for fy in target_years:
        print(f"Fetching {symbol} FY{fy}...")
        path = fetch_and_save_pdf(symbol, fy)
        if path and os.path.exists(path):
            size = os.path.getsize(path)
            print(f" [SUCCESS] Downloaded to {path} ({size / (1024*1024):.2f} MB)")
        else:
            print(f" [FAILED] Could not download {symbol} FY{fy}")
