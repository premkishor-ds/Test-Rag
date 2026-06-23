import logging
import requests
from app.core.config import settings

logger = logging.getLogger(__name__)

# List of highly critical keyword indicators for financial markets
CRITICAL_KEYWORDS = ["fraud", "lawsuit", "default", "scam", "bankruptcy", "resigns", "sebi", "probe", "investigation"]

class AlertManager:
    @staticmethod
    def inspect_and_alert(symbol: str, article_title: str, sentiment: str, summary: str = ""):
        """Scan newly fetched article and send warning notification if critical risk or heavy negative sentiment is found."""
        lower_title = article_title.lower()
        lower_summary = (summary or "").lower()
        
        triggered_keywords = [kw for kw in CRITICAL_KEYWORDS if kw in lower_title or kw in lower_summary]
        is_negative = sentiment.upper() == "NEGATIVE"
        
        if triggered_keywords or is_negative:
            alert_msg = (
                f"🚨 [MARKET RISK ALERT] [{symbol.upper()}]\n"
                f"Article: \"{article_title}\"\n"
                f"Sentiment: {sentiment.upper()}\n"
            )
            if triggered_keywords:
                alert_msg += f"Triggered Keywords: {', '.join(triggered_keywords)}\n"
                
            logger.warning(alert_msg)
            
            # Save Notification directly into SQLite Database
            try:
                from app.core.database import SessionLocal
                from app.models.models import Notification
                db = SessionLocal()
                notif = Notification(
                    stock_symbol=symbol.upper(),
                    message=alert_msg,
                    severity="WARNING",
                    is_read=False
                )
                db.add(notif)
                db.commit()
                db.close()
            except Exception as dberr:
                logger.error(f"Failed to save database notification: {dberr}")
            
            # Example webhook configuration
            # In a production environment, you can define WEBHOOK_URL in .env
            webhook_url = getattr(settings, "ALERT_WEBHOOK_URL", None)
            if webhook_url:
                try:
                    requests.post(webhook_url, json={"text": alert_msg}, timeout=5)
                    logger.info("Sent webhook notification.")
                except Exception as e:
                    logger.error(f"Failed to post alert webhook: {e}")

