import requests
import logging
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class OllamaClient:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.llm_model = settings.OLLAMA_LLM_MODEL
        self.embed_model = settings.OLLAMA_EMBED_MODEL

    def generate_completion(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.llm_model,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        try:
            response = requests.post(url, json=payload, timeout=90)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
        except Exception as e:
            logger.error(f"Error calling Ollama LLM generate completion: {e}")
            raise Exception(f"Ollama generation failed: {e}")

    def generate_embeddings(self, text: str) -> List[float]:
        url = f"{self.base_url}/api/embed"
        payload = {
            "model": self.embed_model,
            "input": text
        }
        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            # The API returns embeddings list under embeddings key, or embedding key
            # Let's extract carefully based on typical Ollama embedding response structure
            embeddings = data.get("embeddings")
            if embeddings and len(embeddings) > 0:
                return embeddings[0]
            # Sometimes if input is string, it returns "embedding" directly or a flat list
            embedding = data.get("embedding")
            if embedding:
                return embedding
            raise ValueError(f"Unexpected embedding response structure: {data}")
        except Exception as e:
            logger.error(f"Error calling Ollama Embeddings API: {e}")
            raise Exception(f"Ollama embedding failed: {e}")

# Global singleton client
ollama_client = OllamaClient()
