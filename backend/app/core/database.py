import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Attempt to connect to PostgreSQL; fallback to SQLite if connection fails
try:
    db_url = settings.DATABASE_URL
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=10
    )
    # Test connection
    with engine.connect() as conn:
        pass
except Exception:
    db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    os.makedirs(db_dir, exist_ok=True)
    sqlite_path = os.path.join(db_dir, "stock_rag.db")
    db_url = f"sqlite:///{sqlite_path}"
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
