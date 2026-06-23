import os
import re
import csv
import hashlib
import datetime
import logging
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
from app.models.models import Stock, AnnualReport, AuditLog

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
                name = row.get("name", "").strip()
                if not symbol or not name:
                    continue
                
                # Check if stock exists
                stock = self.db.query(Stock).filter(Stock.symbol == symbol).first()
                if not stock:
                    stock = Stock(
                        symbol=symbol,
                        name=name,
                        sector=row.get("sector", "Unknown").strip(),
                        industry=row.get("industry", "Unknown").strip(),
                        market_cap=float(row.get("market_cap", 0.0)) if row.get("market_cap") else 0.0
                    )
                    self.db.add(stock)
                    logger.info(f"Added stock: {symbol} - {name}")
                else:
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

        # Handle versioning in Postgres
        # Check if an annual report/document already exists for this FY & Stock
        existing_reports = self.db.query(AnnualReport).filter(
            AnnualReport.stock_symbol == stock.symbol,
            AnnualReport.financial_year == financial_year
        ).order_by(AnnualReport.version.desc()).all()

        version = 1
        if existing_reports:
            # Mark old ones as not latest
            for rep in existing_reports:
                rep.is_latest = False
            version = existing_reports[0].version + 1

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
            target_type="annual_report",
            target_id=str(new_report.id),
            details=f"Ingested {os.path.basename(file_path)} for stock {stock.symbol} (FY{financial_year}, Version {version})"
        )
        self.db.add(audit)
        self.db.commit()
        return True
