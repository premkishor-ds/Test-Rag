import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import Watchlist, WatchlistItem, Stock, FinancialMetric, ValuationMetric, AnalysisReport

logger = logging.getLogger(__name__)

class WatchlistService:
    def __init__(self, db: Session):
        self.db = db

    def create_watchlist(self, user_id: int, name: str) -> Watchlist:
        watchlist = Watchlist(user_id=user_id, name=name)
        self.db.add(watchlist)
        self.db.commit()
        self.db.refresh(watchlist)
        return watchlist

    def delete_watchlist(self, user_id: int, watchlist_id: int) -> bool:
        watchlist = self.db.query(Watchlist).filter(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == user_id
        ).first()
        if not watchlist:
            return False
        self.db.delete(watchlist)
        self.db.commit()
        return True

    def add_stock(self, user_id: int, watchlist_id: int, symbol: str) -> Optional[WatchlistItem]:
        # Verify ownership
        watchlist = self.db.query(Watchlist).filter(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == user_id
        ).first()
        if not watchlist:
            return None

        # Check if already exists
        exists = self.db.query(WatchlistItem).filter(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.stock_symbol == symbol.upper()
        ).first()
        if exists:
            return exists

        item = WatchlistItem(watchlist_id=watchlist_id, stock_symbol=symbol.upper())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove_stock(self, user_id: int, watchlist_id: int, symbol: str) -> bool:
        watchlist = self.db.query(Watchlist).filter(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == user_id
        ).first()
        if not watchlist:
            return False

        item = self.db.query(WatchlistItem).filter(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.stock_symbol == symbol.upper()
        ).first()
        if not item:
            return False

        self.db.delete(item)
        self.db.commit()
        return True

    def get_user_watchlists(self, user_id: int) -> List[Watchlist]:
        return self.db.query(Watchlist).filter(Watchlist.user_id == user_id).all()

    def track_watchlist_changes(self, user_id: int, watchlist_id: int) -> List[Dict[str, Any]]:
        watchlist = self.db.query(Watchlist).filter(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == user_id
        ).first()
        if not watchlist:
            return []

        changes = []
        for item in watchlist.items:
            # Get latest 2 reports to calculate score change
            reports = self.db.query(AnalysisReport).filter(
                AnalysisReport.stock_symbol == item.stock_symbol
            ).order_by(AnalysisReport.report_date.desc()).limit(2).all()
            
            score_change = 0.0
            current_score = None
            prev_score = None
            rating = "Avoid"
            
            if len(reports) > 0:
                current_score = reports[0].score
                rating = reports[0].rating
                if len(reports) > 1:
                    prev_score = reports[1].score
                    score_change = current_score - prev_score

            # Get latest valuation details
            val = self.db.query(ValuationMetric).filter(
                ValuationMetric.stock_symbol == item.stock_symbol
            ).order_by(ValuationMetric.created_at.desc()).first()

            # Get latest financial metrics
            met = self.db.query(FinancialMetric).filter(
                FinancialMetric.stock_symbol == item.stock_symbol
            ).order_by(FinancialMetric.financial_year.desc()).first()

            stock = self.db.query(Stock).filter(Stock.symbol == item.stock_symbol).first()

            changes.append({
                "symbol": item.stock_symbol,
                "name": stock.name if stock else "",
                "current_score": current_score,
                "rating": rating,
                "score_change": round(score_change, 2),
                "pe_ratio": val.pe_ratio if val else None,
                "revenue_growth": met.revenue_growth if met else None,
                "profit_growth": met.profit_growth if met else None,
                "last_updated": reports[0].report_date if len(reports) > 0 else None
            })
        return changes
