import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base

# Many-to-many relationship helper table for User Roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)

# Many-to-many relationship helper table for Role Permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    roles = relationship("Role", secondary=user_roles, back_populates="users")
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    saved_filters = relationship("SavedFilter", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))

    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String(20), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    sector = Column(String(100), index=True)
    industry = Column(String(100), index=True)
    market_cap = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    annual_reports = relationship("AnnualReport", back_populates="stock", cascade="all, delete-orphan")
    corporate_documents = relationship("CorporateDocument", back_populates="stock", cascade="all, delete-orphan")
    quarterly_results = relationship("QuarterlyResult", back_populates="stock", cascade="all, delete-orphan")
    financial_metrics = relationship("FinancialMetric", back_populates="stock", cascade="all, delete-orphan")
    valuation_metrics = relationship("ValuationMetric", back_populates="stock", cascade="all, delete-orphan")
    technical_indicators = relationship("TechnicalIndicator", back_populates="stock", cascade="all, delete-orphan")
    order_book_updates = relationship("OrderBookUpdate", back_populates="stock", cascade="all, delete-orphan")
    news = relationship("News", back_populates="stock", cascade="all, delete-orphan")
    analysis_reports = relationship("AnalysisReport", back_populates="stock", cascade="all, delete-orphan")
    price_history = relationship("StockPriceHistory", back_populates="stock", cascade="all, delete-orphan")
    articles = relationship("StockArticle", back_populates="stock", cascade="all, delete-orphan")

class AnnualReport(Base):
    __tablename__ = "annual_reports"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(512), nullable=False)
    financial_year = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)
    summary = Column(Text)

    stock = relationship("Stock", back_populates="annual_reports")

class CorporateDocument(Base):
    __tablename__ = "corporate_documents"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(50), nullable=False)  # 'annual_report', 'quarterly_result', 'concall', 'presentation'
    file_path = Column(String(512), nullable=False)
    financial_year = Column(Integer, nullable=False)
    quarter = Column(String(5), nullable=True)  # Q1, Q2, Q3, Q4, or None
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)
    summary = Column(Text)

    stock = relationship("Stock", back_populates="corporate_documents")

class QuarterlyResult(Base):
    __tablename__ = "quarterly_results"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    financial_year = Column(Integer, nullable=False)
    quarter = Column(String(5), nullable=False)  # Q1, Q2, Q3, Q4
    revenue = Column(Float)
    net_profit = Column(Float)
    eps = Column(Float)
    date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stock = relationship("Stock", back_populates="quarterly_results")

class FinancialMetric(Base):
    __tablename__ = "financial_metrics"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    financial_year = Column(Integer, nullable=False)
    quarter = Column(String(5), nullable=True)  # Can be null if it represents an Annual statement
    revenue = Column(Float)
    revenue_growth = Column(Float)  # YoY %
    net_profit = Column(Float)
    profit_growth = Column(Float)   # YoY %
    roce = Column(Float)
    roe = Column(Float)
    debt_to_equity = Column(Float)
    cash_flow_from_operations = Column(Float)
    promoter_holding = Column(Float)
    fii_holding = Column(Float)
    dii_holding = Column(Float)
    order_book = Column(Float)      # Order book size in Cr
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Expanded fundamental fields
    capex = Column(Float, nullable=True)
    free_cash_flow = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    opm_pct = Column(Float, nullable=True)
    npm_pct = Column(Float, nullable=True)
    interest_coverage = Column(Float, nullable=True)
    debtor_days = Column(Integer, nullable=True)
    inventory_turnover = Column(Float, nullable=True)
    promoter_pledged_pct = Column(Float, nullable=True)

    stock = relationship("Stock", back_populates="financial_metrics")

class ValuationMetric(Base):
    __tablename__ = "valuation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    pe_ratio = Column(Float)
    ev_ebitda = Column(Float)
    peg_ratio = Column(Float)
    fifty_two_week_high = Column(Float)
    fifty_two_week_low = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stock = relationship("Stock", back_populates="valuation_metrics")

