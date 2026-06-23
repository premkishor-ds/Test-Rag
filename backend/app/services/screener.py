import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.models import Stock, FinancialMetric, ValuationMetric, TechnicalIndicator, SavedFilter, AuditLog
from app.schemas.schemas import ScreenerFilterRequest

logger = logging.getLogger(__name__)

class ScreenerService:
    def __init__(self, db: Session):
        self.db = db

    def execute_screener(self, filters: ScreenerFilterRequest) -> List[Dict[str, Any]]:
        # Start query joining stocks, latest financial metrics, valuation, and technicals
        query = self.db.query(Stock)
        
        # Subqueries or joins for latest metrics
        # For simple and fast execution, we join the tables
        # Filter where they match the latest records (or do normal left joins)
        query = query.outerjoin(FinancialMetric, and_(
            FinancialMetric.stock_symbol == Stock.symbol,
            FinancialMetric.quarter.is_(None)  # Annualized metric
        ))
        query = query.outerjoin(ValuationMetric, ValuationMetric.stock_symbol == Stock.symbol)
        query = query.outerjoin(TechnicalIndicator, TechnicalIndicator.stock_symbol == Stock.symbol)

        conditions = []

        # Apply basic stock filters
        if filters.sector:
            conditions.append(Stock.sector == filters.sector)
        if filters.industry:
            conditions.append(Stock.industry == filters.industry)
        if filters.min_market_cap is not None:
            conditions.append(Stock.market_cap >= filters.min_market_cap)

        # Apply financial filters
        if filters.min_revenue_growth is not None:
            conditions.append(FinancialMetric.revenue_growth >= filters.min_revenue_growth)
        if filters.min_profit_growth is not None:
            conditions.append(FinancialMetric.profit_growth >= filters.min_profit_growth)
        if filters.min_roe is not None:
            conditions.append(FinancialMetric.roe >= filters.min_roe)
        if filters.min_roce is not None:
            conditions.append(FinancialMetric.roce >= filters.min_roce)
        if filters.max_debt_equity is not None:
            conditions.append(FinancialMetric.debt_to_equity <= filters.max_debt_equity)
        if filters.min_cash_flow is not None:
            conditions.append(FinancialMetric.cash_flow_from_operations >= filters.min_cash_flow)
        if filters.min_promoter_holding is not None:
            conditions.append(FinancialMetric.promoter_holding >= filters.min_promoter_holding)
        if filters.min_fii_holding is not None:
            conditions.append(FinancialMetric.fii_holding >= filters.min_fii_holding)
        if filters.min_dii_holding is not None:
            conditions.append(FinancialMetric.dii_holding >= filters.min_dii_holding)
        if filters.min_order_book is not None:
            conditions.append(FinancialMetric.order_book >= filters.min_order_book)

        # Apply valuation filters
        if filters.max_pe is not None:
            conditions.append(ValuationMetric.pe_ratio <= filters.max_pe)
        if filters.max_ev_ebitda is not None:
            conditions.append(ValuationMetric.ev_ebitda <= filters.max_ev_ebitda)
        if filters.max_peg is not None:
            conditions.append(ValuationMetric.peg_ratio <= filters.max_peg)

        # Apply technical filters
        if filters.trend_strength:
            conditions.append(TechnicalIndicator.trend_strength == filters.trend_strength)
        if filters.volume_breakout is not None:
            conditions.append(TechnicalIndicator.volume_breakout == filters.volume_breakout)

        if conditions:
            query = query.filter(and_(*conditions))

        results = query.all()
        
        output = []
        for stock in results:
            # Extract latest values for display
            met = self.db.query(FinancialMetric).filter(
                FinancialMetric.stock_symbol == stock.symbol
            ).order_by(FinancialMetric.financial_year.desc()).first()
            
            val = self.db.query(ValuationMetric).filter(
                ValuationMetric.stock_symbol == stock.symbol
            ).order_by(ValuationMetric.created_at.desc()).first()
            
            tec = self.db.query(TechnicalIndicator).filter(
                TechnicalIndicator.stock_symbol == stock.symbol
            ).order_by(TechnicalIndicator.updated_at.desc()).first()

            output.append({
                "symbol": stock.symbol,
                "name": stock.name,
                "sector": stock.sector,
                "industry": stock.industry,
                "market_cap": stock.market_cap,
                "revenue_growth": met.revenue_growth if met else None,
                "profit_growth": met.profit_growth if met else None,
                "roe": met.roe if met else None,
                "roce": met.roce if met else None,
                "debt_equity": met.debt_to_equity if met else None,
                "pe_ratio": val.pe_ratio if val else None,
                "rsi": tec.rsi if tec else None,
                "trend_strength": tec.trend_strength if tec else "Neutral"
            })
            
        return output

    def save_filter(self, user_id: int, name: str, filters: ScreenerFilterRequest) -> SavedFilter:
        saved = SavedFilter(
            user_id=user_id,
            name=name,
            filter_json=filters.model_dump_json()
        )
        self.db.add(saved)
        self.db.commit()
        return saved

    def get_saved_filters(self, user_id: int) -> List[SavedFilter]:
        return self.db.query(SavedFilter).filter(SavedFilter.user_id == user_id).all()
