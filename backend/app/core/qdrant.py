import logging
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Qdrant client
try:
    # Try connecting to external server first with short timeout
    qdrant_client = QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
        timeout=3.0
    )
    qdrant_client.get_collections()
    logger.info(f"Successfully connected to external Qdrant server at {settings.QDRANT_URL}")
except Exception as e:
    logger.warning(f"Could not connect to external Qdrant at {settings.QDRANT_URL}: {e}. Falling back to local persistent Qdrant instance.")
    try:
        import os
        qdrant_dir = os.path.join(settings.DATA_DIR, "qdrant_storage")
        os.makedirs(qdrant_dir, exist_ok=True)
        qdrant_client = QdrantClient(path=qdrant_dir)
        logger.info(f"Initialized local persistent Qdrant DB at {qdrant_dir}")
    except Exception as local_err:
        logger.error(f"Failed to initialize local Qdrant: {local_err}")
        qdrant_client = None

def init_qdrant():
    if not qdrant_client:
        logger.error("Qdrant client not initialized. Skipping collection creation.")
        return

    collection_name = settings.QDRANT_COLLECTION_NAME
    try:
        # Check if collection exists
        qdrant_client.get_collection(collection_name)
        logger.info(f"Qdrant collection '{collection_name}' already exists.")
    except Exception as e:
        # If not exists (or other error), attempt to create
        logger.info(f"Creating Qdrant collection '{collection_name}'...")
        try:
            qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=qmodels.VectorParams(
                    size=768,  # Nomic embed text uses 768 dimensions
                    distance=qmodels.Distance.COSINE
                )
            )
            # Create payload index for fast filtering
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name="stock_symbol",
                field_schema=qmodels.PayloadSchemaType.KEYWORD,
            )
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name="source_type",
                field_schema=qmodels.PayloadSchemaType.KEYWORD,
            )
            logger.info(f"Successfully created collection '{collection_name}' with payload indexes.")
        except Exception as create_err:
            logger.error(f"Failed to create Qdrant collection '{collection_name}': {create_err}")
