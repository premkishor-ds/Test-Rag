from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database import get_db, SessionLocal
from app.models.models import Stock, FinancialMetric, ValuationMetric, News, AnalysisReport, AuditLog, SavedFilter, Conversation, ChatMessage
from app.schemas.schemas import (
    StockResponse, FinancialMetricResponse, ValuationMetricResponse,
    ScreenerFilterRequest, BacktestRequest, BacktestResponse,
    WatchlistCreate, WatchlistResponse, WatchlistItemCreate, WatchlistItemResponse,
    RagQueryRequest, RagQueryResponse, AnalysisReportResponse, NewsResponse,
    StockChatRequest, StockChatResponse, ConversationResponse, ChatMessageResponse, StockPriceHistoryResponse
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

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(db: Session = Depends(get_db)):
    """Retrieve all conversations for the user (default user_id=1)."""
    return db.query(Conversation).filter(Conversation.user_id == 1).order_by(Conversation.updated_at.desc()).all()

@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db)):
    """Retrieve all chat messages for a specific conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == 1).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.asc()).all()

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Delete a conversation and all its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == 1).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully"}

@router.post("/stock-chat", response_model=StockChatResponse)
def stock_chat(request: StockChatRequest, db: Session = Depends(get_db)):
    # Resolve or create conversation
    db_conv_id = None
    if request.conversationId:
        try:
            db_conv_id = int(request.conversationId)
        except ValueError:
            pass
            
    if db_conv_id:
        conv = db.query(Conversation).filter(Conversation.id == db_conv_id, Conversation.user_id == 1).first()
    else:
        conv = None
        
    if not conv:
        title = request.message[:30] + ("..." if len(request.message) > 30 else "")
        conv = Conversation(user_id=1, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
    # Save User message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        sender="user",
        content=request.message
    )
    db.add(user_msg)
    db.commit()

    chat_service = StockChatService(db)
    result = chat_service.process_chat(
        request.message,
        conversation_id=str(conv.id),
        model=request.model,
        temperature=request.temperature,
        top_k=request.topK,
        custom_system_prompt=request.systemPrompt
    )
    
    # Save Assistant response
    import json
    meta_str = None
    if result.get("sources") or result.get("scores") or result.get("comparison_table"):
        meta_str = json.dumps({
            "sources": result.get("sources"),
            "scores": result.get("scores"),
            "comparison_table": result.get("comparison_table")
        })
        
    assistant_msg = ChatMessage(
        conversation_id=conv.id,
        sender="assistant",
        content=result.get("answer", ""),
        meta_json=meta_str
    )
    db.add(assistant_msg)
    
    # Update conversation's updated_at timestamp
    import datetime
    conv.updated_at = datetime.datetime.utcnow()
    
    # Save audit log entry for the chat query
    try:
        audit = AuditLog(
            action="CHAT_QUERY",
            target_type="chat",
            target_id=str(conv.id),
            details=json.dumps({
                "message": request.message,
                "answer": result.get("answer", ""),
                "scores": result.get("scores", None)
            })
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        db.rollback()
        pass
        
    return StockChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        scores=result["scores"],
        comparison_table=result["comparison_table"],
        conversationId=str(conv.id)
    )

@router.post("/stock-chat/stream")
def stock_chat_stream(request: StockChatRequest, db: Session = Depends(get_db)):
    # Resolve or create conversation
    db_conv_id = None
    if request.conversationId:
        try:
            db_conv_id = int(request.conversationId)
        except ValueError:
            pass
            
    if db_conv_id:
        conv = db.query(Conversation).filter(Conversation.id == db_conv_id, Conversation.user_id == 1).first()
    else:
        conv = None
        
    if not conv:
        title = request.message[:30] + ("..." if len(request.message) > 30 else "")
        conv = Conversation(user_id=1, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
    # Save User message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        sender="user",
        content=request.message
    )
    db.add(user_msg)
    db.commit()
    
    # Store local integer copy to avoid detached instance issues in the generator thread
    conv_id = conv.id

    def event_generator():
        import json
        import datetime
        
        full_response_text = ""
        metadata_received = None
        
        # Immediately yield conversationId so client knows where to store
        yield f"data: {json.dumps({'type': 'init', 'conversationId': str(conv_id)})}\n\n"
        
        # Fresh DB session for the duration of the generator execution
        generator_db = SessionLocal()
        try:
            chat_service = StockChatService(generator_db)
            for item in chat_service.process_chat_stream(
                request.message,
                conversation_id=str(conv_id),
                model=request.model,
                temperature=request.temperature,
                top_k=request.topK,
                custom_system_prompt=request.systemPrompt
            ):
                if item.get("type") == "text":
                    text = item.get("content", "")
                    full_response_text += text
                    yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
                elif item.get("type") == "metadata":
                    metadata_received = item
                    yield f"data: {json.dumps({'type': 'metadata', 'sources': item.get('sources'), 'scores': item.get('scores'), 'comparison_table': item.get('comparison_table')})}\n\n"
            
            # Save Assistant response inside the generator's session
            meta_str = None
            if metadata_received:
                sources = metadata_received.get("sources")
                scores = metadata_received.get("scores")
                comp_table = metadata_received.get("comparison_table")
                if sources or scores or comp_table:
                    meta_str = json.dumps({
                        "sources": sources,
                        "scores": scores,
                        "comparison_table": comp_table
                    })
            
            assistant_msg = ChatMessage(
                conversation_id=conv_id,
                sender="assistant",
                content=full_response_text,
                meta_json=meta_str
            )
            generator_db.add(assistant_msg)
            
            # Touch parent conversation update time
            p_conv = generator_db.query(Conversation).filter(Conversation.id == conv_id).first()
            if p_conv:
                p_conv.updated_at = datetime.datetime.utcnow()
                
            generator_db.commit()
        except Exception as e:
            generator_db.rollback()
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            generator_db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 11. Price History
from app.models.models import StockPriceHistory
@router.get("/stock/{symbol}/price-history", response_model=List[StockPriceHistoryResponse])
def get_stock_price_history(symbol: str, db: Session = Depends(get_db)):
    """Retrieve daily historical closing prices and volumes for a stock."""
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return db.query(StockPriceHistory).filter(StockPriceHistory.stock_symbol == symbol.upper()).order_by(StockPriceHistory.date.asc()).all()


# 12. Stock Articles
from app.models.models import StockArticle

@router.get("/stock/{symbol}/articles")
def get_stock_articles(
    symbol: str,
    limit: int = 50,
    source_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List fetched articles / news for a stock."""
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    q = db.query(StockArticle).filter(StockArticle.stock_symbol == symbol.upper())
    if source_type:
        q = q.filter(StockArticle.source_type == source_type)
    articles = q.order_by(StockArticle.fetched_at.desc()).limit(limit).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "source": a.source,
            "source_type": a.source_type,
            "sentiment": a.sentiment,
            "summary": a.summary,
            "published_date": a.published_date.isoformat() if a.published_date else None,
            "fetched_at": a.fetched_at.isoformat() if a.fetched_at else None,
            "is_vectorized": a.is_vectorized,
        }
        for a in articles
    ]


