import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
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
from app.models.models import StockArticle

@router.get("/news", response_model=List[NewsResponse])
def get_news(symbol: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(StockArticle)
    if symbol:
        query = query.filter(StockArticle.stock_symbol == symbol.upper())
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
def run_backtest(request: BacktestRequest, db: Session = Depends(get_db)):
    try:
        return BacktestEngine.run_backtest(request, db)
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

@router.get("/conversations/{conversation_id}/export")
def export_conversation_markdown(conversation_id: int, db: Session = Depends(get_db)):
    """Export the conversation thread to a beautifully formatted Markdown report."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == 1).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.asc()).all()
    
    md_content = f"# EQUITY.AI Research Report: {conv.title}\n"
    md_content += f"Generated on: {conv.updated_at.strftime('%Y-%m-%d %H:%M:%S')} UTC\n"
    if conv.target_symbol:
        md_content += f"Active Research Stock Context: **{conv.target_symbol}**\n"
    md_content += "\n---\n\n"
    
    import json
    for msg in messages:
        sender_label = "### USER QUERY" if msg.sender == "user" else "### COPILOT FINANCIAL EVALUATION"
        md_content += f"{sender_label}\n\n{msg.content}\n\n"
        
        # Injects source file lists and citations if present in meta
        if msg.meta_json and msg.sender == "assistant":
            try:
                meta = json.loads(msg.meta_json)
                sources = meta.get("sources", [])
                if sources:
                    md_content += "#### Verified Source Citations:\n"
                    for src in sources:
                        file_name = src.get("metadata", {}).get("source_file", "unknown")
                        page = src.get("metadata", {}).get("page_number", 0)
                        score = src.get("score", 0)
                        md_content += f"- **{file_name}** (p. {page}) — Match: {round(score * 100)}%\n"
                    md_content += "\n"
            except Exception:
                pass
        md_content += "---\n\n"
        
    import io
    buf = io.BytesIO(md_content.encode("utf-8"))
    
    return StreamingResponse(
        buf,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=Research_Report_{conversation_id}.md"}
    )

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
        custom_system_prompt=request.systemPrompt,
        source_file=request.sourceFile
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
        conversationId=str(conv.id),
        target_symbol=conv.target_symbol
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
                custom_system_prompt=request.systemPrompt,
                source_file=request.sourceFile
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
    import json
    report_data = json.loads(report_res.report_json) if report_res.report_json else {}
    report_dict = {
        "rating": report_res.rating,
        "score": report_res.score,
        "confidence_score": report_res.confidence_score,
        "report": report_data
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


@router.get("/search/global")
def global_semantic_search(
    query: str,
    stock_symbol: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Search across all stored corporate documents and news in vector database."""
    rag = RagService(db)
    results = rag.search_vector_db(query, stock_symbol=stock_symbol, limit=limit)
    return results


# 16. Alert Rules CRUD Endpoints
from app.models.models import AlertRule
from pydantic import BaseModel

class AlertRuleCreate(BaseModel):
    stock_symbol: str
    indicator: str
    operator: str
    threshold_value: float

@router.get("/alerts/rules")
def get_alert_rules(db: Session = Depends(get_db)):
    """List all custom alert rules."""
    return db.query(AlertRule).all()

@router.post("/alerts/rules")
def create_alert_rule(rule: AlertRuleCreate, db: Session = Depends(get_db)):
    """Create a new alert trigger rule."""
    db_rule = AlertRule(
        stock_symbol=rule.stock_symbol.upper(),
        indicator=rule.indicator,
        operator=rule.operator,
        threshold_value=rule.threshold_value,
        is_active=True
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.delete("/alerts/rules/{rule_id}")
def delete_alert_rule(rule_id: int, db: Session = Depends(get_db)):
    """Delete an active alert rule."""
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Alert rule deleted successfully"}


# 17. Notifications Endpoints
from app.models.models import Notification

@router.get("/notifications")
def get_notifications(limit: int = 20, db: Session = Depends(get_db)):
    """Retrieve warning and risk notifications."""
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(limit).all()

@router.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    """Mark a notification log as read."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "success"}


# 18. Stock Ingested Documents List
from app.models.models import CorporateDocument

@router.get("/stock/{symbol}/documents")
def get_stock_documents(symbol: str, db: Session = Depends(get_db)):
    """List all parsed files / annual reports / quarterly disclosures for a stock."""
    docs = db.query(CorporateDocument).filter(CorporateDocument.stock_symbol == symbol.upper()).all()
    # Unique file names
    unique_files = list(set([d.file_path.split(os.sep)[-1] for d in docs if d.file_path]))
    return unique_files

@router.post("/stock/{symbol}/upload-pdf")
async def upload_pdf(
    symbol: str,
    file: UploadFile = File(...),
    financial_year: Optional[int] = Form(None),
    quarter: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    import datetime
    if not financial_year:
        financial_year = datetime.datetime.now().year
        
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # Create data/documents folder if not exists
    doc_dir = os.path.join("backend", "data", "documents")
    os.makedirs(doc_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(doc_dir, f"{stock.symbol}_{file.filename}")
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {e}")
        
    # Ingest document
    from app.services.ingestion import IngestionEngine
    try:
        engine = IngestionEngine(db)
        source_type = "quarterly_result" if quarter else "annual_report"
        success = engine.ingest_document(
            file_path=file_path,
            stock_symbol=stock.symbol,
            source_type=source_type,
            financial_year=financial_year,
            quarter=quarter
        )
        if not success:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail="PDF ingestion failed during text extraction or vectorization.")
            
        return {
            "status": "success",
            "message": f"Successfully ingested and vectorized: {file.filename}",
            "filename": file.filename
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


# 20. Portfolio Holdings Manager
from pydantic import BaseModel, Field
from app.models.models import UserHolding, StockPriceHistory

class HoldingUpdate(BaseModel):
    stock_symbol: str
    shares: float = Field(..., ge=0)
    average_buy_price: float = Field(..., ge=0)

@router.get("/portfolio/holdings")
def get_portfolio_holdings(db: Session = Depends(get_db)):
    """Retrieve all user holdings and details."""
    holdings = db.query(UserHolding).filter(UserHolding.user_id == 1).all()
    result = []
    for h in holdings:
        # Get latest close price from history
        latest_price_entry = db.query(StockPriceHistory).filter(
            StockPriceHistory.stock_symbol == h.stock_symbol.upper()
        ).order_by(StockPriceHistory.date.desc()).first()
        current_price = latest_price_entry.close_price if latest_price_entry else h.average_buy_price
        
        cost = h.shares * h.average_buy_price
        market_value = h.shares * current_price
        pnl = market_value - cost
        pnl_pct = (pnl / cost * 100) if cost > 0 else 0.0
        
        result.append({
            "stock_symbol": h.stock_symbol,
            "shares": h.shares,
            "average_buy_price": h.average_buy_price,
            "current_price": current_price,
            "cost": round(cost, 2),
            "market_value": round(market_value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2)
        })
    return result

@router.post("/portfolio/holdings")
def update_portfolio_holding(req: HoldingUpdate, db: Session = Depends(get_db)):
    """Add or update a stock position in the user's holdings."""
    from app.models.models import PortfolioTransaction
    
    stock = db.query(Stock).filter(Stock.symbol == req.stock_symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock symbol {req.stock_symbol} not found in listing databases.")
        
    # Check if position already exists
    holding = db.query(UserHolding).filter(
        UserHolding.user_id == 1,
        UserHolding.stock_symbol == req.stock_symbol.upper()
    ).first()
    
    old_shares = holding.shares if holding else 0.0
    
    if req.shares == 0:
        if holding:
            # Clear position is a SELL of all old shares
            tx = PortfolioTransaction(
                user_id=1,
                stock_symbol=req.stock_symbol.upper(),
                transaction_type="SELL",
                shares=old_shares,
                price=holding.average_buy_price
            )
            db.add(tx)
            db.delete(holding)
            db.commit()
            return {"status": "deleted", "message": f"Position in {req.stock_symbol} cleared."}
        return {"status": "noop"}
        
    diff = req.shares - old_shares
    if diff != 0:
        tx_type = "BUY" if diff > 0 else "SELL"
        tx = PortfolioTransaction(
            user_id=1,
            stock_symbol=req.stock_symbol.upper(),
            transaction_type=tx_type,
            shares=abs(diff),
            price=req.average_buy_price
        )
        db.add(tx)

    if not holding:
        holding = UserHolding(
            user_id=1,
            stock_symbol=req.stock_symbol.upper(),
            shares=req.shares,
            average_buy_price=req.average_buy_price
        )
        db.add(holding)
    else:
        holding.shares = req.shares
        holding.average_buy_price = req.average_buy_price
        
    db.commit()
    return {"status": "success", "stock_symbol": holding.stock_symbol}


@router.delete("/portfolio/holdings/{symbol}")
def delete_portfolio_holding(symbol: str, db: Session = Depends(get_db)):
    """Delete a stock position from the holdings entirely."""
    holding = db.query(UserHolding).filter(
        UserHolding.user_id == 1,
        UserHolding.stock_symbol == symbol.upper()
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    db.delete(holding)
    db.commit()
    return {"status": "success", "message": f"Deleted holding for {symbol}."}

@router.get("/portfolio/analysis")
def get_portfolio_analysis(db: Session = Depends(get_db)):
    """Calculate aggregate portfolio analytics: total cost, current value, total P&L, and weights."""
    holdings = db.query(UserHolding).filter(UserHolding.user_id == 1).all()
    total_cost = 0.0
    total_value = 0.0
    
    breakdown = []
    for h in holdings:
        latest_price_entry = db.query(StockPriceHistory).filter(
            StockPriceHistory.stock_symbol == h.stock_symbol.upper()
        ).order_by(StockPriceHistory.date.desc()).first()
        current_price = latest_price_entry.close_price if latest_price_entry else h.average_buy_price
        
        cost = h.shares * h.average_buy_price
        value = h.shares * current_price
        
        total_cost += cost
        total_value += value
        
        breakdown.append({
            "symbol": h.stock_symbol,
            "value": round(value, 2)
        })
        
    pnl = total_value - total_cost
    pnl_pct = (pnl / total_cost * 100) if total_cost > 0 else 0.0
    
    # Calculate weights
    weights = {}
    for item in breakdown:
        weights[item["symbol"]] = round(item["value"] / total_value, 4) if total_value > 0 else 0.0
        
    return {
        "total_cost": round(total_cost, 2),
        "total_value": round(total_value, 2),
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
        "weights": weights
    }



# 19. Portfolio Optimization (MPT)
from app.services.portfolio_optimization import PortfolioOptimizer

@router.get("/portfolio/optimize")
def optimize_portfolio(symbols: str, db: Session = Depends(get_db)):
    """
    Run Modern Portfolio Theory (MPT) optimization on a list of comma-separated stock tickers.
    Returns optimal Sharpe weighting and Efficient Frontier metrics.
    """
    if not symbols:
        raise HTTPException(status_code=400, detail="Comma-separated 'symbols' parameter is required.")
    
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="Please provide at least 2 valid stock symbols for optimization.")
        
    try:
        return PortfolioOptimizer.optimize_portfolio(symbol_list, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 21. Portfolio Transactions & Sync Endpoints
from app.models.models import PortfolioTransaction

@router.get("/portfolio/transactions")
def get_portfolio_transactions(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve the log of all portfolio transactions."""
    txs = db.query(PortfolioTransaction).filter(
        PortfolioTransaction.user_id == 1
    ).order_by(PortfolioTransaction.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": t.id,
            "stock_symbol": t.stock_symbol,
            "transaction_type": t.transaction_type,
            "shares": t.shares,
            "price": t.price,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None
        }
        for t in txs
    ]

@router.post("/stocks/sync")
def trigger_live_stocks_sync(db: Session = Depends(get_db)):
    """Trigger a dynamic refresh of yfinance financial and technical metrics for all tracked stocks."""
    try:
        from app.worker.scheduler import MonthlyScheduler
        scheduler = MonthlyScheduler()
        scheduler._ensure_stock_metrics(db)
        return {"status": "success", "message": "Enriched stock metrics synced successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stock sync failed: {str(e)}")


# 22. Admin Commands Panel
from pydantic import BaseModel

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminMetricsUpdateRequest(BaseModel):
    # Financial metrics fields
    financial_year: Optional[int] = 2025
    revenue: Optional[float] = None
    revenue_growth: Optional[float] = None
    net_profit: Optional[float] = None
    profit_growth: Optional[float] = None
    roce: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None
    cash_flow_from_operations: Optional[float] = None
    promoter_holding: Optional[float] = None
    fii_holding: Optional[float] = None
    dii_holding: Optional[float] = None
    order_book: Optional[float] = None
    capex: Optional[float] = None
    free_cash_flow: Optional[float] = None
    ebitda: Optional[float] = None
    opm_pct: Optional[float] = None
    npm_pct: Optional[float] = None
    interest_coverage: Optional[float] = None
    debtor_days: Optional[int] = None
    inventory_turnover: Optional[float] = None
    promoter_pledged_pct: Optional[float] = None

    # Valuation metrics fields
    pe_ratio: Optional[float] = None
    ev_ebitda: Optional[float] = None
    peg_ratio: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None

    # Technical indicators fields
    rsi: Optional[float] = None
    macd: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    volume_breakout: Optional[bool] = None
    relative_strength: Optional[float] = None
    trend_strength: Optional[str] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    ema_200: Optional[float] = None
    beta: Optional[float] = None
    avg_volume_20d: Optional[float] = None


@router.post("/admin/login")
def admin_login(req: AdminLoginRequest):
    if req.username == "admin" and req.password == "admin123":
        return {"status": "success", "token": "admin-mock-token"}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")


@router.put("/admin/stock/{symbol}/metrics")
def update_stock_metrics(symbol: str, req: AdminMetricsUpdateRequest, db: Session = Depends(get_db)):
    # Verify stock exists
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    # 1. Update Financial Metrics (default year 2025)
    financial_year = req.financial_year or 2025
    fm = db.query(FinancialMetric).filter(
        FinancialMetric.stock_symbol == symbol.upper(),
        FinancialMetric.financial_year == financial_year
    ).first()
    if not fm:
        fm = FinancialMetric(stock_symbol=symbol.upper(), financial_year=financial_year)
        db.add(fm)

    financial_fields = [
        "revenue", "revenue_growth", "net_profit", "profit_growth", "roce", "roe",
        "debt_to_equity", "cash_flow_from_operations", "promoter_holding",
        "fii_holding", "dii_holding", "order_book", "capex", "free_cash_flow",
        "ebitda", "opm_pct", "npm_pct", "interest_coverage", "debtor_days",
        "inventory_turnover", "promoter_pledged_pct"
    ]
    updated_financial = []
    for field in financial_fields:
        val = getattr(req, field)
        if val is not None:
            setattr(fm, field, val)
            updated_financial.append(f"{field}={val}")

    # 2. Update Valuation Metrics
    vm = db.query(ValuationMetric).filter(ValuationMetric.stock_symbol == symbol.upper()).first()
    if not vm:
        vm = ValuationMetric(stock_symbol=symbol.upper())
        db.add(vm)

    valuation_fields = ["pe_ratio", "ev_ebitda", "peg_ratio", "fifty_two_week_high", "fifty_two_week_low"]
    updated_valuation = []
    for field in valuation_fields:
        val = getattr(req, field)
        if val is not None:
            setattr(vm, field, val)
            updated_valuation.append(f"{field}={val}")

    # 3. Update Technical Indicators
    from app.models.models import TechnicalIndicator
    ti = db.query(TechnicalIndicator).filter(TechnicalIndicator.stock_symbol == symbol.upper()).first()
    if not ti:
        ti = TechnicalIndicator(stock_symbol=symbol.upper())
        db.add(ti)

    technical_fields = [
        "rsi", "macd", "sma_50", "sma_200", "volume_breakout",
        "relative_strength", "trend_strength", "ema_20", "ema_50",
        "ema_200", "beta", "avg_volume_20d"
    ]
    updated_technical = []
    for field in technical_fields:
        val = getattr(req, field)
        if val is not None:
            setattr(ti, field, val)
            updated_technical.append(f"{field}={val}")

    # Log audit trail
    details = f"Updated metrics for {symbol.upper()}."
    if updated_financial:
        details += f" Financials: {', '.join(updated_financial)}."
    if updated_valuation:
        details += f" Valuation: {', '.join(updated_valuation)}."
    if updated_technical:
        details += f" Technical: {', '.join(updated_technical)}."

    audit_log = AuditLog(
        action="UPDATE_METRICS",
        target_type="STOCK",
        target_id=symbol.upper(),
        details=details
    )
    db.add(audit_log)
    db.commit()

    return {"status": "success", "message": f"Metrics for {symbol.upper()} updated successfully."}


@router.post("/admin/actions/scrape-all")
def trigger_scrape_all(db: Session = Depends(get_db)):
    try:
        from app.worker.scheduler import MonthlyScheduler
        
        def run_scrape():
            db_session = SessionLocal()
            try:
                scheduler = MonthlyScheduler()
                scheduler.scan_and_update()
            finally:
                db_session.close()
            
        # Log audit trail
        audit_log = AuditLog(
            action="TRIGGER_SCRAPER",
            target_type="SYSTEM",
            target_id="ALL",
            details="Manually triggered scrapers and document download updates."
        )
        db.add(audit_log)
        db.commit()
        
        import threading
        thread = threading.Thread(target=run_scrape)
        thread.start()
        
        return {"status": "success", "message": "Scraper dynamic sync job triggered in the background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger scraper: {str(e)}")


@router.post("/admin/actions/rebuild-db")
def trigger_rebuild_db(db: Session = Depends(get_db)):
    try:
        from app.services.ingestion import IngestionEngine
        from app.models.models import AnnualReport, CorporateDocument, StockArticle
        from app.core.config import settings
        from app.core.qdrant import qdrant_client, init_qdrant
        
        # 1. Sync stock database metrics from stocks.csv
        engine = IngestionEngine(db)
        stocks = engine.sync_stocks_from_csv()
        
        # 2. Clear tables
        db.query(AnnualReport).delete()
        db.query(CorporateDocument).delete()
        db.query(StockArticle).delete()
        db.commit()
        
        # 3. Recreate Qdrant Collection
        if qdrant_client:
            try:
                qdrant_client.delete_collection(settings.QDRANT_COLLECTION_NAME)
            except Exception:
                pass
            init_qdrant()
            
        # Log audit trail
        audit_log = AuditLog(
            action="REBUILD_DATABASE",
            target_type="SYSTEM",
            target_id="ALL",
            details=f"Purged all vector databases, document tables, and re-synced stocks list ({len(stocks)} stocks)."
        )
        db.add(audit_log)
        db.commit()
        
        return {"status": "success", "message": "SQLite document tables and Qdrant collections purged and rebuilt successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database rebuild failed: {str(e)}")








