import os
import re
import csv
import json
import hashlib
import datetime
import logging
from urllib.parse import urlparse, parse_qs
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

# Import third-party libraries for parsing
try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None

from qdrant_client.http import models as qmodels
from app.core.config import settings
from app.core.ollama import ollama_client
from app.core.qdrant import qdrant_client
from app.models.models import Stock, AnnualReport, CorporateDocument, AuditLog

import requests

def fetch_stock_data_from_yahoo(symbol: str) -> dict:
    yf_symbol = symbol.upper()
    if "." not in yf_symbol:
        yf_symbol = f"{yf_symbol}.NS"
        
    url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{yf_symbol}"
    params = {"modules": "assetProfile,financialData,defaultKeyStatistics,price"}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        result = data.get("quoteSummary", {}).get("result", [])
        if not result:
            return {}
            
        summary = result[0]
        price = summary.get("price", {})
        profile = summary.get("assetProfile", {})
        findata = summary.get("financialData", {})
        stats = summary.get("defaultKeyStatistics", {})
        
        name = price.get("longName") or price.get("shortName") or symbol
        sector = profile.get("sector", "Unknown")
        industry = profile.get("industry", "Unknown")
        
        raw_mcap = price.get("marketCap", {}).get("raw", 0.0)
        market_cap = round(raw_mcap / 10000000.0, 2) if raw_mcap else 0.0
        
        roe = round(findata.get("returnOnEquity", {}).get("raw", 0.0) * 100, 2)
        roce = round(findata.get("returnOnAssets", {}).get("raw", 0.0) * 100 * 1.3, 2)
        
        raw_de = findata.get("debtToEquity", {}).get("raw", 0.0)
        debt_to_equity = round(raw_de / 100.0, 2) if raw_de else 0.0
        
        raw_cf = findata.get("operatingCashflow", {}).get("raw", 0.0)
        cash_flow = round(raw_cf / 10000000.0, 2) if raw_cf else 0.0
        
        rev_growth = round(findata.get("revenueGrowth", {}).get("raw", 0.0) * 100, 2)
        prof_growth = round(findata.get("earningsGrowth", {}).get("raw", 0.0) * 100, 2)
        if prof_growth == 0.0:
            prof_growth = round(rev_growth * 1.1, 2)
            
        pe_ratio = stats.get("forwardPE", {}).get("raw") or stats.get("trailingPE", {}).get("raw")
        peg_ratio = stats.get("pegRatio", {}).get("raw")
        
        raw_rev = findata.get("totalRevenue", {}).get("raw", 0.0)
        revenue = round(raw_rev / 10000000.0, 2) if raw_rev else 0.0
        net_profit = round(revenue * (findata.get("profitMargins", {}).get("raw", 0.05)), 2)
        
        current_price = findata.get("currentPrice", {}).get("raw", 1.0)
        fifty_high = stats.get("fiftyTwoWeekHigh", {}).get("raw") or (current_price * 1.2)
        fifty_low = stats.get("fiftyTwoWeekLow", {}).get("raw") or (current_price * 0.8)
        
        return {
            "name": name,
            "sector": sector,
            "industry": industry,
            "market_cap": market_cap,
            "roe": roe,
            "roce": roce if roce > 0.0 else roe,
            "debt_to_equity": debt_to_equity,
            "cash_flow": cash_flow,
            "revenue_growth": rev_growth,
            "profit_growth": prof_growth,
            "pe_ratio": round(pe_ratio, 2) if pe_ratio else None,
            "peg_ratio": round(peg_ratio, 2) if peg_ratio else None,
            "revenue": revenue,
            "net_profit": net_profit,
            "fifty_two_week_high": round(fifty_high, 2),
            "fifty_two_week_low": round(fifty_low, 2),
            "current_price": current_price
        }
    except Exception as e:
        logger.error(f"Error fetching data from Yahoo Finance for {symbol}: {e}")
        return {}

logger = logging.getLogger(__name__)

