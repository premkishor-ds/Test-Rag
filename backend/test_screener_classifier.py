import requests
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Any, Optional

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

def extract_documents_from_screener(symbol: str) -> List[Dict[str, Any]]:
    url = f"https://www.screener.in/company/{symbol}/"
    documents = []
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code != 200:
            print(f"Failed to fetch screener for {symbol}: {res.status_code}")
            return []
            
        soup = BeautifulSoup(res.text, "html.parser")
        
        # We look for all PDF links
        for a in soup.find_all("a"):
            href = a.get("href", "")
            text = a.get_text().strip()
            if not href or not href.lower().endswith(".pdf") and ".pdf#" not in href.lower() and "AnnPdfOpen.aspx" not in href:
                continue
                
            href_lower = href.lower()
            text_lower = text.lower()
            
            # 1. Check if it is an Annual Report
            is_ar = False
            year = None
            
            # Screener pattern: "Financial Year 2025" or similar
            if "financial year" in text_lower:
                is_ar = True
                m = re.search(r'financial year\s*(\d{4})', text_lower)
                if m:
                    year = int(m.group(1))
            elif "annual_reports" in href_lower or "/annualreport/" in href_lower or "annual-report" in href_lower or "annualreport" in href_lower:
                is_ar = True
                # Try to extract year from href
                m = re.search(r'[_/-](20\d{2})[_/-]', href)
                if m:
                    year = int(m.group(1))
                else:
                    m = re.search(r'(20\d{2})', href)
                    if m:
                        year = int(m.group(1))
                        
            # 2. Check if it is a concall (transcript)
            is_concall = False
            if "transcript" in text_lower or "concall" in text_lower or "con-call" in text_lower or "earning call" in text_lower or "earnings call" in text_lower or "ec_transcript" in href_lower or "transcript" in href_lower:
                is_concall = True
                
            # 3. Check if it is a presentation
            is_presentation = False
            if "presentation" in text_lower or "ppt" in text_lower or "fact sheet" in text_lower or "factsheet" in text_lower or "investor presentation" in text_lower or "ip_" in href_lower or "presentation" in href_lower or "fact" in href_lower:
                is_presentation = True
                
            # 4. Check if it is a quarterly result
            is_result = False
            if "result" in text_lower or "financial result" in text_lower or "notes" in text_lower or "statement" in text_lower or "result" in href_lower:
                is_result = True
                
            # Try to determine quarter (Q1, Q2, Q3, Q4)
            quarter = None
            q_m = re.search(r'\b(q[1-4])\b', text_lower + " " + href_lower)
            if q_m:
                quarter = q_m.group(1).upper()
            else:
                # Try from month or other clues in href
                # e.g. June/July/Aug is Q1, Sep/Oct/Nov is Q2, Dec/Jan/Feb is Q3, Mar/Apr/May is Q4
                pass
                
            # Try to find year if not found yet
            if not year:
                # Look for a 4-digit number starting with 20
                y_m = re.search(r'\b(20\d{2})\b', text + " " + href)
                if y_m:
                    year = int(y_m.group(1))
                    
            doc_type = "other"
            if is_ar:
                doc_type = "annual_report"
            elif is_concall:
                doc_type = "concall"
            elif is_presentation:
                doc_type = "presentation"
            elif is_result:
                doc_type = "quarterly_result"
                
            documents.append({
                "symbol": symbol,
                "href": href,
                "text": text,
                "doc_type": doc_type,
                "year": year,
                "quarter": quarter
            })
    except Exception as e:
        print(f"Error extracting for {symbol}: {e}")
        
    return documents

symbols = ["TCS", "ATHERENERG", "WABAG", "E2E", "KMEW", "NETWEB", "SJS", "VINCOFE", "PREMEXPLN"]
for symbol in symbols:
    docs = extract_documents_from_screener(symbol)
    print(f"\n=================== {symbol} (Found {len(docs)} documents) ===================")
    for d in docs[:10]:
        print(f"Type: {d['doc_type']} | Year: {d['year']} | Q: {d['quarter']} | Text: {d['text']} | Href: {d['href']}")
