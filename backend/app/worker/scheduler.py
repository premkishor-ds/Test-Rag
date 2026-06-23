import os
import time
import logging
import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.services.ingestion import IngestionEngine

logger = logging.getLogger(__name__)

class MonthlyScheduler:
    def __init__(self):
        self.db = SessionLocal()
        self.ingestion_engine = IngestionEngine(self.db)

    def scan_and_update(self):
        logger.info("Starting monthly update system process...")
        try:
            # 1. Sync stocks database from stocks.csv
            stocks = self.ingestion_engine.sync_stocks_from_csv()
            logger.info(f"Synced {len(stocks)} stocks from CSV.")

            # 2. Check for new documents in the storage directory
            doc_dir = os.path.join(settings.DATA_DIR, "documents")
            if not os.path.exists(doc_dir):
                os.makedirs(doc_dir, exist_ok=True)
                logger.info(f"Created documents directory at {doc_dir}. Place annual reports and filings here.")

            files = os.listdir(doc_dir)
            logger.info(f"Found {len(files)} files in documents directory.")

            # Look for format: SYMBOL_FY202X_AnnualReport.pdf/txt
            for filename in files:
                file_path = os.path.join(doc_dir, filename)
                if not os.path.isfile(file_path):
                    continue

                # Parse filename to identify stock symbol and financial year
                # E.g. "KAYNES_2025_AnnualReport.txt"
                parts = filename.split("_")
                if len(parts) >= 2:
                    symbol = parts[0].upper()
                    fy_str = parts[1]
                    
                    # Verify if it's a valid stock
                    from app.models.models import Stock, AnnualReport
                    stock_exists = self.db.query(Stock).filter(Stock.symbol == symbol).first()
                    if not stock_exists:
                        continue

                    try:
                        fy = int(fy_str)
                    except ValueError:
                        continue

                    # Check if already ingested (i.e. file_path matches and version latest exists)
                    exists = self.db.query(AnnualReport).filter(
                        AnnualReport.stock_symbol == symbol,
                        AnnualReport.file_path == file_path
                    ).first()

                    if not exists:
                        logger.info(f"New document detected: {filename}. Processing...")
                        success = self.ingestion_engine.ingest_document(
                            file_path=file_path,
                            stock_symbol=symbol,
                            source_type="annual_report",
                            financial_year=fy
                        )
                        if success:
                            logger.info(f"Ingested {filename} successfully.")
                        else:
                            logger.error(f"Failed to ingest {filename}.")
                    else:
                        logger.info(f"File {filename} has already been ingested. Skipping.")

            # 3. Update or generate mock financial data metrics for backtesting/screener if missing
            self._ensure_stock_metrics()

        except Exception as e:
            logger.error(f"Error during monthly update: {e}")
        finally:
            self.db.close()

    def _ensure_stock_metrics(self):
        import random
        from app.models.models import Stock, FinancialMetric, ValuationMetric, TechnicalIndicator
        stocks = self.db.query(Stock).all()
        for s in stocks:
            # Seed random generator based on symbol name to make outputs deterministic for each stock
            random.seed(hash(s.symbol))

            # Financial metrics
            fm = self.db.query(FinancialMetric).filter(FinancialMetric.stock_symbol == s.symbol).first()
            if not fm:
                rev = random.uniform(100.0, 6000.0)
                growth = random.uniform(-10.0, 50.0)
                net_profit = rev * random.uniform(0.04, 0.22)
                prof_growth = growth * random.uniform(0.8, 1.25)
                fm = FinancialMetric(
                    stock_symbol=s.symbol,
                    financial_year=2025,
                    revenue=round(rev, 2),
                    revenue_growth=round(growth, 2),
                    net_profit=round(net_profit, 2),
                    profit_growth=round(prof_growth, 2),
                    roce=round(random.uniform(5.0, 38.0), 2),
                    roe=round(random.uniform(5.0, 32.0), 2),
                    debt_to_equity=round(random.uniform(0.0, 2.0), 2),
                    cash_flow_from_operations=round(net_profit * random.uniform(0.55, 1.15), 2),
                    promoter_holding=round(random.uniform(30.0, 75.0), 2),
                    fii_holding=round(random.uniform(1.0, 26.0), 2),
                    dii_holding=round(random.uniform(1.0, 26.0), 2),
                    order_book=round(rev * random.uniform(0.1, 2.8), 2)
                )
                self.db.add(fm)

            # Valuation metrics
            vm = self.db.query(ValuationMetric).filter(ValuationMetric.stock_symbol == s.symbol).first()
            if not vm:
                base_val = s.market_cap / 10.0 if s.market_cap else random.uniform(100.0, 2000.0)
                vm = ValuationMetric(
                    stock_symbol=s.symbol,
                    pe_ratio=round(random.uniform(10.0, 110.0), 2),
                    ev_ebitda=round(random.uniform(5.0, 55.0), 2),
                    peg_ratio=round(random.uniform(0.4, 3.2), 2),
                    fifty_two_week_high=round(base_val * random.uniform(1.1, 1.55), 2),
                    fifty_two_week_low=round(base_val * random.uniform(0.6, 0.95), 2)
                )
                self.db.add(vm)

            # Technical indicators
            ti = self.db.query(TechnicalIndicator).filter(TechnicalIndicator.stock_symbol == s.symbol).first()
            if not ti:
                base_val = s.market_cap / 10.0 if s.market_cap else random.uniform(100.0, 2000.0)
                ti = TechnicalIndicator(
                    stock_symbol=s.symbol,
                    rsi=round(random.uniform(28.0, 82.0), 2),
                    macd=round(random.uniform(-8.0, 45.0), 2),
                    sma_50=round(base_val * random.uniform(0.9, 1.2), 2),
                    sma_200=round(base_val * random.uniform(0.8, 1.1), 2),
                    volume_breakout=random.choice([True, False]),
                    relative_strength=round(random.uniform(0.6, 2.2), 2),
                    trend_strength=random.choice(["Bullish", "Bearish", "Neutral"])
                )
                self.db.add(ti)
        self.db.commit()

def run_scheduler_loop():
    scheduler = MonthlyScheduler()
    # Runs the job immediately upon startup, then every 30 days
    while True:
        try:
            scheduler.scan_and_update()
        except Exception as e:
            logger.error(f"Scheduler exception: {e}")
        time.sleep(30 * 86400) # Sleep for 30 days
