from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Stock Schemas
class StockBase(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[float] = None

class StockCreate(StockBase):
    pass

class StockResponse(StockBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Financial Metric Schemas
class FinancialMetricBase(BaseModel):
    stock_symbol: str
    financial_year: int
    quarter: Optional[str] = None
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

class FinancialMetricCreate(FinancialMetricBase):
    pass

class FinancialMetricResponse(FinancialMetricBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Valuation Metric Schemas
class ValuationMetricBase(BaseModel):
    stock_symbol: str
    pe_ratio: Optional[float] = None
    ev_ebitda: Optional[float] = None
    peg_ratio: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None

class ValuationMetricCreate(ValuationMetricBase):
    pass

class ValuationMetricResponse(ValuationMetricBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Technical Indicator Schemas
class TechnicalIndicatorBase(BaseModel):
    stock_symbol: str
    rsi: Optional[float] = None
    macd: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    volume_breakout: Optional[bool] = False
    relative_strength: Optional[float] = None
    trend_strength: Optional[str] = None

class TechnicalIndicatorCreate(TechnicalIndicatorBase):
    pass

class TechnicalIndicatorResponse(TechnicalIndicatorBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

# Screener Filter Schema
class ScreenerFilterRequest(BaseModel):
    min_market_cap: Optional[float] = None
    min_revenue_growth: Optional[float] = None
    min_profit_growth: Optional[float] = None
    min_roe: Optional[float] = None
    min_roce: Optional[float] = None
    max_debt_equity: Optional[float] = None
    min_cash_flow: Optional[float] = None
    min_promoter_holding: Optional[float] = None
    min_fii_holding: Optional[float] = None
    min_dii_holding: Optional[float] = None
    max_pe: Optional[float] = None
    max_ev_ebitda: Optional[float] = None
    max_peg: Optional[float] = None
    min_order_book: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    trend_strength: Optional[str] = None
    volume_breakout: Optional[bool] = None

# Watchlist Schemas
class WatchlistItemBase(BaseModel):
    stock_symbol: str

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItemResponse(WatchlistItemBase):
    id: int
    watchlist_id: int
    added_at: datetime

    class Config:
        from_attributes = True

class WatchlistBase(BaseModel):
    name: str

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistResponse(WatchlistBase):
    id: int
    user_id: int
    created_at: datetime
    items: List[WatchlistItemResponse] = []

    class Config:
        from_attributes = True

# Backtest Schemas
class BacktestRequest(BaseModel):
    strategy_name: str
    duration_years: int = Field(5, ge=5, le=20)
    parameters: Dict[str, Any] = {}

class BacktestResponse(BaseModel):
    strategy_name: str
    cagr: float
    max_drawdown: float
    sharpe_ratio: float
    sortino_ratio: float
    win_rate: float
    benchmark_cagr: float
    metrics_by_year: List[Dict[str, Any]]
    executed_at: datetime

# RAG & Analysis Schemas
class RagQueryRequest(BaseModel):
    query: str
    stock_symbol: Optional[str] = None
    limit: int = 5

class RagQueryResponse(BaseModel):
    answer: str
    source_documents: List[Dict[str, Any]]

class AnalysisReportRequest(BaseModel):
    stock_symbol: str

class KeyMetricsTableSchema(BaseModel):
    pe_ratio: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    debt_equity: Optional[float] = None
    promoter_holding: Optional[float] = None

class AnalysisReportResponse(BaseModel):
    stock_symbol: str
    report_date: datetime
    rating: str
    score: float
    confidence_score: float
    report: Dict[str, Any]
    metrics: KeyMetricsTableSchema

# News Schema
class NewsResponse(BaseModel):
    id: int
    stock_symbol: str
    title: str
    url: Optional[str]
    source: Optional[str]
    published_date: Optional[datetime]
    sentiment: Optional[str]
    summary: Optional[str]

    class Config:
        from_attributes = True