class TechnicalIndicator(Base):
    __tablename__ = "technical_indicators"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    rsi = Column(Float)
    macd = Column(Float)
    sma_50 = Column(Float)
    sma_200 = Column(Float)
    volume_breakout = Column(Boolean, default=False)
    relative_strength = Column(Float)
    trend_strength = Column(String(50))  # Bullish, Bearish, Neutral
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Expanded technical fields
    ema_20 = Column(Float, nullable=True)
    ema_50 = Column(Float, nullable=True)
    ema_200 = Column(Float, nullable=True)
    beta = Column(Float, nullable=True)
    avg_volume_20d = Column(Float, nullable=True)

    stock = relationship("Stock", back_populates="technical_indicators")

class OrderBookUpdate(Base):
    __tablename__ = "order_book_updates"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    order_value = Column(Float)  # value in Cr
    client = Column(String(255))
    order_date = Column(DateTime)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stock = relationship("Stock", back_populates="order_book_updates")

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    url = Column(String(512))
    source = Column(String(100))
    published_date = Column(DateTime)
    sentiment = Column(String(20))  # Positive, Negative, Neutral
    summary = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stock = relationship("Stock", back_populates="news")

class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    report_date = Column(DateTime, default=datetime.datetime.utcnow)
    report_json = Column(Text)  # Stores complete structured report in JSON format
    rating = Column(String(20))  # Strong Buy, Buy, Watchlist, Avoid
    score = Column(Float)
    confidence_score = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stock = relationship("Stock", back_populates="analysis_reports")

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="watchlists")
    items = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    stock_symbol = Column(String(20), nullable=False)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    watchlist = relationship("Watchlist", back_populates="items")

class SavedFilter(Base):
    __tablename__ = "saved_filters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    filter_json = Column(Text, nullable=False)  # JSON string of filter configuration
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="saved_filters")

class BacktestingResult(Base):
    __tablename__ = "backtesting_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    strategy_name = Column(String(100), nullable=False)
    parameters_json = Column(Text, nullable=False)
    metrics_json = Column(Text, nullable=False)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50))
    target_id = Column(String(100))
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    target_symbol = Column(String(20), nullable=True) # Persisted active stock context
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(50), nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    meta_json = Column(Text, nullable=True) # stores sources, scores, or tables

    conversation = relationship("Conversation", back_populates="messages")

class StockPriceHistory(Base):
    __tablename__ = "stock_price_history"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)

    __table_args__ = (UniqueConstraint('stock_symbol', 'date', name='_stock_date_uc'),)

    stock = relationship("Stock", back_populates="price_history")


class StockArticle(Base):
    """Stores fetched news articles, blogs, and web content for each stock."""
    __tablename__ = "stock_articles"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(512), nullable=False)
    url = Column(String(1024), unique=True, nullable=False)       # dedup key
    source = Column(String(100), nullable=True)                   # e.g. "Google News", "ET Markets"
    source_type = Column(String(50), default="news")              # "news", "blog", "analysis", "exchange_notice"
    published_date = Column(DateTime, nullable=True)
    content_text = Column(Text, nullable=True)                    # Cleaned full article body
    summary = Column(Text, nullable=True)                         # LLM-generated 2-sentence summary
    sentiment = Column(String(20), nullable=True)                 # Positive, Negative, Neutral
    is_vectorized = Column(Boolean, default=False)                # True after pushed to Qdrant
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (UniqueConstraint('url', name='_article_url_uc'),)

    stock = relationship("Stock", back_populates="articles")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False, index=True)
    indicator = Column(String(50), nullable=False) # "RSI", "Sentiment", "Price"
    operator = Column(String(10), nullable=False)  # ">", "<", "=="
    threshold_value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stock = relationship("Stock")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="WARNING") # INFO, WARNING, CRITICAL
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stock = relationship("Stock")


