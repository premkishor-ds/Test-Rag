import os
import time
import logging
import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.services.ingestion import IngestionEngine, fetch_stock_data_from_yahoo, fetch_and_save_pdf, fetch_corporate_document

logger = logging.getLogger(__name__)

class MonthlyScheduler:
    def __init__(self):
        # No long-lived DB session — a fresh session is created per scan_and_update() run
        # to avoid "session already closed" crashes on repeated scheduler cycles.
        pass

    def scan_and_update(self):
        logger.info("Starting monthly update system process...")
        # FIX: Create a fresh DB session each run — the old session is closed in finally:
        # so reusing self.db on repeated runs would raise an error.
        db = SessionLocal()
        ingestion_engine = IngestionEngine(db)
        try:
            # 1. Sync stocks database from stocks.csv
            stocks = ingestion_engine.sync_stocks_from_csv()
            logger.info(f"Synced {len(stocks)} stocks from CSV.")

            # Auto-download missing reports from internet (current year + last 2 years)
            from app.models.models import AnnualReport, CorporateDocument
            current_year = datetime.datetime.now().year
            target_years = [current_year - 2, current_year - 1, current_year]

            for s in stocks:
                if not s.sector or s.sector == "Unknown" or s.market_cap == 0.0:
                    logger.info(f"Skipping auto-download of annual reports for unlisted/mock stock: {s.symbol}")
                    continue
                for fy in target_years:
                    existing_report = db.query(CorporateDocument).filter(
                        CorporateDocument.stock_symbol == s.symbol,
                        CorporateDocument.document_type == "annual_report",
                        CorporateDocument.financial_year == fy
                    ).first()
                    if not existing_report:
                        logger.info(f"No annual report found for {s.symbol} (FY{fy}) in database. Attempting auto-download...")
                        downloaded_path = fetch_and_save_pdf(s.symbol, fy)
                        if downloaded_path:
                            ingestion_engine.ingest_document(
                                file_path=downloaded_path,
                                stock_symbol=s.symbol,
                                source_type="annual_report",
                                financial_year=fy
                            )

            # Auto-download missing quarterly documents (last 8 quarters of results, concalls, and presentations)
            now = datetime.datetime.now()
            curr_y = now.year
            curr_m = now.month
            if 1 <= curr_m <= 3:
                curr_q = 1
            elif 4 <= curr_m <= 6:
                curr_q = 2
            elif 7 <= curr_m <= 9:
                curr_q = 3
            else:
                curr_q = 4

            quarters_to_check = []
            q_val = curr_q
            y_val = curr_y
            for _ in range(8):
                quarters_to_check.append({"year": y_val, "quarter": f"Q{q_val}"})
                q_val -= 1
                if q_val == 0:
                    q_val = 4
                    y_val -= 1

            doc_types = ["quarterly_result", "concall", "presentation"]

            for s in stocks:
                if not s.sector or s.sector == "Unknown" or s.market_cap == 0.0:
                    logger.info(f"Skipping auto-download of quarterly documents for unlisted/mock stock: {s.symbol}")
                    continue
                for q_info in quarters_to_check:
                    fy = q_info["year"]
                    q_num = q_info["quarter"]
                    for dtype in doc_types:
                        existing_doc = db.query(CorporateDocument).filter(
                            CorporateDocument.stock_symbol == s.symbol,
                            CorporateDocument.document_type == dtype,
                            CorporateDocument.financial_year == fy,
                            CorporateDocument.quarter == q_num
                        ).first()
                        if not existing_doc:
                            logger.info(f"No {dtype} found for {s.symbol} (FY{fy} {q_num}) in database. Attempting auto-download...")
                            downloaded_path = fetch_corporate_document(
                                symbol=s.symbol,
                                document_type=dtype,
                                financial_year=fy,
                                quarter=q_num
                            )
                            if downloaded_path:
                                ingestion_engine.ingest_document(
                                    file_path=downloaded_path,
                                    stock_symbol=s.symbol,
                                    source_type=dtype,
                                    financial_year=fy,
                                    quarter=q_num
                                )

            # 2. Check for new documents in the storage directory
            doc_dir = os.path.join(settings.DATA_DIR, "documents")
            if not os.path.exists(doc_dir):
                os.makedirs(doc_dir, exist_ok=True)
                logger.info(f"Created documents directory at {doc_dir}. Place annual reports and filings here.")

            files = os.listdir(doc_dir)
            logger.info(f"Found {len(files)} files in documents directory.")

            # Look for format: SYMBOL_YEAR_QUARTER_TYPE.pdf OR SYMBOL_YEAR_TYPE.pdf
            for filename in files:
                file_path = os.path.join(doc_dir, filename)
                if not os.path.isfile(file_path):
                    continue

                parts = filename.split("_")
                if len(parts) >= 2:
                    symbol = parts[0].upper()

                    # Verify if it's a valid stock
                    from app.models.models import Stock, CorporateDocument
                    stock_exists = db.query(Stock).filter(Stock.symbol == symbol).first()
                    if not stock_exists:
                        continue

                    try:
                        fy = int(parts[1])
                    except ValueError:
                        continue

                    # Robust filename parsing
                    remaining = "_".join(parts[2:]).lower()
                    
                    quarter = None
                    # Search for Q1, Q2, Q3, Q4
                    import re
                    q_match = re.search(r'\bq[1-4]\b', remaining)
                    if q_match:
                        quarter = q_match.group(0).upper()
                    
                    dtype = "annual_report"
                    if "concall" in remaining or "transcript" in remaining:
                        dtype = "concall"
                    elif "presentation" in remaining or "ppt" in remaining:
                        dtype = "presentation"
                    elif "result" in remaining or "quarterly" in remaining:
                        dtype = "quarterly_result"

                    # Check if already ingested using CorporateDocument
                    exists = db.query(CorporateDocument).filter(
                        CorporateDocument.stock_symbol == symbol,
                        CorporateDocument.document_type == dtype,
                        CorporateDocument.financial_year == fy,
                        CorporateDocument.quarter == quarter,
                        CorporateDocument.file_path == file_path
                    ).first()

                    if not exists:
                        logger.info(f"New document detected: {filename}. Processing...")
                        success = ingestion_engine.ingest_document(
                            file_path=file_path,
                            stock_symbol=symbol,
                            source_type=dtype,
                            financial_year=fy,
                            quarter=quarter
                        )
                        if success:
                            logger.info(f"Ingested {filename} successfully.")
                        else:
                            logger.error(f"Failed to ingest {filename}.")
                    else:
                        logger.info(f"File {filename} has already been ingested. Skipping.")

            # 3. Update or generate mock financial data metrics for backtesting/screener if missing
            self._ensure_stock_metrics(db)

        except Exception as e:
            logger.error(f"Error during monthly update: {e}")
        finally:
            db.close()

    def _ensure_stock_metrics(self, db):
        """Populate missing financial/valuation/technical metrics for all stocks."""
        import random
        from app.models.models import Stock, FinancialMetric, ValuationMetric, TechnicalIndicator, StockPriceHistory
        stocks = db.query(Stock).all()
        for s in stocks:
            # Try fetching real data from Yahoo Finance
            yf = fetch_stock_data_from_yahoo(s.symbol)
            has_yf = yf and yf.get("name") != s.symbol

            # Seed random generator for consistent mock fallback
            random.seed(hash(s.symbol))

            # Store daily closures in StockPriceHistory
            if has_yf and yf.get("history_prices"):
                try:
                    # Clean up existing price history to avoid duplicate constraints on refresh
                    db.query(StockPriceHistory).filter(StockPriceHistory.stock_symbol == s.symbol).delete()
                    
                    # Insert history prices
                    for hp in yf["history_prices"]:
                        price_entry = StockPriceHistory(
                            stock_symbol=s.symbol,
                            date=hp["date"],
                            close_price=hp["close"],
                            volume=hp["volume"]
                        )
                        db.add(price_entry)
                except Exception as e:
                    logger.error(f"Error saving price history for {s.symbol}: {e}")

            # Financial metrics
            fm = db.query(FinancialMetric).filter(FinancialMetric.stock_symbol == s.symbol).first()
            if not fm:
                if has_yf:
                    fm = FinancialMetric(
                        stock_symbol=s.symbol,
                        financial_year=2025,
                        revenue=yf["revenue"],
                        revenue_growth=yf["revenue_growth"],
                        net_profit=yf["net_profit"],
                        profit_growth=yf["profit_growth"],
                        roce=yf["roce"],
                        roe=yf["roe"],
                        debt_to_equity=yf["debt_to_equity"],
                        cash_flow_from_operations=yf["cash_flow"],
                        promoter_holding=round(random.uniform(40.0, 75.0), 2),
                        fii_holding=round(random.uniform(1.0, 25.0), 2),
                        dii_holding=round(random.uniform(1.0, 25.0), 2),
                        order_book=round(yf["revenue"] * random.uniform(0.1, 2.0), 2),
                        capex=yf["capex"],
                        free_cash_flow=yf["free_cash_flow"],
                        ebitda=yf["ebitda"],
                        opm_pct=yf["opm_pct"],
                        npm_pct=yf["npm_pct"],
                        interest_coverage=yf["interest_coverage"],
                        debtor_days=yf["debtor_days"],
                        inventory_turnover=yf["inventory_turnover"],
                        promoter_pledged_pct=yf["promoter_pledged_pct"]
                    )
                else:
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
                        order_book=round(rev * random.uniform(0.1, 2.8), 2),
                        capex=round(rev * 0.05, 2),
                        free_cash_flow=round(net_profit * 0.4, 2),
                        ebitda=round(rev * 0.15, 2),
                        opm_pct=15.0,
                        npm_pct=10.0,
                        interest_coverage=6.0,
                        debtor_days=45,
                        inventory_turnover=8.0,
                        promoter_pledged_pct=0.0
                    )
                db.add(fm)
            elif has_yf:
                # Update existing metrics with new fundamental data
                fm.capex = yf["capex"]
                fm.free_cash_flow = yf["free_cash_flow"]
                fm.ebitda = yf["ebitda"]
                fm.opm_pct = yf["opm_pct"]
                fm.npm_pct = yf["npm_pct"]
                fm.interest_coverage = yf["interest_coverage"]
                fm.debtor_days = yf["debtor_days"]
                fm.inventory_turnover = yf["inventory_turnover"]
                fm.promoter_pledged_pct = yf["promoter_pledged_pct"]

            # Valuation metrics
            vm = db.query(ValuationMetric).filter(ValuationMetric.stock_symbol == s.symbol).first()
            if not vm:
                if has_yf and yf.get("pe_ratio") is not None:
                    vm = ValuationMetric(
                        stock_symbol=s.symbol,
                        pe_ratio=yf["pe_ratio"],
                        ev_ebitda=round(yf["pe_ratio"] * 0.6, 2) if yf["pe_ratio"] else None,
                        peg_ratio=yf["peg_ratio"],
                        fifty_two_week_high=yf["fifty_two_week_high"],
                        fifty_two_week_low=yf["fifty_two_week_low"]
                    )
                else:
                    base_val = s.market_cap / 10.0 if s.market_cap else random.uniform(100.0, 2000.0)
                    vm = ValuationMetric(
                        stock_symbol=s.symbol,
                        pe_ratio=round(random.uniform(10.0, 110.0), 2),
                        ev_ebitda=round(random.uniform(5.0, 55.0), 2),
                        peg_ratio=round(random.uniform(0.4, 3.2), 2),
                        fifty_two_week_high=round(base_val * random.uniform(1.1, 1.55), 2),
                        fifty_two_week_low=round(base_val * random.uniform(0.6, 0.95), 2)
                    )
                db.add(vm)

            # Technical indicators
            ti = db.query(TechnicalIndicator).filter(TechnicalIndicator.stock_symbol == s.symbol).first()
            if not ti:
                base_val = yf["current_price"] if (has_yf and yf.get("current_price")) else (s.market_cap / 10.0 if s.market_cap else random.uniform(100.0, 2000.0))
                ti = TechnicalIndicator(
                    stock_symbol=s.symbol,
                    rsi=round(random.uniform(28.0, 82.0), 2),
                    macd=round(random.uniform(-8.0, 45.0), 2),
                    sma_50=round(base_val * random.uniform(0.9, 1.2), 2),
                    sma_200=round(base_val * random.uniform(0.8, 1.1), 2),
                    volume_breakout=random.choice([True, False]),
                    relative_strength=round(random.uniform(0.6, 2.2), 2),
                    trend_strength=random.choice(["Bullish", "Bearish", "Neutral"]),
                    ema_20=yf["ema_20"] if has_yf else base_val,
                    ema_50=yf["ema_50"] if has_yf else base_val,
                    ema_200=yf["ema_200"] if has_yf else base_val,
                    avg_volume_20d=yf["avg_volume_20d"] if has_yf else 50000.0,
                    beta=yf["beta"] if has_yf else 1.0
                )
                db.add(ti)
            elif has_yf:
                # Update existing metrics with new technical data
                ti.ema_20 = yf["ema_20"]
                ti.ema_50 = yf["ema_50"]
                ti.ema_200 = yf["ema_200"]
                ti.avg_volume_20d = yf["avg_volume_20d"]
                ti.beta = yf["beta"]
        db.commit()

def run_scheduler_loop():
    scheduler = MonthlyScheduler()
    # Runs the job immediately upon startup, then every 30 days
    while True:
        try:
            scheduler.scan_and_update()
        except Exception as e:
            logger.error(f"Scheduler exception: {e}")
        time.sleep(30 * 86400) # Sleep for 30 days
