"""
Ingestion API endpoints.

Provides:
  POST /ingest/upload    — Upload a PDF/TXT file and ingest it into the RAG pipeline
  POST /ingest/trigger   — Manually trigger internet download + ingestion for a stock/year
  GET  /ingest/documents — List all ingested CorporateDocuments
  GET  /ingest/status    — Summary of ingestion state across all stocks
"""

import os
import shutil
import tempfile
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Stock, CorporateDocument, AuditLog
from app.services.ingestion import (
    IngestionEngine,
    fetch_and_save_pdf,
    fetch_corporate_document,
)

router = APIRouter(prefix="/ingest", tags=["ingestion"])
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".html"}
VALID_DOC_TYPES = {"annual_report", "quarterly_result", "concall", "presentation"}


# ---------------------------------------------------------------------------
# POST /ingest/upload
# ---------------------------------------------------------------------------
@router.post("/upload", summary="Upload and ingest a document file")
async def upload_document(
    file: UploadFile = File(..., description="PDF, TXT, DOCX, or HTML document"),
    stock_symbol: str = Form(..., description="Stock ticker symbol, e.g. TCS"),
    document_type: str = Form(
        ...,
        description="One of: annual_report | quarterly_result | concall | presentation",
    ),
    financial_year: int = Form(..., description="Financial year, e.g. 2025"),
    quarter: Optional[str] = Form(
        None, description="Quarter label e.g. Q1, Q2, Q3, Q4 (omit for annual docs)"
    ),
    db: Session = Depends(get_db),
):
    # Validate document type
    if document_type not in VALID_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document_type '{document_type}'. Must be one of: {sorted(VALID_DOC_TYPES)}",
        )

    # Validate file extension
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    # Verify stock exists in DB
    symbol = stock_symbol.strip().upper()
    stock = db.query(Stock).filter(Stock.symbol == symbol).first()
    if not stock:
        raise HTTPException(
            status_code=404,
            detail=f"Stock '{symbol}' not found. Add it to stocks.csv first.",
        )

    # Save uploaded file to data/documents/
    doc_dir = os.path.join(settings.DATA_DIR, "documents")
    os.makedirs(doc_dir, exist_ok=True)
    q_suffix = f"_{quarter.upper()}" if quarter else ""
    dest_filename = f"{symbol}_{financial_year}{q_suffix}_{document_type}{ext.lower()}"
    dest_path = os.path.join(doc_dir, dest_filename)

    try:
        with open(dest_path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    # Run ingestion pipeline
    engine = IngestionEngine(db)
    success = engine.ingest_document(
        file_path=dest_path,
        stock_symbol=symbol,
        source_type=document_type,
        financial_year=financial_year,
        quarter=quarter.upper() if quarter else None,
    )

    if not success:
        raise HTTPException(
            status_code=422,
            detail="File was saved but ingestion into vector DB failed. Check backend logs.",
        )

    return {
        "status": "success",
        "message": f"Document ingested successfully.",
        "file": dest_filename,
        "stock_symbol": symbol,
        "document_type": document_type,
        "financial_year": financial_year,
        "quarter": quarter,
    }


# ---------------------------------------------------------------------------
# POST /ingest/trigger
# ---------------------------------------------------------------------------
@router.post("/trigger", summary="Trigger internet download + ingestion for a stock")
def trigger_download(
    stock_symbol: str,
    financial_year: int,
    document_type: str = "annual_report",
    quarter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if document_type not in VALID_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document_type. Must be one of: {sorted(VALID_DOC_TYPES)}",
        )

    symbol = stock_symbol.strip().upper()
    stock = db.query(Stock).filter(Stock.symbol == symbol).first()
    if not stock:
        raise HTTPException(
            status_code=404, detail=f"Stock '{symbol}' not found in DB."
        )

    logger.info(f"Manual ingestion trigger: {symbol} {document_type} FY{financial_year} Q{quarter or 'FY'}")

    # Download PDF
    if document_type == "annual_report":
        downloaded_path = fetch_and_save_pdf(symbol, financial_year)
    else:
        downloaded_path = fetch_corporate_document(
            symbol=symbol,
            document_type=document_type,
            financial_year=financial_year,
            quarter=quarter.upper() if quarter else None,
        )

    if not downloaded_path:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Could not find or download a PDF for {symbol} {document_type} "
                f"FY{financial_year}{f' {quarter}' if quarter else ''}. "
                "Try uploading the file manually via POST /ingest/upload."
            ),
        )

    # Ingest into RAG pipeline
    engine = IngestionEngine(db)
    success = engine.ingest_document(
        file_path=downloaded_path,
        stock_symbol=symbol,
        source_type=document_type,
        financial_year=financial_year,
        quarter=quarter.upper() if quarter else None,
    )

    if not success:
        raise HTTPException(
            status_code=422,
            detail="PDF downloaded but ingestion into vector DB failed. Check backend logs.",
        )

    return {
        "status": "success",
        "message": f"Successfully downloaded and ingested {document_type} for {symbol} FY{financial_year}.",
        "file_path": downloaded_path,
    }


# ---------------------------------------------------------------------------
# GET /ingest/documents
# ---------------------------------------------------------------------------
@router.get("/documents", summary="List all ingested documents")
def list_documents(
    stock_symbol: Optional[str] = None,
    document_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(CorporateDocument)
    if stock_symbol:
        query = query.filter(
            CorporateDocument.stock_symbol == stock_symbol.strip().upper()
        )
    if document_type:
        query = query.filter(CorporateDocument.document_type == document_type)

    docs = query.order_by(
        CorporateDocument.stock_symbol,
        CorporateDocument.financial_year.desc(),
    ).all()

    return [
        {
            "id": d.id,
            "stock_symbol": d.stock_symbol,
            "document_type": d.document_type,
            "financial_year": d.financial_year,
            "quarter": d.quarter,
            "version": d.version,
            "is_latest": d.is_latest,
            "file_path": d.file_path,
            "file_exists": os.path.exists(d.file_path),
            "uploaded_at": d.uploaded_at,
            "summary": d.summary,
        }
        for d in docs
    ]


# ---------------------------------------------------------------------------
# GET /ingest/status
# ---------------------------------------------------------------------------
@router.get("/status", summary="Ingestion status summary across all stocks")
def get_ingestion_status(db: Session = Depends(get_db)):
    stocks = db.query(Stock).all()
    summary = []

    for s in stocks:
        docs = (
            db.query(CorporateDocument)
            .filter(
                CorporateDocument.stock_symbol == s.symbol,
                CorporateDocument.is_latest == True,
            )
            .all()
        )

        doc_map = {}
        for d in docs:
            key = f"{d.document_type}_{d.financial_year}_{d.quarter or 'FY'}"
            doc_map[key] = {
                "document_type": d.document_type,
                "financial_year": d.financial_year,
                "quarter": d.quarter,
                "file_exists": os.path.exists(d.file_path),
                "uploaded_at": d.uploaded_at,
            }

        summary.append(
            {
                "symbol": s.symbol,
                "name": s.name,
                "total_documents": len(docs),
                "documents": list(doc_map.values()),
            }
        )

    return {
        "total_stocks": len(stocks),
        "stocks": summary,
    }
