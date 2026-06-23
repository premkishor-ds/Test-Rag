# Stock Market RAG Platform

An enterprise-grade qualitative research and quantitative analysis platform for Indian stocks, built on a fully **local AI stack** using **FastAPI**, **Next.js**, **SQLite**, **Qdrant**, and **Ollama**.

---

## 🏗️ Architecture Overview

```
stocks.csv  →  Backend (FastAPI)  →  SQLite DB
                     │                    │
                     ├── Yahoo Finance API  → Financial & Valuation Metrics
                     ├── Screener.in Scraper → PDFs (Annual Reports, Concalls)
                     ├── Article Fetcher    → News / Blogs (Google News, ET, Moneycontrol)
                     └── Qdrant (local)     → Vector Embeddings (Ollama nomic-embed-text)
                                                      │
                                             Ollama LLM (Qwen2.5:14B)
                                                      │
                                         Next.js Frontend (port 3000)
```

---

## ⚙️ Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** running locally with these models:
  ```bash
  ollama pull qwen2.5:14b
  ollama pull nomic-embed-text
  ```

### Backend Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

On first boot the backend will:
- Create `backend/data/stock_rag.db` (SQLite)
- Initialize Qdrant in embedded mode under `backend/data/qdrant_storage/`
- Sync stocks from `stocks.csv` into the database
- Start the **Monthly Scheduler** (PDF reports, financial metrics)
- Start the **Daily Article Refresh** (news, blogs, articles for each stock)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

---

## 📂 Managing Stocks

### Adding / Removing Stocks — Edit `backend/data/stocks.csv` only

> ⚠️ **Do NOT rename or delete this file.** The system reads it on every startup.

```csv
symbol,name,sector,industry,market_cap
GROWW,,,,
AEROFLEX,,,,
NETWEB,,,,
```

- You only need to fill the `symbol` column — everything else is auto-enriched.
- **To remove a stock**: delete its row from the CSV. On the next restart, the backend automatically removes it from the database.
- **To add a stock**: add a new row with the NSE symbol. On startup it will auto-fetch from Yahoo Finance.

The backend logs confirm sync: `Synced N stocks from CSV.`

---

## 🚀 Feature Guide

### Step 1 — Stock Registration (Auto)

When you add a symbol to `stocks.csv` and restart the backend, it automatically:
- Queries **Yahoo Finance** for: Company name, Sector, Industry, Market Cap, Revenue, Net Profit, ROCE, ROE, Debt/Equity, P/E ratio, 52-week High/Low, EMA 20/50/200, Beta, RSI, Cash Flow
- Falls back to Qwen2.5 LLM if Yahoo Finance returns no data
- Stores all metrics in SQLite

---

### Step 2 — Automatic Document Download

The scheduler auto-downloads from Screener.in and BSE/NSE:
- **Annual Reports** (PDF)
- **Quarterly Results** (PDF)
- **Concall Transcripts** (PDF)
- **Investor Presentations** (PDF)

You can also manually place documents in `backend/data/documents/` using this naming convention:
```
SYMBOL_YEAR_TYPE.pdf             → NETWEB_2025_AnnualReport.pdf
SYMBOL_YEAR_QUARTER_TYPE.pdf     → AEROFLEX_2025_Q3_concall.pdf
```

Documents are automatically parsed, chunked, and vectorized into Qdrant.

---

### Step 3 — Automatic News & Article Ingestion 📰

Every **24 hours**, the system automatically fetches up to **100 articles per stock** from:

| Source | Type |
|--------|------|
| Google News RSS | Latest news headlines |
| Economic Times RSS | Market & company news |
| Moneycontrol | Stock-specific articles |
| Bing News | Additional coverage |

For each article:
- ✅ Full article body is scraped
- ✅ Sentiment detected: **Positive / Negative / Neutral**
- ✅ 2-sentence LLM summary generated
- ✅ Vectorized into Qdrant for semantic search
- ✅ AI Chat automatically surfaces relevant articles in answers

**To manually refresh articles for a stock**, use the REST API:
```
POST http://localhost:8000/api/v1/stock/GROWW/articles/refresh
```

Or click the **Refresh** button in the Analysis page News Feed panel.

---

### Step 4 — AI Analysis Page

1. Navigate to **Analysis** in the sidebar.
2. Select a stock from the dropdown and click **Run AI Research**.
3. The LLM compiles a full qualitative report:
   - Business Overview & Management Commentary
   - Revenue, Profit & Cash Flow Analysis
   - SWOT, Growth Drivers, Competitive Moats
   - Order Book & Sector Tailwinds
   - Final investment rating: **Strong Buy / Buy / Watchlist / Avoid**
4. Use the **Document RAG Assistant** chat for specific qualitative questions.
5. The **News Feed panel** (bottom of the page) shows the latest 50 articles with:
   - 🟢 Positive / 🔴 Negative / 🟡 Neutral sentiment badges
   - LLM-generated 2-line summaries
   - Source & date labels
   - Direct links to original articles

---

### Step 5 — AI Chat

Navigate to **Chat** to ask free-form questions across all stocks:

> *"Compare GROWW and NETWEB on ROCE and revenue growth"*
> *"What is the latest news on AEROFLEX?"*
> *"Which stocks have the lowest debt-to-equity ratio?"*
> *"What did management say about order book growth?"*

