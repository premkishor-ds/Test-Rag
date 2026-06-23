# Antigravity & AI IDE Run Rules
This project contains automated scripts to prepare the environment and start the development servers.

To start the project immediately without spending time on manual analysis, you MUST follow these steps:

1. **Environment Setup:**
   - Copy `backend/.envcopy` to `backend/.env`
   - Copy `frontend/.envcopy` to `frontend/.env.local`

2. **Dependencies Setup:**
   - On the backend (Python): Create a virtual environment (`python -m venv .venv`), activate it, and run `pip install -r backend/requirements.txt`.
   - On the frontend (Next.js/React): Run `npm install` inside the `frontend/` directory.

3. **Running the Application:**
   - The root folder contains a Python runner script: `run_project.py`.
   - Execute `python run_project.py` from the root directory to automatically perform sanity checks, clean databases, download reports, and start both the backend (FastAPI, port 8000) and frontend (Next.js, port 3000) servers.
   - Alternatively, start them in two separate terminal splits:
     - **Backend:** `cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
     - **Frontend:** `cd frontend && npm run dev`

---

## ⚠️ Critical Project Constraints for AI Agents

To avoid breaking existing logic, any AI agent working on this codebase MUST follow these constraints:

1. **Stock List Source of Truth:**
   - The file `backend/data/stocks.csv` is the absolute source of truth.
   - DO NOT write code that allows the system to add/remove stocks programmatically via endpoints or LLMs. Stocks must only be managed by modifying this CSV file. The backend syncs with it on startup.
   
2. **Local Embedding & Vector DB Config:**
   - SQLite DB is saved at `backend/data/stock_rag.db`.
   - Qdrant runs in **embedded mode** at `backend/data/qdrant_storage/`. DO NOT replace this with a Docker-based Qdrant client unless explicitly asked.

3. **Remote Ollama Server Configuration:**
   - The project uses a remote Ollama endpoint specified in the `.env` file (`OLLAMA_BASE_URL=https://ai-based-suncoast-rag-search-backend.24livehost.com`).
   - The embedding model is `nomic-embed-text` and the LLM model is `qwen2.5:14b`. Do not change these or force local model downloads unless requested.

4. **Scraping Limits & Schedules:**
   - **Annual & Quarterly Reports:** Synced automatically once on startup, then runs on a monthly background loop.
   - **Articles & News Feed Scraper:** Downloads up to 100 articles/stock from RSS feeds (Google News, ET Markets) and Moneycontrol/Bing. Runs in a background thread that refreshes every 24 hours.