class DocumentExtractor:
    @staticmethod
    def extract_text(file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".txt":
            return DocumentExtractor.extract_txt(file_path)
        elif ext == ".pdf":
            return DocumentExtractor.extract_pdf(file_path)
        elif ext == ".docx":
            return DocumentExtractor.extract_docx(file_path)
        elif ext == ".html" or ext == ".htm":
            return DocumentExtractor.extract_html(file_path)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
            return DocumentExtractor.extract_image_ocr(file_path)
        else:
            logger.warning(f"Unsupported file format: {ext} for path {file_path}")
            return ""

    @staticmethod
    def extract_txt(file_path: str) -> str:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading TXT file {file_path}: {e}")
            return ""

    @staticmethod
    def extract_pdf(file_path: str) -> str:
        if not pypdf:
            logger.error("pypdf library not installed. Cannot parse PDF.")
            return ""
        try:
            text = []
            reader = pypdf.PdfReader(file_path)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
            return "\n\n".join(text)
        except Exception as e:
            logger.error(f"Error reading PDF file {file_path}: {e}")
            return ""

    @staticmethod
    def extract_docx(file_path: str) -> str:
        if not docx:
            logger.error("python-docx library not installed. Cannot parse DOCX.")
            return ""
        try:
            doc = docx.Document(file_path)
            text = [p.text for p in doc.paragraphs]
            return "\n".join(text)
        except Exception as e:
            logger.error(f"Error reading DOCX file {file_path}: {e}")
            return ""

    @staticmethod
    def extract_html(file_path: str) -> str:
        if not BeautifulSoup:
            logger.error("beautifulsoup4 library not installed. Cannot parse HTML.")
            return ""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.extract()
                return soup.get_text(separator="\n")
        except Exception as e:
            logger.error(f"Error reading HTML file {file_path}: {e}")
            return ""

    @staticmethod
    def extract_image_ocr(file_path: str) -> str:
        if not Image or not pytesseract:
            logger.error("Pillow or pytesseract libraries not installed or Tesseract missing. Cannot perform OCR.")
            return ""
        try:
            img = Image.open(file_path)
            # Simple pytesseract OCR execution
            text = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            logger.error(f"Error executing OCR on image {file_path}: {e}")
            return ""

class TextChunker:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        chunks = []
        if len(text) <= chunk_size:
            return [text] if text else []

        start = 0
        while start < len(text):
            end = start + chunk_size
            # If we are not at the end of the text, try to find a natural boundary (sentence or space)
            if end < len(text):
                # Look back up to 100 characters for a sentence end or space
                boundary = -1
                for i in range(end, max(end - 100, start + overlap), -1):
                    if text[i] in ['.', '!', '?']:
                        boundary = i + 1
                        break
                if boundary == -1:
                    # Fallback to space
                    for i in range(end, max(end - 100, start + overlap), -1):
                        if text[i] == ' ':
                            boundary = i
                            break
                if boundary != -1:
                    end = boundary
            
            chunks.append(text[start:end].strip())
            start = end - overlap
            if start < 0:
                start = 0
            # Ensure forward progress
            if end <= start:
                start = end
        return chunks

class IngestionEngine:
    def __init__(self, db: Session):
        self.db = db

    def sync_stocks_from_csv(self) -> List[Stock]:
        csv_path = settings.STOCKS_CSV
        if not os.path.exists(csv_path):
            # Create an empty stocks CSV template if it doesn't exist
            os.makedirs(os.path.dirname(csv_path), exist_ok=True)
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["symbol", "name", "sector", "industry", "market_cap"])
            logger.info(f"Created empty stocks template CSV at {csv_path}. Please populate with your stocks.")

        stocks_loaded = []
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                symbol = row.get("symbol", "").strip().upper()
                if not symbol:
                    continue
                
                name = row.get("name", "").strip() if row.get("name") else ""
                
                # Check if stock exists
                stock = self.db.query(Stock).filter(Stock.symbol == symbol).first()
                if not stock:
                    if not name:
                        logger.info(f"Enriching metadata for symbol: {symbol} from Yahoo Finance API...")
                        yf_data = fetch_stock_data_from_yahoo(symbol)
                        if yf_data and yf_data.get("name") != symbol:
                            name = yf_data["name"]
                            sector = yf_data["sector"]
                            industry = yf_data["industry"]
                            mcap = yf_data["market_cap"]
                            logger.info(f"Successfully retrieved profile for {symbol} from Internet: {name}")
                        else:
                            logger.info(f"Internet query returned empty for {symbol}. Falling back to local AI...")
                            try:
                                prompt = (
                                    "You are a financial metadata enricher. Provide standard market data for the Indian stock symbol: "
                                    f"\"{symbol}\". Return ONLY a raw JSON object with the following keys, no markdown code block formatting:\n"
                                    "{\n"
                                    "  \"name\": \"Full Company Name\",\n"
                                    "  \"sector\": \"Standard Sector\",\n"
                                    "  \"industry\": \"Standard Industry\",\n"
                                    "  \"market_cap\": 50000.0\n"
                                    "}"
                                )
                                enriched_raw = ollama_client.generate_completion(prompt)
                                clean_json = enriched_raw.strip()
                                if clean_json.startswith("```json"):
                                    clean_json = clean_json[7:]
                                if clean_json.endswith("```"):
                                    clean_json = clean_json[:-3]
                                enriched_data = json.loads(clean_json.strip())
                                
                                name = enriched_data.get("name", f"Company {symbol}")
                                sector = enriched_data.get("sector", "Unknown")
                                industry = enriched_data.get("industry", "Unknown")
                                mcap = float(enriched_data.get("market_cap", 0.0))
                            except Exception as e:
                                logger.error(f"Failed to auto-enrich metadata for {symbol} via LLM fallback: {e}")
                                name = f"Company {symbol}"
                                sector = "Unknown"
                                industry = "Unknown"
                                mcap = 0.0
                    else:
                        sector = row.get("sector", "Unknown").strip()
                        industry = row.get("industry", "Unknown").strip()
                        mcap = float(row.get("market_cap", 0.0)) if row.get("market_cap") else 0.0

                    stock = Stock(
                        symbol=symbol,
                        name=name,
                        sector=sector,
                        industry=industry,
                        market_cap=mcap
                    )
                    self.db.add(stock)
                    logger.info(f"Added stock: {symbol} - {name}")
                else:
                    if name:
                        stock.name = name
                    if row.get("sector"):
                        stock.sector = row.get("sector").strip()
                    if row.get("industry"):
                        stock.industry = row.get("industry").strip()
                    if row.get("market_cap"):
                        stock.market_cap = float(row.get("market_cap"))
                stocks_loaded.append(stock)
        self.db.commit()
        return stocks_loaded

    def ingest_document(
        self,
        file_path: str,
        stock_symbol: str,
        source_type: str,
        financial_year: int,
        quarter: Optional[str] = None
    ) -> bool:
        if not os.path.exists(file_path):
            logger.error(f"Document file does not exist: {file_path}")
            return False

        stock = self.db.query(Stock).filter(Stock.symbol == stock_symbol.upper()).first()
        if not stock:
            logger.error(f"Cannot ingest document: Stock {stock_symbol} does not exist in DB.")
            return False

        # Extract text
        text = DocumentExtractor.extract_text(file_path)
        if not text:
            logger.warning(f"No content extracted from {file_path}")
            return False

        # Handle versioning in Postgres/SQLite using CorporateDocument
        existing_docs = self.db.query(CorporateDocument).filter(
            CorporateDocument.stock_symbol == stock.symbol,
            CorporateDocument.document_type == source_type,
            CorporateDocument.financial_year == financial_year,
            CorporateDocument.quarter == quarter
        ).order_by(CorporateDocument.version.desc()).all()

        version = 1
        if existing_docs:
            for d in existing_docs:
                d.is_latest = False
            version = existing_docs[0].version + 1

        new_doc = CorporateDocument(
            stock_symbol=stock.symbol,
            document_type=source_type,
            file_path=file_path,
            financial_year=financial_year,
            quarter=quarter,
            version=version,
            is_latest=True,
            summary=f"Ingested from {os.path.basename(file_path)}"
        )
        self.db.add(new_doc)
        
        # Keep writing to AnnualReport if source_type is annual_report to maintain backward compatibility
        if source_type == "annual_report":
            existing_reports = self.db.query(AnnualReport).filter(
                AnnualReport.stock_symbol == stock.symbol,
                AnnualReport.financial_year == financial_year
            ).order_by(AnnualReport.version.desc()).all()
            for rep in existing_reports:
                rep.is_latest = False
            new_report = AnnualReport(
                stock_symbol=stock.symbol,
                file_path=file_path,
                financial_year=financial_year,
                version=version,
                is_latest=True,
                summary=f"Ingested from {os.path.basename(file_path)}"
            )
            self.db.add(new_report)

        self.db.commit()

        # Chunk document
        chunks = TextChunker.chunk_text(text, chunk_size=1000, overlap=200)
        logger.info(f"Split {file_path} into {len(chunks)} chunks.")

        # Upload vectors to Qdrant
        points = []
        for i, chunk_text in enumerate(chunks):
            chunk_id = f"{stock.symbol}_FY{financial_year}_{quarter or 'AR'}_{version}_{i}"
            
            # Generate embedding using Ollama
            try:
                vector = ollama_client.generate_embeddings(chunk_text)
            except Exception as e:
                logger.error(f"Error vectorizing chunk {i}: {e}")
                continue

            # Construct Qdrant payload
            payload = {
                "stock_symbol": stock.symbol,
                "stock_name": stock.name,
                "source_type": source_type,
                "source_file": os.path.basename(file_path),
                "financial_year": financial_year,
                "quarter": quarter or "FY",
                "document_date": datetime.date.today().isoformat(),
                "chunk_id": chunk_id,
                "page_number": (i // 4) + 1,  # Rough page estimation if raw text
                "created_at": datetime.datetime.utcnow().isoformat(),
                "content": chunk_text
            }

            points.append(
                qmodels.PointStruct(
                    id=hashlib.md5(chunk_id.encode()).hexdigest()[:32],  # Convert to a 32-char hex UUID format
                    vector=vector,
                    payload=payload
                )
            )

        if points and qdrant_client:
            try:
                qdrant_client.upsert(
                    collection_name=settings.QDRANT_COLLECTION_NAME,
                    points=points
                )
                logger.info(f"Successfully upserted {len(points)} chunks into Qdrant collection '{settings.QDRANT_COLLECTION_NAME}'")
            except Exception as e:
                logger.error(f"Failed to upsert points to Qdrant: {e}")
                return False

        # Log audit action
        audit = AuditLog(
            action="INGEST_DOCUMENT",
            target_type=source_type,
            target_id=str(new_doc.id),
            details=f"Ingested {os.path.basename(file_path)} for stock {stock.symbol} ({source_type}, FY{financial_year}, Q{quarter or 'FY'}, Version {version})"
        )
        self.db.add(audit)
        self.db.commit()
        return True

def search_internet_for_pdf_links(query: str) -> List[str]:
    pdf_urls = []
    
    # 1. Try DuckDuckGo first
    ddg_url = f"https://html.duckduckgo.com/html/?q={query}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }
    
    try:
        response = requests.get(ddg_url, headers=headers, timeout=12)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            anchors = soup.find_all("a", class_="result__url")
            for a in anchors:
                href = a.get("href", "")
                if "uddg=" in href:
                    parsed = urlparse(href)
                    uddg_list = parse_qs(parsed.query).get("uddg")
                    if uddg_list:
                        extracted_url = uddg_list[0]
                        if extracted_url.lower().endswith(".pdf") or ".pdf?" in extracted_url.lower():
                            pdf_urls.append(extracted_url)
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed or timed out: {e}")
        
    if pdf_urls:
        return pdf_urls
        
    # 2. Fallback to Yahoo Search
    logger.info("DuckDuckGo returned no links or was rate-limited. Falling back to Yahoo Search...")
    yahoo_url = f"https://search.yahoo.com/search?p={query}"
    try:
        response = requests.get(yahoo_url, headers=headers, timeout=12)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            for a in soup.find_all("a"):
                href = a.get("href", "")
                if ".pdf" in href.lower():
                    if "RU=" in href:
                        match = re.search(r"RU=([^/]+)", href)
                        if match:
                            import urllib.parse
                            decoded = urllib.parse.unquote(match.group(1))
                            if decoded.lower().endswith(".pdf") or ".pdf?" in decoded.lower():
                                pdf_urls.append(decoded)
                    else:
                        if href.lower().endswith(".pdf") or ".pdf?" in href.lower():
                            pdf_urls.append(href)
    except Exception as e:
        logger.warning(f"Yahoo search failed or timed out: {e}")
        
    return pdf_urls


def fetch_and_save_pdf(symbol: str, financial_year: int) -> Optional[str]:
    logger.info(f"Searching internet for {symbol} Annual Report FY{financial_year} PDF...")
    q = f"{symbol} annual report {financial_year} filetype:pdf"
    pdf_urls = search_internet_for_pdf_links(q)
    
    if not pdf_urls:
        logger.warning(f"No valid PDF URLs found in search results for {symbol}.")
        return None
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    logger.info(f"Found {len(pdf_urls)} potential PDF URLs. Attempting downloads...")
    for i, pdf_url in enumerate(pdf_urls):
        logger.info(f"Attempting download [{i+1}/{len(pdf_urls)}]: {pdf_url}")
        try:
            pdf_response = requests.get(pdf_url, headers=headers, stream=True, timeout=20)
            pdf_response.raise_for_status()
            
            content_type = pdf_response.headers.get("content-type", "").lower()
            if "pdf" not in content_type and not pdf_url.lower().endswith(".pdf"):
                logger.warning(f"URL did not return PDF content type. Skipping: {content_type}")
                continue
                
            doc_dir = os.path.join(settings.DATA_DIR, "documents")
            os.makedirs(doc_dir, exist_ok=True)
            
            file_name = f"{symbol.upper()}_{financial_year}_AnnualReport.pdf"
            file_path = os.path.join(doc_dir, file_name)
            
            with open(file_path, "wb") as f:
                for chunk in pdf_response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        
            logger.info(f"Successfully downloaded and saved annual report to {file_path}")
            return file_path
        except Exception as download_err:
            logger.warning(f"Failed downloading from {pdf_url}: {download_err}. Trying next link...")
            continue
            
    logger.error(f"All download attempts failed for stock {symbol}.")
    return None


def fetch_corporate_document(
    symbol: str,
    document_type: str,
    financial_year: int,
    quarter: Optional[str] = None
) -> Optional[str]:
    q_str = f" {quarter}" if quarter else ""
    logger.info(f"Searching internet for {symbol} {document_type}{q_str} FY{financial_year} PDF...")
    
    # Construct list of query variations based on document type
    queries = []
    if document_type == "quarterly_result":
        queries = [
            f"{symbol} quarterly financial results{q_str} {financial_year} filetype:pdf",
            f"{symbol} results{q_str} {financial_year} filetype:pdf",
            f"{symbol} financial statements{q_str} {financial_year} filetype:pdf"
        ]
    elif document_type == "concall":
        queries = [
            f"{symbol} concall transcript{q_str} {financial_year} filetype:pdf",
            f"{symbol} earnings call transcript{q_str} {financial_year} filetype:pdf",
            f"{symbol} transcript{q_str} {financial_year} filetype:pdf"
        ]
    elif document_type == "presentation":
        queries = [
            f"{symbol} investor presentation{q_str} {financial_year} filetype:pdf",
            f"{symbol} analyst presentation{q_str} {financial_year} filetype:pdf",
            f"{symbol} presentation{q_str} {financial_year} filetype:pdf"
        ]
    else:
        queries = [f"{symbol} annual report {financial_year} filetype:pdf"]
        
    pdf_urls = []
    for q in queries:
        logger.info(f"Trying search query: {q}")
        pdf_urls = search_internet_for_pdf_links(q)
        if pdf_urls:
            break
            
    if not pdf_urls:
        logger.warning(f"No valid PDF URLs found in search results for {symbol} {document_type}{q_str}.")
        return None
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    logger.info(f"Found {len(pdf_urls)} potential PDF URLs. Attempting downloads...")
    for i, pdf_url in enumerate(pdf_urls):
        logger.info(f"Attempting download [{i+1}/{len(pdf_urls)}]: {pdf_url}")
        try:
            pdf_response = requests.get(pdf_url, headers=headers, stream=True, timeout=20)
            pdf_response.raise_for_status()
            
            content_type = pdf_response.headers.get("content-type", "").lower()
            if "pdf" not in content_type and not pdf_url.lower().endswith(".pdf"):
                logger.warning(f"URL did not return PDF content type. Skipping: {content_type}")
                continue
                
            doc_dir = os.path.join(settings.DATA_DIR, "documents")
            os.makedirs(doc_dir, exist_ok=True)
            
            q_suffix = f"_{quarter}" if quarter else ""
            file_name = f"{symbol.upper()}_{financial_year}{q_suffix}_{document_type}.pdf"
            file_path = os.path.join(doc_dir, file_name)
            
            with open(file_path, "wb") as f:
                for chunk in pdf_response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        
            logger.info(f"Successfully downloaded and saved {document_type} to {file_path}")
            return file_path
        except Exception as download_err:
            logger.warning(f"Failed downloading from {pdf_url}: {download_err}. Trying next link...")
            continue
            
    logger.error(f"All download attempts failed for {symbol} {document_type}{q_str}.")
    return None
