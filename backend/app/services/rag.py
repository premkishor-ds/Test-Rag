import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.ollama import ollama_client
from app.core.qdrant import qdrant_client
from app.models.models import Stock, FinancialMetric, ValuationMetric, TechnicalIndicator

logger = logging.getLogger(__name__)

class RagService:
    def __init__(self, db: Session):
        self.db = db

    def search_vector_db(self, query: str, stock_symbol: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        if not qdrant_client:
            logger.warning("Qdrant client not initialized. Cannot perform vector search.")
            return []

        try:
            # Generate embedding for the query
            query_vector = ollama_client.generate_embeddings(query)
            
            # Build filters if stock_symbol is provided
            filter_conditions = None
            if stock_symbol:
                from qdrant_client.http import models as qmodels
                filter_conditions = qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="stock_symbol",
                            match=qmodels.MatchValue(value=stock_symbol.upper())
                        )
                    ]
                )

            # Search in Qdrant
            results = qdrant_client.search(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                query_vector=query_vector,
                query_filter=filter_conditions,
                limit=limit
            )

            formatted_docs = []
            for hit in results:
                formatted_docs.append({
                    "score": hit.score,
                    "content": hit.payload.get("content", ""),
                    "metadata": {
                        "stock_symbol": hit.payload.get("stock_symbol", ""),
                        "stock_name": hit.payload.get("stock_name", ""),
                        "source_type": hit.payload.get("source_type", ""),
                        "source_file": hit.payload.get("source_file", ""),
                        "financial_year": hit.payload.get("financial_year", ""),
                        "quarter": hit.payload.get("quarter", ""),
                        "page_number": hit.payload.get("page_number", "")
                    }
                })
            return formatted_docs
        except Exception as e:
            logger.error(f"Error searching vector db: {e}")
            return []

    def get_structured_stock_data(self, stock_symbol: str) -> Dict[str, Any]:
        stock = self.db.query(Stock).filter(Stock.symbol == stock_symbol.upper()).first()
        if not stock:
            return {}

        metrics = self.db.query(FinancialMetric).filter(
            FinancialMetric.stock_symbol == stock.symbol
        ).order_by(FinancialMetric.financial_year.desc()).first()

        valuation = self.db.query(ValuationMetric).filter(
            ValuationMetric.stock_symbol == stock.symbol
        ).order_by(ValuationMetric.created_at.desc()).first()

        technical = self.db.query(TechnicalIndicator).filter(
            TechnicalIndicator.stock_symbol == stock.symbol
        ).order_by(TechnicalIndicator.updated_at.desc()).first()

        return {
            "symbol": stock.symbol,
            "name": stock.name,
            "sector": stock.sector,
            "industry": stock.industry,
            "market_cap": stock.market_cap,
            "revenue": metrics.revenue if metrics else None,
            "revenue_growth": metrics.revenue_growth if metrics else None,
            "net_profit": metrics.net_profit if metrics else None,
            "profit_growth": metrics.profit_growth if metrics else None,
            "roce": metrics.roce if metrics else None,
            "roe": metrics.roe if metrics else None,
            "debt_to_equity": metrics.debt_to_equity if metrics else None,
            "cash_flow": metrics.cash_flow_from_operations if metrics else None,
            "promoter_holding": metrics.promoter_holding if metrics else None,
            "fii_holding": metrics.fii_holding if metrics else None,
            "dii_holding": metrics.dii_holding if metrics else None,
            "order_book": metrics.order_book if metrics else None,
            "pe_ratio": valuation.pe_ratio if valuation else None,
            "ev_ebitda": valuation.ev_ebitda if valuation else None,
            "peg_ratio": valuation.peg_ratio if valuation else None,
            "fifty_two_week_high": valuation.fifty_two_week_high if valuation else None,
            "fifty_two_week_low": valuation.fifty_two_week_low if valuation else None,
            "rsi": technical.rsi if technical else None,
            "trend_strength": technical.trend_strength if technical else None,
        }
    def rerank_documents(self, query: str, docs: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        if not docs:
            return []
        
        prompt_parts = [
            "You are an AI Reranking Assistant. You will evaluate the relevance of multiple retrieved chunks to a user question.\n",
            f"User Question: \"{query}\"\n\n",
            "Here are the retrieved chunks:"
        ]
        
        for idx, doc in enumerate(docs):
            content_snippet = doc["content"][:400].replace("\n", " ")
            prompt_parts.append(f"Chunk ID {idx}: {content_snippet} (from {doc['metadata'].get('source_file')})")
            
        prompt_parts.append(
            f"\nEvaluate which chunks contain direct, highly relevant answers or key financial metrics to solve the user's question.\n"
            f"Select the top {top_k} chunk IDs as a comma-separated list of integers in order of relevance (e.g. '2, 0, 1').\n"
            "Return ONLY the comma-separated integers. Do not write any other explanation or words."
        )
        
        prompt = "\n".join(prompt_parts)
        try:
            response = ollama_client.generate_completion(prompt).strip()
            import re
            ids = [int(i) for i in re.findall(r'\d+', response)]
            selected_ids = []
            for i in ids:
                if 0 <= i < len(docs) and i not in selected_ids:
                    selected_ids.append(i)
            
            if selected_ids:
                reranked = [docs[i] for i in selected_ids[:top_k]]
                logger.info(f"LLM Reranked chunks: selected indices {selected_ids[:top_k]} from {len(docs)} retrieved.")
                return reranked
        except Exception as e:
            logger.error(f"Error during LLM reranking: {e}")
            
        return docs[:top_k]

    def determine_query_type(self, query: str) -> str:
        # Ask LLM or use simple heuristics to route the query
        # Let's use a lightweight LLM check
        prompt = (
            "You are a router. Classify the user query into one of three categories:\n"
            "1. STRUCTURED: If the query only asks for numerical metrics, screening, ratios, growth, or database values (e.g. 'PE below 20', 'revenue growth > 25%').\n"
            "2. UNSTRUCTURED: If the query asks for semantic, qualitative, or textual information (e.g. 'what did management say about AI', 'risks in the annual report').\n"
            "3. HYBRID: If it asks for a full analysis of a stock or a combination of financial ratios and qualitative goals.\n\n"
            f"Query: \"{query}\"\n\n"
            "Respond ONLY with one of the following words: STRUCTURED, UNSTRUCTURED, HYBRID."
        )
        try:
            response = ollama_client.generate_completion(prompt).strip()
            for choice in ["STRUCTURED", "UNSTRUCTURED", "HYBRID"]:
                if choice in response.upper():
                    return choice
            return "HYBRID"
        except Exception:
            return "HYBRID"

    def execute_hybrid_query(self, query: str, stock_symbol: Optional[str] = None) -> Dict[str, Any]:
        # Classify query
        query_type = self.determine_query_type(query)
        logger.info(f"Query '{query}' routed to {query_type}")

        structured_context = ""
        vector_docs = []

        # Try to extract stock symbol from query if not provided
        if not stock_symbol:
            # Simple regex search for capitalized words matching our stocks table
            stocks = self.db.query(Stock.symbol).all()
            for s in stocks:
                if s[0] in query.upper():
                    stock_symbol = s[0]
                    break

        # Fetch structured data if needed
        if query_type in ["STRUCTURED", "HYBRID"] and stock_symbol:
            data = self.get_structured_stock_data(stock_symbol)
            if data:
                structured_context = (
                    f"Structured metrics for {data['name']} ({data['symbol']}):\n"
                    f"- Sector/Industry: {data['sector']} / {data['industry']}\n"
                    f"- Market Cap: Rs. {data['market_cap']} Cr\n"
                    f"- Revenue: Rs. {data['revenue']} Cr (Growth: {data['revenue_growth']}%)\n"
                    f"- Net Profit: Rs. {data['net_profit']} Cr (Growth: {data['profit_growth']}%)\n"
                    f"- ROCE: {data['roce']}%, ROE: {data['roe']}%\n"
                    f"- Debt to Equity: {data['debt_to_equity']}\n"
                    f"- Operating Cash Flow: Rs. {data['cash_flow']} Cr\n"
                    f"- Promoter Holding: {data['promoter_holding']}%\n"
                    f"- Order Book Size: Rs. {data['order_book']} Cr\n"
                    f"- P/E Ratio: {data['pe_ratio']}\n"
                )

        # Fetch unstructured data if needed - retrieve 10 and rerank to top 3
        if query_type in ["UNSTRUCTURED", "HYBRID"]:
            raw_docs = self.search_vector_db(query, stock_symbol=stock_symbol, limit=10)
            vector_docs = self.rerank_documents(query, raw_docs, top_k=3)

        # Assemble prompt context
        context_parts = []
        if structured_context:
            context_parts.append(f"### STRUCTURED DATA:\n{structured_context}")
        
        if vector_docs:
            context_parts.append("### RELEVANT REPORT CHUNKS:\n")
            for doc in vector_docs:
                meta = doc["metadata"]
                context_parts.append(
                    f"Source: {meta['source_file']} (FY{meta['financial_year']}), Chunk Score: {doc['score']:.4f}\n"
                    f"Content: {doc['content']}\n"
                    "---"
                )

        context = "\n\n".join(context_parts)
        
        # Build prompt
        system_prompt = (
            "You are an expert stock research analyst. Your task is to answer the user's financial question "
            "strictly using the provided context. Do not invent any numbers or facts outside the context. "
            "If the information is not present, clearly state that it is not available. Provide professional, "
            "insightful, and highly detailed answers with markdown formatting."
        )
        
        prompt = (
            f"Context:\n{context}\n\n"
            f"User Question: {query}\n\n"
            "Detailed Answer:"
        )

        try:
            answer = ollama_client.generate_completion(prompt, system_prompt=system_prompt)
        except Exception as e:
            answer = f"Error generating answer: {e}"

        return {
            "answer": answer,
            "source_documents": vector_docs
        }
