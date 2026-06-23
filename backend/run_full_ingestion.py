import os
import sys
import shutil
import sqlite3
import datetime
import csv
import logging

# Add project root to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.core.config import settings
from app.services.ingestion import IngestionEngine
from app.worker.scheduler import MonthlyScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def prepare_and_run():
    print("====================================================")
    print("      STEP 1: RESTORING STOCKS.CSV LIST             ")
    print("====================================================")
    
    backend_root = os.path.dirname(os.path.abspath(__file__))
    stocks_csv = os.path.join(backend_root, "data", "stocks.csv")
    doc_dir = os.path.join(backend_root, "data", "documents")
    
    # Restore stocks list to include TCS, E2E, and ATLANTAELE
    stocks_data = [
        {"symbol": "TCS", "name": "Tata Consultancy Services Limited", "sector": "Technology", "industry": "Information Technology Services", "market_cap": ""},
        {"symbol": "GROWW", "name": "Billionbrains Garage Ventures Limited", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "ATHERENERG", "name": "Ather Energy", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "AEROFLEX", "name": "Aeroflex Industries Limited", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "WABAG", "name": "VA Tech WABAG", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "E2E", "name": "E2E Networks", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "KMEW", "name": "Knowledge Marine & Engineering Works", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "NETWEB", "name": "Netweb Technologies India", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "SJS", "name": "SJS Enterprises", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "VINCOFE", "name": "Vintage Coffee and Beverages", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "PREMEXPLN", "name": "Premier Explosives", "sector": "", "industry": "", "market_cap": ""},
        {"symbol": "ATLANTAELE", "name": "Atlanta Electricals", "sector": "", "industry": "", "market_cap": ""}
    ]
    
    with open(stocks_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["symbol", "name", "sector", "industry", "market_cap"])
        writer.writeheader()
        for s in stocks_data:
            writer.writerow(s)
    print(f"Updated {stocks_csv} successfully with 12 stocks.")

    print("\n====================================================")
    print("      STEP 2: RENAMING AEROENTER TO AEROFLEX         ")
    print("====================================================")
    if os.path.exists(doc_dir):
        files = os.listdir(doc_dir)
        renamed = 0
        for f in files:
            if "AEROENTER" in f:
                new_f = f.replace("AEROENTER", "AEROFLEX")
                old_path = os.path.join(doc_dir, f)
                new_path = os.path.join(doc_dir, new_f)
                shutil.move(old_path, new_path)
                print(f"Renamed: {f} -> {new_f}")
                renamed += 1
        print(f"Renamed {renamed} files.")
    else:
        print("Documents directory does not exist yet.")

    print("\n====================================================")
    print("      STEP 3: RUNNING STOCK DATABASE SYNC            ")
    print("====================================================")
    db = SessionLocal()
    try:
        ingestion_engine = IngestionEngine(db)
        stocks = ingestion_engine.sync_stocks_from_csv()
        print(f"Synced {len(stocks)} stocks in database.")
    except Exception as e:
        print(f"Error syncing stocks: {e}")
    finally:
        db.close()

    print("\n====================================================")
    print("      STEP 4: RUNNING AUTOMATED DOCUMENT DOWNLOADS   ")
    print("====================================================")
    print("This will fetch missing Annual Reports and Quarterly documents...")
    try:
        scheduler = MonthlyScheduler()
        # Trigger the scan and update loop (which downloads all missing PDFs and ingests them)
        scheduler.scan_and_update()
        print("Scheduler process finished.")
    except Exception as e:
        print(f"Error running scheduler: {e}")

if __name__ == "__main__":
    prepare_and_run()
