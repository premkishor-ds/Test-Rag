# Stock Market RAG Platform

An enterprise-grade qualitative research and quantitative analysis platform for Indian stocks, built on a local RAG stack using **FastAPI**, **Next.js**, **SQLite** (with Postgres capability), **Qdrant**, and **Ollama (Qwen2.5:14B + Nomic Embed Text)**.

---

## Getting Started

### 1. Prerequisites
- **Python 3.10+** installed.
- **Node.js 18+** installed.
- **Ollama** running locally on the host machine with these models downloaded:
  ```bash
  ollama pull qwen2.5:14b
  ollama pull nomic-embed-text
  ```

### 2. Manual Setup & Startup (Local Mode)

If you do not have Docker installed, you can run both services natively:

#### A. Backend Setup
1. Open a terminal in the `backend/` directory.
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Start the FastAPI backend:
   ```powershell
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   *The backend will boot up, create a local SQLite database file `backend/data/stock_rag.db`, and run Qdrant in embedded mode using persistent file storage under `backend/data/qdrant_storage/`.*

#### B. Frontend Setup
1. Open a separate terminal in the `frontend/` directory.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**.

---

## Detailed Step-by-Step User Guide

Follow these steps to research and analyze stocks on your platform:

### Step 1: Register New Stocks (Symbols Only!)
To track new companies, you only need to supply the stock ticker symbol (e.g. `INFY`, `RELIANCE`, `TCS`). The system automatically queries the **Yahoo Finance Live API** over the internet to fetch and populate:
- **Company Profile**: Full Name, Sector, and Industry.
- **Financial & Valuation Metrics**: Market Cap, PE Ratio, PEG Ratio, 52-Week High/Low, Total Revenue, Revenue/Earnings Growth, ROE, ROCE, and Operating Cash Flow.

*If there is no internet connection or a symbol is not found on Yahoo Finance, the system automatically falls back to the local Qwen2.5 model to enrich the metadata.*

1. Open the CSV file located at `backend/data/stocks.csv`.
2. Add your stock symbols under the `symbol` column (you can leave name, sector, industry, and market_cap empty!):
   ```csv
   symbol,name,sector,industry,market_cap
   INFY,,,,
   RELIANCE,,,,
   TCS,,,,
   ```
3. Save the file and start or restart the backend. The server logs will confirm the internet sync: `Enriching metadata for symbol: INFY from Yahoo Finance API...` and save all the real-time financial stats to your local database.

### Step 2: Upload Financial Documents & Filings
To enable qualitative RAG capabilities (AI chat & qualitative analysis):
1. Copy annual reports, investor presentations, or call transcripts (in `.pdf`, `.docx`, `.txt`, or `.html` formats) into the `backend/data/documents` folder.
2. **Naming Convention**: Name the file starting with `SYMBOL_YEAR` (matching the symbol registered in Step 1):
   - `INFY_2025_AnnualReport.txt`
   - `RELIANCE_2024_InvestorPresentation.pdf`
3. The background scheduler checks for updates. On boot (or on the scheduler loop), it will automatically parse the files, split them into chunks, vectorize them using local embeddings, and save them to the local Qdrant collection.

### Step 3: Use the Dashboard
- Open `http://localhost:3000`.
- The **Dashboard** displays your monitored stocks list synced from the CSV, the system status metrics, and confirms that PostgreSQL (or local SQLite), Qdrant, and Ollama are healthy and connected.

### Step 4: Run AI qualitative Research (RAG)
1. Navigate to the **AI Analysis** tab.
2. Select your stock from the dropdown (e.g. `INFY`) and click **Run AI Research**.
3. The local Qwen2.5:14B model will scan the loaded document chunks, combine them with the financial database metrics, and compile a report covering:
   - *Business Overview & Management Commentary*
   - *Revenue, profit, and cash flow analysis*
   - *SWOT, growth drivers, competitive moats, and tailwinds*
   - *Final deterministic investment rating (Strong Buy, Buy, Watchlist, Avoid)*
4. Use the **Document RAG Assistant** chatbox in the sidebar to ask specific qualitative questions:
   - *e.g., "What did management say about AI opportunities?"*
   - *e.g., "Summarize the key supply chain risks mentioned in the report."*

### Step 5: Screen Stocks
- Navigate to the **Screener** tab.
- Apply fundamental sliders (e.g. Min ROCE of 15%, Max PE of 35, Min Promoter Holding of 50%).
- Click **Apply Filters** to query the relational database and render the matching stock results. You can type a filter name and click **Save** to cache the filters.

### Step 6: Simulate Investment Strategies
- Navigate to the **Backtester** tab.
- Select a strategy (e.g. `High ROCE Value` or `Growth Momentum`) and select a duration (5, 10, 15, or 20 Years).
- Click **Run Backtest** to simulate returns. The engine calculates and renders the CAGR, Maximum Drawdowns, Sharpe, Sortino ratios, and graphs portfolio performance against the Nifty benchmark.

### Step 7: Manage Watchlists
- Navigate to the **Watchlists** tab.
- Create custom watchlists, add/remove stock tickers, and track historical score and rating differences when new quarterly results are uploaded.
