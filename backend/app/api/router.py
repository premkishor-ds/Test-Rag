from fastapi import APIRouter
from app.api import endpoints
from app.api import ingest

api_router = APIRouter()
api_router.include_router(endpoints.router, tags=["core"])
api_router.include_router(ingest.router, tags=["ingestion"])

