import logging
from sqlalchemy.orm import Session
from app.core.ollama import ollama_client
from app.models.models import Stock, FinancialMetric, TechnicalIndicator, StockArticle

logger = logging.getLogger(__name__)

class NewsletterService:
    @staticmethod
    def compile_weekly_digest(db: Session) -> str:
        """Query technical and sentiment indicators of all watchlist stocks and build an AI summary report."""
        stocks = db.query(Stock).all()
        if not stocks:
            return "No stocks available in database to compile weekly digest."
            
        digest_inputs = []
        for s in stocks:
            # Fetch latest indicators
            tech = db.query(TechnicalIndicator).filter(TechnicalIndicator.stock_symbol == s.symbol).first()
            articles = db.query(StockArticle).filter(StockArticle.stock_symbol == s.symbol).order_by(StockArticle.fetched_at.desc()).limit(3).all()
            
            stock_summary = f"- Stock: {s.symbol} ({s.name})\n"
            if tech:
                stock_summary += f"  Indicators: RSI: {tech.rsi} | Trend: {tech.trend_strength} | Beta: {tech.beta}\n"
            if articles:
                headlines = [f"\"{a.title[:60]}\" ({a.sentiment})" for a in articles]
                stock_summary += f"  Recent News: {'; '.join(headlines)}\n"
            digest_inputs.append(stock_summary)
            
        prompt = (
            "You are a professional financial editor. Synthesize a brief weekly portfolio briefing "
            "based on the following raw stock indicators. Highlight any stocks displaying extremely "
            "bullish indicators (RSI < 30 or strong trend) or critical risk indicators (heavy negative news sentiment).\n\n"
            f"Watchlist Inputs:\n" + "\n".join(digest_inputs) + "\n\n"
            "Respond in structured Markdown. Keep it brief, professional, and readable."
        )
        
        try:
            digest = ollama_client.generate_completion(
                prompt,
                system_prompt="You are a premium portfolio digest generator. Output clean Markdown briefings."
            )
            return digest
        except Exception as e:
            logger.error(f"Failed to generate weekly AI digest: {e}")
            return f"Error compiling portfolio digest: {e}"
