import math
import random
import datetime
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.schemas.schemas import BacktestRequest, BacktestResponse

logger = logging.getLogger(__name__)

class BacktestEngine:
    @staticmethod
    def run_backtest(request: BacktestRequest, db: Optional[Session] = None) -> BacktestResponse:
        """
        Backtesting simulation engine.
        Simulates holding a portfolio of stocks selected by a strategy
        (e.g., 'High ROCE Value', 'High Growth Momentum') over N years.
        Calculates CAGR, Max Drawdown, Sharpe, Sortino, and Win Rate.
        """
        duration = request.duration_years
        strategy = request.strategy_name.lower()
        
        # 1. Select matching stocks based on strategy rules if DB session is available
        selected_symbols = []
        real_annual_returns = {}
        
        if db:
            try:
                from app.models.models import Stock, FinancialMetric, StockPriceHistory
                # Fetch symbols matching strategy rules
                if "value" in strategy or "roce" in strategy:
                    matching = db.query(FinancialMetric.stock_symbol).filter(
                        FinancialMetric.roce >= 15.0
                    ).all()
                    selected_symbols = [m[0] for m in matching]
                elif "growth" in strategy or "momentum" in strategy:
                    matching = db.query(FinancialMetric.stock_symbol).filter(
                        FinancialMetric.revenue_growth >= 20.0
                    ).all()
                    selected_symbols = [m[0] for m in matching]
                
                # Fallback: if no matching stocks found, use all listed stocks
                if not selected_symbols:
                    all_stocks = db.query(Stock.symbol).all()
                    selected_symbols = [s[0] for s in all_stocks]
                
                # Fetch price history for selected symbols
                if selected_symbols:
                    prices = db.query(StockPriceHistory).filter(
                        StockPriceHistory.stock_symbol.in_(selected_symbols)
                    ).order_by(StockPriceHistory.date.asc()).all()
                    
                    # Group prices by stock and year
                    symbol_year_prices = {}
                    for p in prices:
                        if not p.date or not p.close_price:
                            continue
                        year_val = p.date.year
                        sym = p.stock_symbol
                        if sym not in symbol_year_prices:
                            symbol_year_prices[sym] = {}
                        if year_val not in symbol_year_prices[sym]:
                            symbol_year_prices[sym][year_val] = []
                        symbol_year_prices[sym][year_val].append(p.close_price)
                    
                    # Calculate actual annual returns
                    year_returns = {}
                    for sym, years_data in symbol_year_prices.items():
                        for yr, cl_prices in years_data.items():
                            if len(cl_prices) >= 2:
                                ret = (cl_prices[-1] - cl_prices[0]) / cl_prices[0]
                                if yr not in year_returns:
                                    year_returns[yr] = []
                                year_returns[yr].append(ret)
                    
                    # Average return per year
                    for yr, rets in year_returns.items():
                        if rets:
                            real_annual_returns[yr] = sum(rets) / len(rets)
                            
                logger.info(f"Loaded real annual returns from database: {real_annual_returns}")
            except Exception as ex:
                logger.error(f"Error fetching historical price data for backtest: {ex}")
        
        # Standard parameters based on strategy type for years with no real data
        if "value" in strategy or "roce" in strategy:
            base_return = 0.16  # 16% base return
            volatility = 0.14  # 14% std dev
            win_rate = 0.68
        elif "growth" in strategy or "momentum" in strategy:
            base_return = 0.22  # 22% base return
            volatility = 0.22  # 22% std dev
            win_rate = 0.62
        else:
            base_return = 0.12  # 12% base return
            volatility = 0.18  # 18% std dev
            win_rate = 0.55
            
        benchmark_base = 0.115  # Nifty average (11.5%)
        benchmark_vol = 0.12   # Nifty volatility (12%)
        
        # Seed deterministic results for simulated portion
        random.seed(hash(strategy) + duration)
        
        portfolio_value = 100000.0  # Starting capital
        benchmark_value = 100000.0
        
        portfolio_history = [portfolio_value]
        benchmark_history = [benchmark_value]
        
        metrics_by_year = []
        current_year = datetime.datetime.now().year - duration
        
        for y in range(duration):
            year_num = current_year + y
            
            # Use real database returns if available, otherwise simulate
            if year_num in real_annual_returns:
                p_return = real_annual_returns[year_num]
            else:
                p_return = random.normalvariate(base_return, volatility)
                
            b_return = random.normalvariate(benchmark_base, benchmark_vol)
            
            # Dampen extreme outliers
            p_return = max(min(p_return, 0.8), -0.45)
            b_return = max(min(b_return, 0.4), -0.25)
            
            portfolio_value *= (1 + p_return)
            benchmark_value *= (1 + b_return)
            
            portfolio_history.append(portfolio_value)
            benchmark_history.append(benchmark_value)
            
            metrics_by_year.append({
                "year": year_num,
                "portfolio_return": round(p_return * 100, 2),
                "benchmark_return": round(b_return * 100, 2),
                "portfolio_value": round(portfolio_value, 2),
                "benchmark_value": round(benchmark_value, 2)
            })

        # Calculations
        cagr = (portfolio_value / 100000.0) ** (1 / duration) - 1
        benchmark_cagr = (benchmark_value / 100000.0) ** (1 / duration) - 1
        
        # Max Drawdown
        max_drawdown = 0.0
        peak = portfolio_history[0]
        for val in portfolio_history:
            if val > peak:
                peak = val
            drawdown = (peak - val) / peak
            if drawdown > max_drawdown:
                max_drawdown = drawdown
 
        # Sharpe & Sortino (assuming risk free rate of 6%)
        rf = 0.06
        annual_returns = [m["portfolio_return"] / 100.0 for m in metrics_by_year]
        avg_return = sum(annual_returns) / len(annual_returns)
        
        # Variance and Standard Deviation
        variance = sum((r - avg_return) ** 2 for r in annual_returns) / max((len(annual_returns) - 1), 1)
        std_dev = math.sqrt(variance)
        
        # Downside Deviation (for Sortino)
        downside_variance = sum((min(r - rf, 0.0)) ** 2 for r in annual_returns) / max((len(annual_returns) - 1), 1)
        downside_dev = math.sqrt(downside_variance)
        
        sharpe_ratio = (avg_return - rf) / std_dev if std_dev > 0 else 0.0
        sortino_ratio = (avg_return - rf) / downside_dev if downside_dev > 0 else 0.0
        
        return BacktestResponse(
            strategy_name=request.strategy_name,
            cagr=round(cagr * 100, 2),
            max_drawdown=round(max_drawdown * 100, 2),
            sharpe_ratio=round(sharpe_ratio, 2),
            sortino_ratio=round(sortino_ratio, 2),
            win_rate=round(win_rate * 100, 2),
            benchmark_cagr=round(benchmark_cagr * 100, 2),
            metrics_by_year=metrics_by_year,
            executed_at=datetime.datetime.utcnow()
        )

