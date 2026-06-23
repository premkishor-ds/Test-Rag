import re
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.ollama import ollama_client
from app.models.models import Stock, FinancialMetric, ValuationMetric, Conversation, ChatMessage
from app.services.rag import RagService

logger = logging.getLogger(__name__)

# Simple in-memory session memory mapping conversationId -> stock_symbol
CONVERSATION_MEMORY: Dict[str, str] = {}

class StockChatService:
    def __init__(self, db: Session):
        self.db = db
        self.rag_service = RagService(db)

    def detect_symbols(self, text: str) -> List[str]:
        text_upper = text.upper()
        # Find all matching listed stocks in DB
        stocks = self.db.query(Stock.symbol).all()
        detected = []
        for s in stocks:
            symbol = s[0]
            # Match boundary words or symbol within text
            pattern = rf"\b{re.escape(symbol)}\b"
            if re.search(pattern, text_upper) or symbol in text_upper:
                if symbol not in detected:
                    detected.append(symbol)
        return detected

    def calculate_scores(self, symbol: str) -> Dict[str, float]:
        stock = self.db.query(Stock).filter(Stock.symbol == symbol).first()
        if not stock:
            return {"business": 50, "financial": 50, "valuation": 50, "risk": 50, "overall": 50}

        metrics = self.db.query(FinancialMetric).filter(
            FinancialMetric.stock_symbol == symbol
        ).order_by(FinancialMetric.financial_year.desc()).first()

        valuation = self.db.query(ValuationMetric).filter(
            ValuationMetric.stock_symbol == symbol
        ).order_by(ValuationMetric.created_at.desc()).first()

        # 1. Financial Strength Score
        fin_score = 50
        if metrics:
            fin_score = 0
            # Revenue growth
            rev_g = metrics.revenue_growth or 0
            fin_score += min(max((rev_g / 30) * 25, 0), 25) # Max 25 pts for 30% growth
            # Profit growth
            prof_g = metrics.profit_growth or 0
            fin_score += min(max((prof_g / 30) * 25, 0), 25) # Max 25 pts
            # ROCE
            roce = metrics.roce or 0
            fin_score += min(max((roce / 25) * 30, 0), 30) # Max 30 pts for 25% ROCE
            # Debt level
            de = metrics.debt_to_equity or 0
            if de <= 0.5:
                fin_score += 20
            elif de <= 1.0:
                fin_score += 12
            elif de <= 2.0:
                fin_score += 5
        fin_score = round(min(max(fin_score, 10), 98), 1)

        # 2. Valuation Score
        val_score = 50
        if valuation and valuation.pe_ratio:
            pe = valuation.pe_ratio
            # Simple PE scoring: low PE relative to growth is better
            growth = (metrics.profit_growth or 10) if metrics else 10
            peg = pe / growth if growth > 0 else pe / 10
            if peg < 0.8:
                val_score = 90
            elif peg < 1.5:
                val_score = 75
            elif peg < 2.5:
                val_score = 55
            else:
                val_score = 35
        val_score = round(val_score, 1)

        # 3. Risk Score (lower score means HIGHER risk; score out of 100 where 100 is lowest risk)
        risk_score = 65
        if metrics:
            risk_score = 80
            de = metrics.debt_to_equity or 0
            if de > 1.5:
                risk_score -= 30
            elif de > 0.8:
                risk_score -= 15
            # Promoter holding drops
            prom = metrics.promoter_holding or 50
            if prom < 35:
                risk_score -= 15
        risk_score = round(min(max(risk_score, 15), 95), 1)

        # 4. Business Quality Score
        biz_score = 60
        if metrics:
            roce = metrics.roce or 0
            if roce > 20:
                biz_score += 20
            if (metrics.revenue or 0) > 1000:
                biz_score += 15
        biz_score = round(min(max(biz_score, 30), 95), 1)

        # 5. Overall Investment Score
        overall = round((biz_score + fin_score + val_score + (100 - risk_score)) / 4, 1)

        return {
            "business": biz_score,
            "financial": fin_score,
            "valuation": val_score,
            "risk": risk_score,
            "overall": overall
        }

    def generate_comparison_table(self, symbols: List[str]) -> List[Dict[str, Any]]:
        table = []
        for sym in symbols[:3]: # Limit to top 3 comparison
            stock = self.db.query(Stock).filter(Stock.symbol == sym).first()
            if not stock:
                continue
            metrics = self.db.query(FinancialMetric).filter(
                FinancialMetric.stock_symbol == sym
            ).order_by(FinancialMetric.financial_year.desc()).first()
            valuation = self.db.query(ValuationMetric).filter(
                ValuationMetric.stock_symbol == sym
            ).order_by(ValuationMetric.created_at.desc()).first()
            scores = self.calculate_scores(sym)

            table.append({
                "symbol": sym,
                "name": stock.name,
                "revenue_growth": f"{metrics.revenue_growth}%" if metrics and metrics.revenue_growth else "N/A",
                "roce": f"{metrics.roce}%" if metrics and metrics.roce else "N/A",
                "pe": valuation.pe_ratio if valuation and valuation.pe_ratio else "N/A",
                "debt_equity": metrics.debt_to_equity if metrics and metrics.debt_to_equity else "N/A",
                "score": scores["overall"]
            })
        return table

    def get_structured_context_string(self, symbol: str) -> str:
        data = self.rag_service.get_structured_stock_data(symbol)
        if not data:
            return ""
        return (
            f"### STRUCTURED MARKET & FINANCIAL DATA FOR {data.get('name')} ({data.get('symbol')}):\n"
            f"- Sector: {data.get('sector')} | Industry: {data.get('industry')}\n"
            f"- Market Capitalization: Rs. {data.get('market_cap')} Cr\n"
            f"- PE Ratio: {data.get('pe_ratio')} | EV/EBITDA: {data.get('ev_ebitda')} | PEG Ratio: {data.get('peg_ratio')}\n"
            f"- 52-Week Range: Rs. {data.get('fifty_two_week_low')} - {data.get('fifty_two_week_high')}\n"
            f"- Revenue: Rs. {data.get('revenue')} Cr (YoY Growth: {data.get('revenue_growth')}%)\n"
            f"- EBITDA: Rs. {data.get('ebitda')} Cr (OPM Margin: {data.get('opm_pct')}%)\n"
            f"- Net Profit: Rs. {data.get('net_profit')} Cr (YoY Growth: {data.get('profit_growth')}% | NPM Margin: {data.get('npm_pct')}%)\n"
            f"- ROCE: {data.get('roce')}% | ROE: {data.get('roe')}%\n"
            f"- Debt to Equity: {data.get('debt_to_equity')} | Interest Coverage Ratio: {data.get('interest_coverage')}\n"
            f"- Operating Cash Flow: Rs. {data.get('cash_flow')} Cr | Capital Expenditure (Capex): Rs. {data.get('capex')} Cr\n"
            f"- Free Cash Flow (FCF): Rs. {data.get('free_cash_flow')} Cr\n"
            f"- Shareholding: Promoters: {data.get('promoter_holding')}% (Pledged: {data.get('promoter_pledged_pct')}% of holdings) | FIIs: {data.get('fii_holding')}% | DIIs: {data.get('dii_holding')}%\n"
            f"- Efficiency Cycles: Debtor Days: {data.get('debtor_days')} days | Inventory Turnover Ratio: {data.get('inventory_turnover')}\n"
            f"- Order Book Size: Rs. {data.get('order_book')} Cr\n"
            f"- Technical Indicators: RSI(14): {data.get('rsi')} | Trend Strength: {data.get('trend_strength')} | Beta: {data.get('beta')}\n"
            f"- Moving Averages: EMA-20: Rs. {data.get('ema_20')} | EMA-50: Rs. {data.get('ema_50')} | EMA-200: Rs. {data.get('ema_200')}\n"
            f"- Average 20-Day Trading Volume: {data.get('avg_volume_20d')} shares\n\n"
        )

    def process_chat(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        top_k: Optional[int] = None,
        custom_system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        detected_symbols = self.detect_symbols(message)
        logger.info(f"Chat message: '{message}', detected: {detected_symbols}")

        active_symbol = None
        # Handle conversation memory context
        if conversation_id:
            if detected_symbols:
                active_symbol = detected_symbols[0]
                CONVERSATION_MEMORY[conversation_id] = active_symbol
            else:
                active_symbol = CONVERSATION_MEMORY.get(conversation_id)
        elif detected_symbols:
            active_symbol = detected_symbols[0]

        # Fetch history context
        history_context = ""
        if conversation_id:
            try:
                past_messages = self.db.query(ChatMessage).filter(
                    ChatMessage.conversation_id == conversation_id
                ).order_by(ChatMessage.created_at.desc()).limit(10).all()
                past_messages.reverse()
                if past_messages:
                    history_parts = []
                    for msg in past_messages:
                        sender_label = "User" if msg.sender == "user" else "Assistant"
                        history_parts.append(f"{sender_label}: {msg.content}")
                    history_context = "### PREVIOUS CONVERSATION HISTORY:\n" + "\n".join(history_parts) + "\n\n"
            except Exception as e:
                logger.error(f"Error fetching conversation history: {e}")

        # If no stock symbol is active or detected, run a standard conversational query through Ollama
        if not active_symbol and not detected_symbols:
            all_stocks = self.db.query(Stock).all()
            suggestions = [s.symbol for s in all_stocks[:4]]
            
            system_prompt = custom_system_prompt or (
                "You are EQUITY.AI, a premium AI stock research assistant. "
                "Answer the user's general conversational or financial question politely, accurately, and concisely. "
                "At the end of your response, if relevant, remind the user that they can ask you to run deep analyses "
                f"on specific stocks available in our database (such as {', '.join(suggestions)})."
            )
            full_prompt = history_context + message
            try:
                answer = ollama_client.generate_completion(
                    full_prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    model=model
                )
            except Exception as e:
                answer = f"Hello! I am your EQUITY.AI Stock Copilot. I encountered an issue querying the model node: {e}"
                
            return {
                "answer": answer,
                "sources": [],
                "scores": None,
                "comparison_table": None
            }

        # Handle comparison mode
        comparison_table = None
        if len(detected_symbols) >= 2:
            comparison_table = self.generate_comparison_table(detected_symbols)
            answer = (
                f"### Comparison Analysis: " + " vs ".join(detected_symbols) + "\n\n"
                "| Metric | " + " | ".join([item["symbol"] for item in comparison_table]) + " |\n"
                "| --- | " + " | ".join(["---"] * len(comparison_table)) + " |\n"
                "| **Revenue Growth** | " + " | ".join([str(item["revenue_growth"]) for item in comparison_table]) + " |\n"
                "| **ROCE** | " + " | ".join([str(item["roce"]) for item in comparison_table]) + " |\n"
                "| **P/E Ratio** | " + " | ".join([str(item["pe"]) for item in comparison_table]) + " |\n"
                "| **Debt to Equity** | " + " | ".join([str(item["debt_equity"]) for item in comparison_table]) + " |\n"
                "| **Overall Score** | " + " | ".join([f"{item['score']}/100" for item in comparison_table]) + " |\n\n"
                "Based on quantitative parameters, "
                f"**{max(comparison_table, key=lambda x: x['score'])['symbol']}** emerges as the overall winner based on balanced growth and capital efficiency indicators."
            )
            return {
                "answer": answer,
                "sources": [],
                "scores": None,
                "comparison_table": comparison_table
            }

        # Single Stock RAG Mode
        stock = self.db.query(Stock).filter(Stock.symbol == active_symbol).first()
        scores = self.calculate_scores(active_symbol)
        
        # Pull vector chunks and run local reranker
        raw_docs = self.rag_service.search_vector_db(message, stock_symbol=active_symbol, limit=top_k or 10)
        vector_docs = self.rag_service.rerank_documents(message, raw_docs, top_k=3)

        # Build prompt context
        context_parts = []
        if vector_docs:
            for doc in vector_docs:
                context_parts.append(doc["content"])
        context_str = "\n\n".join(context_parts)

        system_prompt = custom_system_prompt or (
            "You are a premium stock research agent. Your task is to output a comprehensive financial analysis. "
            "You MUST follow the requested markdown structure exactly. Use probability-based language, "
            "never guarantee returns, and never say 'buy now'."
        )

        # Load structured stock data string
        structured_str = self.get_structured_context_string(active_symbol)

        prompt = (
            f"Context:\n{context_str}\n\n"
            f"{structured_str}"
            f"{history_context}"
            f"Question about {stock.name if stock else active_symbol} ({active_symbol}): {message}\n\n"
            "Format your answer EXACTLY like this structure:\n"
            "## Summary\n[Short answer]\n\n"
            "## Key Findings\n[Bullet points]\n\n"
            "## Financial Analysis\n[Metrics and interpretation]\n\n"
            "## Management Commentary\n[Extracted commentary from context]\n\n"
            "## Growth Drivers\n[Future opportunities]\n\n"
            "## Risks\n[Potential concerns]\n\n"
            "## AI Investment Score\n"
            f"| Metric | Score |\n"
            f"| --- | --- |\n"
            f"| Business Quality | {scores['business']}/100 |\n"
            f"| Financial Strength | {scores['financial']}/100 |\n"
            f"| Valuation | {scores['valuation']}/100 |\n"
            f"| Risk | {scores['risk']}/100 |\n"
            f"| **Overall Score** | **{scores['overall']}/100** |\n"
        )

        try:
            answer = ollama_client.generate_completion(
                prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                model=model
            )
        except Exception as e:
            answer = f"Error generating answer: {e}"

        return {
            "answer": answer,
            "sources": vector_docs,
            "scores": scores,
            "comparison_table": None
        }

    def process_chat_stream(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        top_k: Optional[int] = None,
        custom_system_prompt: Optional[str] = None
    ):
        detected_symbols = self.detect_symbols(message)
        logger.info(f"Chat stream message: '{message}', detected: {detected_symbols}")

        active_symbol = None
        if conversation_id:
            if detected_symbols:
                active_symbol = detected_symbols[0]
                CONVERSATION_MEMORY[conversation_id] = active_symbol
            else:
                active_symbol = CONVERSATION_MEMORY.get(conversation_id)
        elif detected_symbols:
            active_symbol = detected_symbols[0]

        # Fetch history
        history_context = ""
        if conversation_id:
            try:
                past_messages = self.db.query(ChatMessage).filter(
                    ChatMessage.conversation_id == conversation_id
                ).order_by(ChatMessage.created_at.desc()).limit(10).all()
                past_messages.reverse()
                if past_messages:
                    history_parts = []
                    for msg in past_messages:
                        sender_label = "User" if msg.sender == "user" else "Assistant"
                        history_parts.append(f"{sender_label}: {msg.content}")
                    history_context = "### PREVIOUS CONVERSATION HISTORY:\n" + "\n".join(history_parts) + "\n\n"
            except Exception as e:
                logger.error(f"Error fetching conversation history: {e}")

        # If no stock symbol is active or detected
        if not active_symbol and not detected_symbols:
            all_stocks = self.db.query(Stock).all()
            suggestions = [s.symbol for s in all_stocks[:4]]
            
            system_prompt = custom_system_prompt or (
                "You are EQUITY.AI, a premium AI stock research assistant. "
                "Answer the user's general conversational or financial question politely, accurately, and concisely. "
                "At the end of your response, if relevant, remind the user that they can ask you to run deep analyses "
                f"on specific stocks available in our database (such as {', '.join(suggestions)})."
            )
            full_prompt = history_context + message
            try:
                for chunk in ollama_client.generate_completion_stream(
                    full_prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    model=model
                ):
                    yield {"type": "text", "content": chunk}
                yield {"type": "metadata", "sources": [], "scores": None, "comparison_table": None}
            except Exception as e:
                yield {"type": "text", "content": f"Error in stream: {e}"}
            return

        # If comparison mode (we don't stream here, just yield the constructed table chunk)
        if len(detected_symbols) >= 2:
            comparison_table = self.generate_comparison_table(detected_symbols)
            answer = (
                f"### Comparison Analysis: " + " vs ".join(detected_symbols) + "\n\n"
                "| Metric | " + " | ".join([item["symbol"] for item in comparison_table]) + " |\n"
                "| --- | " + " | ".join(["---"] * len(comparison_table)) + " |\n"
                "| **Revenue Growth** | " + " | ".join([str(item["revenue_growth"]) for item in comparison_table]) + " |\n"
                "| **ROCE** | " + " | ".join([str(item["roce"]) for item in comparison_table]) + " |\n"
                "| **P/E Ratio** | " + " | ".join([str(item["pe"]) for item in comparison_table]) + " |\n"
                "| **Debt to Equity** | " + " | ".join([str(item["debt_equity"]) for item in comparison_table]) + " |\n"
                "| **Overall Score** | " + " | ".join([f"{item['score']}/100" for item in comparison_table]) + " |\n\n"
                "Based on quantitative parameters, "
                f"**{max(comparison_table, key=lambda x: x['score'])['symbol']}** emerges as the overall winner based on balanced growth and capital efficiency indicators."
            )
            yield {"type": "text", "content": answer}
            yield {"type": "metadata", "sources": [], "scores": None, "comparison_table": comparison_table}
            return

        # Single Stock RAG Mode
        stock = self.db.query(Stock).filter(Stock.symbol == active_symbol).first()
        scores = self.calculate_scores(active_symbol)
        
        raw_docs = self.rag_service.search_vector_db(message, stock_symbol=active_symbol, limit=top_k or 10)
        vector_docs = self.rag_service.rerank_documents(message, raw_docs, top_k=3)

        context_parts = []
        if vector_docs:
            for doc in vector_docs:
                context_parts.append(doc["content"])
        context_str = "\n\n".join(context_parts)

        system_prompt = custom_system_prompt or (
            "You are a premium stock research agent. Your task is to output a comprehensive financial analysis. "
            "You MUST follow the requested markdown structure exactly. Use probability-based language, "
            "never guarantee returns, and never say 'buy now'."
        )

        # Load structured stock data string
        structured_str = self.get_structured_context_string(active_symbol)

        prompt = (
            f"Context:\n{context_str}\n\n"
            f"{structured_str}"
            f"{history_context}"
            f"Question about {stock.name if stock else active_symbol} ({active_symbol}): {message}\n\n"
            "Format your answer EXACTLY like this structure:\n"
            "## Summary\n[Short answer]\n\n"
            "## Key Findings\n[Bullet points]\n\n"
            "## Financial Analysis\n[Metrics and interpretation]\n\n"
            "## Management Commentary\n[Extracted commentary from context]\n\n"
            "## Growth Drivers\n[Future opportunities]\n\n"
            "## Risks\n[Potential concerns]\n\n"
            "## AI Investment Score\n"
            f"| Metric | Score |\n"
            f"| --- | --- |\n"
            f"| Business Quality | {scores['business']}/100 |\n"
            f"| Financial Strength | {scores['financial']}/100 |\n"
            f"| Valuation | {scores['valuation']}/100 |\n"
            f"| Risk | {scores['risk']}/100 |\n"
            f"| **Overall Score** | **{scores['overall']}/100** |\n"
        )

        try:
            for chunk in ollama_client.generate_completion_stream(
                prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                model=model
            ):
                yield {"type": "text", "content": chunk}
            yield {"type": "metadata", "sources": vector_docs, "scores": scores, "comparison_table": None}
        except Exception as e:
            yield {"type": "text", "content": f"Error in stream: {e}"}
