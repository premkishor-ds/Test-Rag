from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.models.models import Stock, FinancialMetric, ValuationMetric, News, AnalysisReport, AuditLog, SavedFilter
from app.schemas.schemas import (
    StockResponse, FinancialMetricResponse, ValuationMetricResponse,
    ScreenerFilterRequest, BacktestRequest, BacktestResponse,
    WatchlistCreate, WatchlistResponse, WatchlistItemCreate, WatchlistItemResponse,
    RagQueryRequest, RagQueryResponse, AnalysisReportResponse, NewsResponse,
    StockChatRequest, StockChatResponse
)
from app.services.rag import RagService
from app.services.analysis import AnalysisService
from app.services.screener import ScreenerService
from app.services.backtest import BacktestEngine
from app.services.watchlist import WatchlistService
from app.services.stock_chat import StockChatService

router = APIRouter()

# 1. Stocks
@router.get("/stocks", response_model=List[StockResponse])
def get_stocks(db: Session = Depends(get_db)):
    return db.query(Stock).all()

@router.get("/stock/{symbol}", response_model=StockResponse)
def get_stock_by_symbol(symbol: str, db: Session = Depends(get_db)):
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

# 2. Financials and Metrics
@router.get("/financials", response_model=List[FinancialMetricResponse])
def get_financials(symbol: str, db: Session = Depends(get_db)):
    return db.query(FinancialMetric).filter(FinancialMetric.stock_symbol == symbol.upper()).all()

# 3. News
@router.get("/news", response_model=List[NewsResponse])
def get_news(symbol: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(News)
    if symbol:
        query = query.filter(News.stock_symbol == symbol.upper())
    return query.all()

# 4. Hybrid Search and RAG
@router.post("/vector-search")
def vector_search(request: RagQueryRequest, db: Session = Depends(get_db)):
    rag_service = RagService(db)
    return rag_service.search_vector_db(request.query, request.stock_symbol, request.limit)

@router.post("/rag-query", response_model=RagQueryResponse)
def rag_query(request: RagQueryRequest, db: Session = Depends(get_db)):
    rag_service = RagService(db)
    result = rag_service.execute_hybrid_query(request.query, request.stock_symbol)
    return RagQueryResponse(
        answer=result["answer"],
        source_documents=result["source_documents"]
    )

# 5. Analysis
@router.post("/analyze", response_model=AnalysisReportResponse)
def analyze_stock(request: Dict[str, str], db: Session = Depends(get_db)):
    symbol = request.get("stock_symbol")
    if not symbol:
        raise HTTPException(status_code=400, detail="stock_symbol is required")
    analysis_service = AnalysisService(db)
    try:
        return analysis_service.generate_analysis_report(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports", response_model=List[Dict[str, Any]])
def get_analysis_reports(symbol: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(AnalysisReport)
    if symbol:
        query = query.filter(AnalysisReport.stock_symbol == symbol.upper())
    reports = query.order_by(AnalysisReport.report_date.desc()).all()
    
    # Format response
    import json
    return [{
        "id": r.id,
        "stock_symbol": r.stock_symbol,
        "report_date": r.report_date,
        "rating": r.rating,
        "score": r.score,
        "confidence_score": r.confidence_score,
        "report": json.loads(r.report_json) if r.report_json else {}
    } for r in reports]

# 6. Screener
@router.post("/screener")
def run_screener(filters: ScreenerFilterRequest, db: Session = Depends(get_db)):
    screener_service = ScreenerService(db)
    return screener_service.execute_screener(filters)

# 7. Backtesting
@router.post("/backtest", response_model=BacktestResponse)
def run_backtest(request: BacktestRequest):
    try:
        return BacktestEngine.run_backtest(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 8. Watchlists
@router.post("/watchlist", response_model=WatchlistResponse)
def create_watchlist(request: WatchlistCreate, db: Session = Depends(get_db)):
    watchlist_service = WatchlistService(db)
    # Defaulting user_id=1 for demonstration/standard user
    return watchlist_service.create_watchlist(user_id=1, name=request.name)

@router.get("/watchlists", response_model=List[WatchlistResponse])
def get_watchlists(db: Session = Depends(get_db)):
    watchlist_service = WatchlistService(db)
    return watchlist_service.get_user_watchlists(user_id=1)

@router.delete("/watchlist/{watchlist_id}")
def delete_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    watchlist_service = WatchlistService(db)
    success = watchlist_service.delete_watchlist(user_id=1, watchlist_id=watchlist_id)
    if not success:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return {"message": "Watchlist deleted successfully"}

@router.post("/watchlist/{watchlist_id}/stock", response_model=WatchlistItemResponse)
def add_stock_to_watchlist(watchlist_id: int, request: WatchlistItemCreate, db: Session = Depends(get_db)):
    watchlist_service = WatchlistService(db)
    item = watchlist_service.add_stock(user_id=1, watchlist_id=watchlist_id, symbol=request.stock_symbol)
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist not found or stock already exists")
    return item

@router.delete("/watchlist/{watchlist_id}/stock/{symbol}")
def remove_stock_from_watchlist(watchlist_id: int, symbol: str, db: Session = Depends(get_db)):
    watchlist_service = WatchlistService(db)
    success = watchlist_service.remove_stock(user_id=1, watchlist_id=watchlist_id, symbol=symbol)
    if not success:
        raise HTTPException(status_code=404, detail="Watchlist or item not found")
    return {"message": "Stock removed from watchlist successfully"}

@router.get("/watchlist/{watchlist_id}/track")
def track_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    watchlist_service = WatchlistService(db)
    return watchlist_service.track_watchlist_changes(user_id=1, watchlist_id=watchlist_id)


# 9. Saved Screener Filters
@router.post("/screener/save")
def save_screener_filter(
    name: str,
    filters: ScreenerFilterRequest,
    db: Session = Depends(get_db)
):
    """Save a screener filter configuration under a given name."""
    screener_service = ScreenerService(db)
    saved = screener_service.save_filter(user_id=1, name=name, filters=filters)
    return {
        "id": saved.id,
        "name": saved.name,
        "created_at": saved.created_at,
        "filter": filters.model_dump()
    }

@router.get("/screener/saved")
def get_saved_screener_filters(db: Session = Depends(get_db)):
    """Retrieve all saved screener filter configurations."""
    screener_service = ScreenerService(db)
    saved_list = screener_service.get_saved_filters(user_id=1)
    import json
    return [
        {
            "id": s.id,
            "name": s.name,
            "created_at": s.created_at,
            "filter": json.loads(s.filter_json)
        }
        for s in saved_list
    ]

@router.delete("/screener/saved/{filter_id}")
def delete_saved_screener_filter(filter_id: int, db: Session = Depends(get_db)):
    """Delete a saved screener filter by ID."""
    saved = db.query(SavedFilter).filter(SavedFilter.id == filter_id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved filter not found")
    db.delete(saved)
    db.commit()
    return {"message": "Saved filter deleted successfully"}


# 10. Audit Logs
@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    action: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve the system audit trail. Optionally filter by action type."""
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if action:
        query = query.filter(AuditLog.action == action.upper())
    logs = query.limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details,
            "timestamp": l.timestamp,
        }
        for l in logs
    ]

# 11. Conversational Stock Chat
@router.post("/stock-chat", response_model=StockChatResponse)
def stock_chat(request: StockChatRequest, db: Session = Depends(get_db)):
    chat_service = StockChatService(db)
    result = chat_service.process_chat(request.message, request.conversationId)
    return StockChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        scores=result["scores"],
        comparison_table=result["comparison_table"]
    )
