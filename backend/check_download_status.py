import os
import sys
import sqlite3
import csv
import datetime

# Add project root to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def check_status():
    print("====================================================")
    print("        STOCK REPORT DOWNLOAD & INGESTION STATUS     ")
    print("====================================================")

    # 1. Resolve paths
    backend_root = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.abspath(os.path.join(backend_root, "data"))
    doc_dir = os.path.join(data_dir, "documents")
    stocks_csv = os.path.join(data_dir, "stocks.csv")
    db_path = os.path.join(data_dir, "stock_rag.db")

    print(f"Data Directory: {data_dir}")
    print(f"Documents Directory: {doc_dir}")
    print(f"Database Path: {db_path}")
    print(f"Stocks CSV: {stocks_csv}\n")

    # 2. Get list of stocks (using stocks.csv as the source of truth)
    symbols_set = set()
    if os.path.exists(stocks_csv):
        with open(stocks_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sym = row.get("symbol", "").strip().upper()
                if sym and sym not in ["GROWW", "UNLISTED"]:
                    symbols_set.add(sym)

    symbols = sorted(list(symbols_set))

    # 3. Connect to database
    db_exists = os.path.exists(db_path)
    db_reports = set()
    if db_exists:
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT stock_symbol, financial_year FROM annual_reports WHERE is_latest=1")
            for row in cursor.fetchall():
                db_reports.add((row[0], row[1]))
            conn.close()
        except Exception as e:
            print(f"[WARNING] Could not read database: {e}")

    # 4. Target years
    current_year = datetime.datetime.now().year
    target_years = [current_year - 2, current_year - 1, current_year] # [2024, 2025, 2026]

    # 5. Check each document
    print(f"{'Stock':<12} | {'Year':<6} | {'Status':<15} | {'File Size':<10} | {'DB Ingested':<12} | {'Notes':<30}")
    print("-" * 95)

    downloaded_count = 0
    pending_count = 0
    invalid_count = 0

    for symbol in symbols:
        for year in target_years:
            file_name = f"{symbol.upper()}_{year}_AnnualReport.pdf"
            
            # Check in both possible document folders (root data and backend data) for diagnostic purposes
            root_path = os.path.join(os.path.dirname(backend_root), "data", "documents", file_name)
            backend_path = os.path.join(doc_dir, file_name)
            
            # Find where the file is
            file_path = None
            location = ""
            if os.path.exists(backend_path):
                file_path = backend_path
                location = "backend/data"
            elif os.path.exists(root_path):
                file_path = root_path
                location = "root/data"
                
            status_str = "PENDING"
            size_str = "N/A"
            db_ingested = "NO"
            notes = ""

            if file_path:
                size_bytes = os.path.getsize(file_path)
                size_str = f"{size_bytes / (1024*1024):.2f} MB"
                
                # Check magic bytes
                is_valid_pdf = False
                try:
                    with open(file_path, "rb") as f:
                        magic = f.read(4)
                        if magic == b"%PDF" and size_bytes > 50000:
                            is_valid_pdf = True
                except Exception:
                    pass

                if is_valid_pdf:
                    status_str = "DOWNLOADED"
                    downloaded_count += 1
                else:
                    status_str = "INVALID / MOCK"
                    invalid_count += 1
                    notes = f"Bad PDF file ({size_str})"
                
                # Check DB status
                if (symbol, year) in db_reports:
                    db_ingested = "YES"
                
                if location == "root/data" and is_valid_pdf:
                    notes = "In root data folder (needs merge)"
            else:
                pending_count += 1
                notes = "File not found"

            print(f"{symbol:<12} | {year:<6} | {status_str:<15} | {size_str:<10} | {db_ingested:<12} | {notes:<30}")

    print("\nSummary:")
    print(f"  - Downloaded (Valid): {downloaded_count}")
    print(f"  - Invalid / Mock: {invalid_count}")
    print(f"  - Pending: {pending_count}")
    print("\nRun the implementation plan to merge directories and fix relative paths so all downloaded PDFs show as 'YES' for DB Ingestion.")

if __name__ == "__main__":
    check_status()
