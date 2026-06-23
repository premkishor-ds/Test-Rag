import threading
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.core.config import settings
from app.core.database import engine, Base
from app.core.qdrant import init_qdrant
from app.api.router import api_router
from app.worker.scheduler import run_scheduler_loop

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Stock Market RAG Platform backend engine.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup Handler
@app.on_event("startup")
def startup_event():
    logger.info("Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}")

    logger.info("Initializing Qdrant indexes...")
    try:
        init_qdrant()
    except Exception as e:
        logger.error(f"Qdrant collection setup failed: {e}")

    logger.info("Starting background Monthly Update Scheduler...")
    scheduler_thread = threading.Thread(target=run_scheduler_loop, daemon=True)
    scheduler_thread.start()

# API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Health endpoint
@app.get("/health")
async def health_check():
    db_status = "healthy"
    qdrant_status = "healthy"
    ollama_status = "healthy"

    # 1. Check DB
    try:
        from sqlalchemy.sql import text
        from app.core.database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"unhealthy: {str(e)}"

    # 2. Check Qdrant
    try:
        from app.core.qdrant import qdrant_client
        if qdrant_client:
            qdrant_client.get_collection(settings.QDRANT_COLLECTION_NAME)
        else:
            qdrant_status = "unhealthy: client not initialized"
    except Exception as e:
        logger.error(f"Qdrant health check failed: {e}")
        qdrant_status = f"unhealthy: {str(e)}"

    # 3. Check Ollama
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(settings.OLLAMA_BASE_URL)
            if resp.status_code != 200:
                ollama_status = f"unhealthy: status code {resp.status_code}"
    except Exception as e:
        logger.error(f"Ollama health check failed: {e}")
        ollama_status = f"unhealthy: {str(e)}"

    return {
        "status": "online" if all(x == "healthy" for x in [db_status, qdrant_status, ollama_status]) else "degraded",
        "services": {
            "postgres": db_status,
            "qdrant": qdrant_status,
            "ollama": ollama_status
        }
    }
