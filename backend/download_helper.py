
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
