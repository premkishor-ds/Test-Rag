import os
import sys

# Add project root to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ingestion import fetch_and_save_pdf, fetch_corporate_document

def test_pdf_downloader():
    print("====================================================")
    print("Testing Automated PDF Downloader & Search Scraper")
    print("====================================================")
    
    # Initialize database tables
    from app.core.database import engine, Base
    import app.models.models
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
    
    test_symbol = "TCS"
    import datetime
    current_year = datetime.datetime.now().year
    target_years = [current_year - 2, current_year - 1, current_year]
    
    # 1. Test Annual Reports
    print("\n--- Testing Annual Reports ---")
    for test_year in target_years:
        print(f"\nExecuting fetch_and_save_pdf for {test_symbol} FY{test_year}...")
        downloaded_path = fetch_and_save_pdf(test_symbol, test_year)
        if downloaded_path and os.path.exists(downloaded_path):
            file_size = os.path.getsize(downloaded_path)
            print(f"[SUCCESS] Annual Report FY{test_year} downloaded: {downloaded_path} ({file_size / (1024*1024):.2f} MB)")
        else:
            print(f"[WARNING] Annual Report FY{test_year} download not found.")

    # 2. Test Quarterly Results, Concalls, Presentations
    print("\n--- Testing Quarterly Documents (Results, Concalls, Presentations) ---")
    target_quarter = "Q1"
    target_year = 2025
    doc_types = ["quarterly_result", "concall", "presentation"]
    
    for dtype in doc_types:
        print(f"\nExecuting fetch_corporate_document for {test_symbol} {dtype} {target_quarter} {target_year}...")
        downloaded_path = fetch_corporate_document(test_symbol, dtype, target_year, target_quarter)
        if downloaded_path and os.path.exists(downloaded_path):
            file_size = os.path.getsize(downloaded_path)
            print(f"[SUCCESS] {dtype} {target_quarter} {target_year} downloaded: {downloaded_path} ({file_size / (1024*1024):.2f} MB)")
        else:
            print(f"[WARNING] {dtype} {target_quarter} {target_year} download not found.")

if __name__ == "__main__":
    test_pdf_downloader()