The AI Chat uses a **Hybrid RAG** pipeline:
- **Structured context**: Financial & technical metrics from SQLite
- **Recent headlines**: Top 7 latest news articles with sentiment
- **Vector search**: Semantic search over PDFs and article chunks in Qdrant
- **Reranking**: LLM-based reranking of retrieved chunks for best relevance

---

### Step 6 — Screener

Navigate to **Screener** and apply fundamental filters:
- Min/Max ROCE, ROE, Revenue Growth, Profit Growth
- Max Debt-to-Equity
- Min Promoter Holding
- Max P/E Ratio

Save custom filter sets for reuse.

---

### Step 7 — Backtester

Navigate to **Backtester**:
- Choose a strategy: `High ROCE Value`, `Growth Momentum`, etc.
- Select duration: 5, 10, 15, or 20 years
- View CAGR, Max Drawdown, Sharpe Ratio vs. Nifty benchmark

---

### Step 8 — Watchlists

Navigate to **Watchlists** to create and manage custom stock groups.

---

## 🗄️ Database Tables

| Table | Contents |
|-------|----------|
| `stocks` | Core stock profile (symbol, name, sector, industry, market cap) |
| `financial_metrics` | Revenue, net profit, ROCE, ROE, debt/equity, cash flow, capex, EBITDA, margins |
| `valuation_metrics` | P/E, EV/EBITDA, PEG, 52-week high/low |
| `technical_indicators` | RSI, MACD, EMA 20/50/200, Beta, trend strength, volume |
| `stock_articles` | News articles with title, URL, source, sentiment, LLM summary, vectorized flag |
| `annual_reports` | Ingested PDF annual reports |
| `corporate_documents` | All corporate filings (concalls, presentations, quarterly results) |
| `stock_price_history` | Daily close prices and volumes from Yahoo Finance |

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/stocks` | List all tracked stocks |
| GET | `/api/v1/stock/{symbol}` | Single stock profile |
| GET | `/api/v1/financials?symbol=X` | Financial metrics for a stock |
| POST | `/api/v1/analyze` | Generate qualitative research report |
| POST | `/api/v1/chat` | AI Chat with RAG (streaming) |
| GET | `/api/v1/stock/{symbol}/articles` | List fetched articles for a stock |
| POST | `/api/v1/stock/{symbol}/articles/refresh` | Trigger manual article refresh |
| GET | `/api/v1/stock/{symbol}/price-history` | Historical price data |
| POST | `/api/v1/screener/filter` | Apply fundamental screener filters |
| POST | `/api/v1/backtest` | Run investment strategy backtest |
| GET | `/health` | System health (DB, Qdrant, Ollama) |

Full interactive API docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 📁 Project Structure

```
Test Rag/
├── backend/
│   ├── app/
│   │   ├── api/           → REST endpoints (endpoints.py, ingest.py)
│   │   ├── core/          → Config, Ollama client, Qdrant client, DB session
│   │   ├── models/        → SQLAlchemy ORM models (models.py)
│   │   ├── schemas/       → Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ingestion.py      → PDF parsing, chunking, vectorization
│   │   │   ├── article_fetcher.py → News/article download & sentiment
│   │   │   ├── rag.py            → Hybrid RAG query engine
│   │   │   ├── stock_chat.py     → AI Chat service
│   │   │   ├── analysis.py       → Qualitative report generation
│   │   │   ├── screener.py       → Fundamental screener
│   │   │   └── backtest.py       → Backtesting engine
│   │   └── worker/
│   │       └── scheduler.py      → Monthly PDF sync + Daily article refresh
│   └── data/
│       ├── stocks.csv            → ⚠️ Source of truth for tracked stocks
│       ├── stock_rag.db          → SQLite database (auto-created)
│       ├── documents/            → PDF reports (auto-downloaded + manual)
│       └── qdrant_storage/       → Local Qdrant vector store
└── frontend/
    ├── src/app/
    │   ├── page.tsx              → Dashboard
    │   ├── chat/page.tsx         → AI Chat
    │   ├── analysis/page.tsx     → AI Analysis + News Feed
    │   ├── screener/page.tsx     → Stock Screener
    │   ├── backtester/page.tsx   → Backtester
    │   └── watchlist/page.tsx    → Watchlists
    └── public/
```

---

## 🧠 AI Stack

| Component | Model / Tool |
|-----------|-------------|
| LLM | Ollama — `qwen2.5:14b` (local, no API key needed) |
| Embeddings | Ollama — `nomic-embed-text` |
| Vector DB | Qdrant (embedded, no separate server needed) |
| Reranking | LLM-based chunk reranking in `rag.py` |
| Sentiment | Keyword-based + LLM fallback in `article_fetcher.py` |

---

## ⚠️ Important Notes

- **`stocks.csv` is the only file you should edit** to add/remove stocks. Never edit it programmatically — the system manages the DB automatically from this file.
- All AI processing is **100% local** — no OpenAI, Anthropic, or cloud API calls.
- The first startup may take several minutes as it syncs all stocks and begins the article fetch cycle.
- Article fetching runs in a background thread and does **not** block the API server.
