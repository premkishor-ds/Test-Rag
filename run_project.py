import os
import sys
import shutil
import subprocess
import time
import csv

def run_project():
    print("=====================================================================")
    print("                AUTOMATED STOCK MARKET RAG SETUP & RUN               ")
    print("=====================================================================")
    
    # Paths
    project_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(project_root, "backend")
    frontend_dir = os.path.join(project_root, "frontend")
    python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    pip_exe = os.path.join(backend_dir, ".venv", "Scripts", "pip.exe")
    
    # 1. Install dependencies
    print("\n--- Step 1: Installing Python Dependencies ---")
    if os.path.exists(pip_exe):
        try:
            requirements_txt = os.path.join(backend_dir, "requirements.txt")
            subprocess.run([pip_exe, "install", "-r", requirements_txt], check=True)
            print("[SUCCESS] Python dependencies installed.")
        except Exception as e:
            print(f"[ERROR] Failed to install python dependencies: {e}")
            return
    else:
        print("[ERROR] Virtual environment python/pip not found. Please create .venv in backend first.")
        return

    # 2. Sync stocks list using stocks.csv
    print("\n--- Step 2: Using stocks.csv as Source of Truth ---")
    stocks_csv = os.path.join(backend_dir, "data", "stocks.csv")
    if os.path.exists(stocks_csv):
        print(f"Loading stocks configuration directly from: {stocks_csv}")
    else:
        print(f"[ERROR] stocks.csv not found at {stocks_csv}")
        return

    # 3. Rename AEROENTER to AEROFLEX in documents
    print("\n--- Step 3: Renaming AEROENTER to AEROFLEX PDF Files ---")
    doc_dir = os.path.join(backend_dir, "data", "documents")
    if os.path.exists(doc_dir):
        renamed = 0
        for f in os.listdir(doc_dir):
            if "AEROENTER" in f:
                new_f = f.replace("AEROENTER", "AEROFLEX")
                shutil.move(os.path.join(doc_dir, f), os.path.join(doc_dir, new_f))
                print(f"  Renamed: {f} -> {new_f}")
                renamed += 1
        print(f"[SUCCESS] Renamed {renamed} files.")

    # 4. Clean duplicate data directories if any
    root_data = os.path.join(project_root, "data")
    if os.path.exists(root_data):
        print(f"\n--- Step 4: Deleting duplicate root data/ folder ---")
        try:
            shutil.rmtree(root_data)
            print("[SUCCESS] Duplicate root data folder deleted.")
        except Exception as e:
            print(f"[WARNING] Could not delete root data folder: {e}")

    # 5. Rebuild Database & Qdrant Collections
    print("\n--- Step 5: Clearing & Rebuilding database and Qdrant ---")
    rebuild_script = os.path.join(project_root, "backend", "app", "worker", "rebuild_helper.py")
    
    # We will write a helper to execute the database cleaning and stock sync
    helper_code = """
import os
import sys
import re
import glob

sys.path.append("backend")
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.qdrant import qdrant_client, init_qdrant
from app.services.ingestion import IngestionEngine
from app.models.models import AnnualReport, CorporateDocument, Stock

db = SessionLocal()
try:
    print("  Syncing stock database metrics from stocks.csv...")
    engine = IngestionEngine(db)
    stocks = engine.sync_stocks_from_csv()
    print(f"  Synced {len(stocks)} stocks.")
    
    print("  Clearing document tables in SQLite database...")
    db.query(AnnualReport).delete()
    db.query(CorporateDocument).delete()
    db.commit()
    print("  Database tables cleared.")
    
    if qdrant_client:
        print("  Recreating Qdrant collection...")
        try:
            qdrant_client.delete_collection(settings.QDRANT_COLLECTION_NAME)
        except Exception:
            pass
        init_qdrant()
        print("  Qdrant collection recreated successfully.")
except Exception as e:
    print(f"  [ERROR] Database/Qdrant prep failed: {e}")
finally:
    db.close()
"""
    helper_path = os.path.join(backend_dir, "rebuild_helper.py")
    with open(helper_path, "w", encoding="utf-8") as f:
        f.write(helper_code)
        
    subprocess.run([python_exe, helper_path], check=True)
    if os.path.exists(helper_path):
        os.remove(helper_path)

    # 6. Trigger Monthly Scheduler to Download and Ingest everything
    print("\n--- Step 6: Triggering Automated Download Pipeline ---")
    print("This will download all missing Annual Reports (last 3 years) and Quarterly Documents (last 8 quarters)")
    print("for all 11 listed stocks from Screener.in and BSE/NSE. Please wait...")
    
    download_helper_code = """
import os
import sys
sys.path.append("backend")
from app.worker.scheduler import MonthlyScheduler
try:
    scheduler = MonthlyScheduler()
    scheduler.scan_and_update()
    print("[SUCCESS] Automated downloader finished successfully.")
except Exception as e:
    print(f"[ERROR] Automated downloader failed: {e}")
"""
    download_helper_path = os.path.join(backend_dir, "download_helper.py")
    with open(download_helper_path, "w", encoding="utf-8") as f:
        f.write(download_helper_code)
        
    subprocess.run([python_exe, download_helper_path], check=True)
    if os.path.exists(download_helper_path):
        os.remove(download_helper_path)

    # 7. Start servers
    print("\n--- Step 7: Starting FastAPI Backend and Next.js Frontend ---")
    
    # Start Backend in background
    backend_log = open(os.path.join(project_root, "backend_server.log"), "w")
    backend_proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
        stdout=backend_log,
        stderr=backend_log
    )
    print("  FastAPI Backend started on http://localhost:8000 (logging to backend_server.log)")
    
    # Start Frontend in background
    frontend_log = open(os.path.join(project_root, "frontend_server.log"), "w")
    # Determine command based on OS (Windows uses shell=True for npm)
    frontend_proc = subprocess.Popen(
        "npm run dev",
        cwd=frontend_dir,
        stdout=frontend_log,
        stderr=frontend_log,
        shell=True
    )
    print("  Next.js Frontend started on http://localhost:3000 (logging to frontend_server.log)")
    
    # 8. Print final status
    print("\n=====================================================================")
    print("             SETUP COMPLETED & SERVERS RUNNING                       ")
    print("=====================================================================")
    print("  - Backend Server:  http://localhost:8000")
    print("  - Frontend App:    http://localhost:3000")
    print("  - Status Report:   To verify documents, run:")
    print("                     backend/.venv/Scripts/python.exe backend/check_download_status.py")
    print("=====================================================================")

if __name__ == "__main__":
    run_project()
