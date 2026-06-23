import json
import logging
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.ollama import ollama_client
from app.services.rag import RagService
from app.models.models import Stock, FinancialMetric, ValuationMetric, TechnicalIndicator, AnalysisReport, AuditLog

logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self, db: Session):
        self.db = db
        self.rag_service = RagService(db)

    def calculate_score(self, metrics: Optional[FinancialMetric], valuation: Optional[ValuationMetric], sector_tailwind_score: float = 3.0) -> Dict[str, Any]:
        """
        Deterministic scoring system:
        - Revenue Growth (YoY %) >= 20% = 20 pts; >= 10% = 10 pts; else 0
        - Profit Growth (YoY %) >= 15% = 20 pts; >= 8% = 10 pts; else 0
        - ROCE >= 15% = 15 pts; >= 10% = 8 pts; else 0
        - Debt to Equity < 0.5 = 10 pts; < 1.0 = 5 pts; else 0
        - Cash Flow (Positive Operating Cash Flow) = 10 pts; negative = 0
        - Promoter Holding >= 50% = 10 pts; >= 35% = 5 pts; else 0
        - Order Book (Positive growth or size > 0.5x Rev) = 10 pts; else 0
        - Sector Tailwind = up to 5 pts (based on database/input tailwind score)
        Total = 100
        """
        breakdown = {
            "revenue_growth": 0.0,
            "profit_growth": 0.0,
            "roce": 0.0,
            "debt": 0.0,
            "cash_flow": 0.0,
            "promoter_holding": 0.0,
            "order_book": 0.0,
            "sector_tailwind": 0.0
        }

        if not metrics:
            return {"total_score": 0.0, "rating": "Avoid", "breakdown": breakdown}

        # 1. Revenue Growth (Max 20)
        rev_growth = metrics.revenue_growth or 0.0
        if rev_growth >= 20.0:
            breakdown["revenue_growth"] = 20.0
        elif rev_growth >= 10.0:
            breakdown["revenue_growth"] = 10.0
        else:
            breakdown["revenue_growth"] = 0.0

        # 2. Profit Growth (Max 20)
        prof_growth = metrics.profit_growth or 0.0
        if prof_growth >= 15.0:
            breakdown["profit_growth"] = 20.0
        elif prof_growth >= 8.0:
            breakdown["profit_growth"] = 10.0
        else:
            breakdown["profit_growth"] = 0.0

        # 3. ROCE (Max 15)
        roce = metrics.roce or 0.0
        if roce >= 15.0:
            breakdown["roce"] = 15.0
        elif roce >= 10.0:
            breakdown["roce"] = 8.0
        else:
            breakdown["roce"] = 0.0

        # 4. Debt to Equity (Max 10)
        d_e = metrics.debt_to_equity if metrics.debt_to_equity is not None else 1.5
        if d_e < 0.5:
            breakdown["debt"] = 10.0
        elif d_e < 1.0:
            breakdown["debt"] = 5.0
        else:
            breakdown["debt"] = 0.0

        # 5. Operating Cash Flow (Max 10)
        ocf = metrics.cash_flow_from_operations or 0.0
        if ocf > 0.0:
            breakdown["cash_flow"] = 10.0
        else:
            breakdown["cash_flow"] = 0.0

        # 6. Promoter Holding (Max 10)
        prom = metrics.promoter_holding or 0.0
        if prom >= 50.0:
            breakdown["promoter_holding"] = 10.0
        elif prom >= 35.0:
            breakdown["promoter_holding"] = 5.0
        else:
            breakdown["promoter_holding"] = 0.0

        # 7. Order Book Size vs Revenue (Max 10)
        order_bk = metrics.order_book or 0.0
        rev = metrics.revenue or 1.0
        if order_bk > 0.0 and (order_bk / rev) >= 0.5:
            breakdown["order_book"] = 10.0
        elif order_bk > 0.0:
            breakdown["order_book"] = 5.0
        else:
            breakdown["order_book"] = 0.0

        # 8. Sector Tailwind (Max 5)
        breakdown["sector_tailwind"] = min(float(sector_tailwind_score), 5.0)

        total_score = sum(breakdown.values())

        # Determine rating
        if total_score >= 80.0:
            rating = "Strong Buy"
        elif total_score >= 60.0:
            rating = "Buy"
        elif total_score >= 40.0:
            rating = "Watchlist"
        else:
            rating = "Avoid"

        return {
            "total_score": total_score,
            "rating": rating,
            "breakdown": breakdown
        }

    def generate_analysis_report(self, symbol: str) -> Dict[str, Any]:
        stock = self.db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
        if not stock:
            raise Exception(f"Stock with symbol {symbol} not found.")

        # Get data
        metrics = self.db.query(FinancialMetric).filter(
            FinancialMetric.stock_symbol == stock.symbol
        ).order_by(FinancialMetric.financial_year.desc()).first()

        valuation = self.db.query(ValuationMetric).filter(
            ValuationMetric.stock_symbol == stock.symbol
        ).order_by(ValuationMetric.created_at.desc()).first()

        # Calculate Score
        score_data = self.calculate_score(metrics, valuation)
        score = score_data["total_score"]
        rating = score_data["rating"]
        breakdown = score_data["breakdown"]

        # Vector search for latest texts
        chunks = self.rag_service.search_vector_db(
            query=f"annual report management commentary business overview risks and growth drivers for {stock.name}",
            stock_symbol=stock.symbol,
            limit=8
        )

        # Build context
        unstructured_context = "\n\n".join([
            f"Chunk Source: {c['metadata']['source_file']} (FY{c['metadata']['financial_year']})\nContent: {c['content']}"
            for c in chunks
        ])

        structured_context = (
            f"Symbol: {stock.symbol}\n"
            f"Name: {stock.name}\n"
            f"Sector: {stock.sector}\n"
            f"Industry: {stock.industry}\n"
            f"Market Cap: {stock.market_cap} Cr\n"
            f"Revenue: {metrics.revenue if metrics else 'N/A'} Cr (Growth: {metrics.revenue_growth if metrics else 'N/A'}%)\n"
            f"Net Profit: {metrics.net_profit if metrics else 'N/A'} Cr (Growth: {metrics.profit_growth if metrics else 'N/A'}%)\n"
            f"ROCE: {metrics.roce if metrics else 'N/A'}%\n"
            f"ROE: {metrics.roe if metrics else 'N/A'}%\n"
            f"Debt to Equity: {metrics.debt_to_equity if metrics else 'N/A'}\n"
            f"Operating Cash Flow: {metrics.cash_flow_from_operations if metrics else 'N/A'} Cr\n"
            f"Promoter Holding: {metrics.promoter_holding if metrics else 'N/A'}%\n"
            f"Order Book: {metrics.order_book if metrics else 'N/A'} Cr\n"
            f"PE Ratio: {valuation.pe_ratio if valuation else 'N/A'}\n"
            f"EV/EBITDA: {valuation.ev_ebitda if valuation else 'N/A'}\n"
            f"PEG Ratio: {valuation.peg_ratio if valuation else 'N/A'}\n"
        )

        # Query LLM to write the report
        system_prompt = (
            "You are a Senior Equity Research Analyst. Your job is to compile a comprehensive, professional "
            "equity research report based on the provided structured financial stats and unstructured text chunks. "
            "You must follow the structured analysis format exactly. Explain the stock scoring results calculated by the system, "
            "and DO NOT alter the final score or rating. Be factual and do not hallucinate."
        )

        prompt = (
            f"### SYSTEM CALCULATED SCORE BREAKDOWN:\n"
            f"Total Investment Score: {score}/100\n"
            f"Investment Rating: {rating}\n"
            f"Score Breakdown: {json.dumps(breakdown, indent=2)}\n\n"
            f"### FINANCIAL STATS:\n{structured_context}\n\n"
            f"### MANAGEMENT COMMENTARY & REPORT CHUNKS:\n{unstructured_context}\n\n"
            "Generate a highly professional, detailed research report in JSON format with the following keys. "
            "Ensure the output is clean JSON that can be parsed directly. Do not include markdown code block syntax in the JSON output, just raw JSON:\n"
            "{\n"
            "  \"business_overview\": \"...\",\n"
            "  \"revenue_analysis\": \"...\",\n"
            "  \"profit_analysis\": \"...\",\n"
            "  \"cash_flow_analysis\": \"...\",\n"
            "  \"balance_sheet_analysis\": \"...\",\n"
            "  \"management_commentary_summary\": \"...\",\n"
            "  \"order_book_analysis\": \"...\",\n"
            "  \"growth_drivers\": \"...\",\n"
            "  \"government_tailwinds\": \"...\",\n"
            "  \"sector_tailwinds\": \"...\",\n"
            "  \"risks\": \"...\",\n"
            "  \"opportunities\": \"...\",\n"
            "  \"competitive_position\": \"...\",\n"
            "  \"valuation_assessment\": \"...\",\n"
            "  \"bull_case\": \"...\",\n"
            "  \"bear_case\": \"...\",\n"
            "  \"final_investment_thesis\": \"...\",\n"
            "  \"score_explanation\": \"...\"\n"
            "}"
        )

        try:
            raw_response = ollama_client.generate_completion(prompt, system_prompt=system_prompt)
            # Remove ```json formatting if the LLM outputted it anyway
            clean_response = raw_response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            clean_response = clean_response.strip()
            
            report_dict = json.loads(clean_response)
        except Exception as e:
            logger.error(f"Error parsing LLM report to JSON: {e}. Raw response: {raw_response if 'raw_response' in locals() else ''}")
            # Fallback to key-value pairs
            report_dict = {
                "business_overview": "Error generating complete JSON report.",
                "revenue_analysis": "Please check background logs.",
                "final_investment_thesis": f"Failed parsing: {str(e)}"
            }

        # Cache report in PostgreSQL
        analysis_report = AnalysisReport(
            stock_symbol=stock.symbol,
            report_json=json.dumps(report_dict),
            rating=rating,
            score=score,
            confidence_score=95.0 if chunks else 60.0
        )
        self.db.add(analysis_report)

        audit = AuditLog(
            action="GENERATE_ANALYSIS",
            target_type="analysis_report",
            target_id=stock.symbol,
            details=f"Generated investment analysis report for {stock.symbol} with score {score} ({rating})"
        )
        self.db.add(audit)
        self.db.commit()

        return {
            "stock_symbol": stock.symbol,
            "report_date": analysis_report.report_date,
            "rating": rating,
            "score": score,
            "confidence_score": analysis_report.confidence_score,
            "report": report_dict,
            "metrics": {
                "pe_ratio": valuation.pe_ratio if valuation else None,
                "roe": metrics.roe if metrics else None,
                "roce": metrics.roce if metrics else None,
                "debt_equity": metrics.debt_to_equity if metrics else None,
                "promoter_holding": metrics.promoter_holding if metrics else None,
            }
        }