@router.post("/stock/{symbol}/articles/refresh")
def refresh_stock_articles(symbol: str, db: Session = Depends(get_db)):
    """Manually trigger a fresh article fetch for a stock."""
    import threading
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    def _run():
        from app.core.database import SessionLocal
        from app.services.article_fetcher import fetch_and_store_articles
        from app.services.ingestion import IngestionEngine
        bg_db = SessionLocal()
        try:
            bg_stock = bg_db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
            engine = IngestionEngine(bg_db)
            new_articles = fetch_and_store_articles(symbol.upper(), bg_stock.name, bg_db, limit=100)
            for article in new_articles:
                engine.ingest_article(article)
        finally:
            bg_db.close()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return {"status": "Article refresh started in background", "symbol": symbol.upper()}


# 13. PDF Report Export
from fastapi.responses import StreamingResponse
from app.services.pdf_exporter import generate_pdf_report
from app.services.rag import RagService
from app.services.analysis import AnalysisService

@router.get("/stock/{symbol}/export-pdf")
def export_stock_report_pdf(symbol: str, db: Session = Depends(get_db)):
    """Generate and download qualitative research PDF."""
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    rag = RagService(db)
    stock_data = rag.get_structured_stock_data(symbol)
    
    analysis_service = AnalysisService(db)
    report_res = analysis_service.get_latest_report(symbol)

    if not report_res:
        # Fallback if report has not been generated yet
        raise HTTPException(status_code=400, detail="Please generate the AI Research report first on the Analysis page before exporting.")
        
    # Standard format match ReportResult schema
    report_dict = {
        "rating": report_res.rating,
        "score": report_res.score,
        "confidence_score": report_res.confidence_score,
        "report": {
            "business_overview": report_res.business_overview,
            "revenue_analysis": report_res.revenue_analysis,
            "profit_analysis": report_res.profit_analysis,
            "cash_flow_analysis": report_res.cash_flow_analysis,
            "management_commentary_summary": report_res.management_commentary_summary,
            "opportunities": report_res.opportunities,
            "risks": report_res.risks,
            "bull_case": report_res.bull_case,
            "bear_case": report_res.bear_case,
            "final_investment_thesis": report_res.final_investment_thesis,
            "valuation_assessment": report_res.valuation_assessment,
        }
    }
    
    pdf_buf = generate_pdf_report(stock_data, report_dict)
    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Stock_Report_{symbol.upper()}.pdf"}
    )


# 14. Stock Comparison Endpoint
@router.get("/stocks/compare")
def compare_stocks(symbol_a: str, symbol_b: str, db: Session = Depends(get_db)):
    """Fetch comparative metrics for two stocks."""
    rag = RagService(db)
    data_a = rag.get_structured_stock_data(symbol_a)
    data_b = rag.get_structured_stock_data(symbol_b)
    if not data_a or not data_b:
        raise HTTPException(status_code=404, detail="One or both stock tickers not found")
    return {
        "stock_a": data_a,
        "stock_b": data_b
    }


