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

    def generate_completion(self, prompt: str, system_prompt: Optional[str] = None, temperature: Optional[float] = None, model: Optional[str] = None) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model or self.llm_model,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
        if temperature is not None:
            payload["options"] = {"temperature": temperature}
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=90)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
        except Exception as e:
            logger.error(f"Error calling Ollama LLM generate completion: {e}")
            raise Exception(f"Ollama generation failed: {e}")

    def generate_completion_stream(self, prompt: str, system_prompt: Optional[str] = None, temperature: Optional[float] = None, model: Optional[str] = None):
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model or self.llm_model,
            "prompt": prompt,
            "stream": True
        }
        if system_prompt:
            payload["system"] = system_prompt
        if temperature is not None:
            payload["options"] = {"temperature": temperature}
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            response = requests.post(url, json=payload, headers=headers, stream=True, timeout=90)
            
            # If the remote server returns an error (e.g. 500 JSONDecodeError on their proxy),
            # gracefully fall back to non-streaming mode.
            if response.status_code != 200:
                logger.warning(f"Ollama stream returned status {response.status_code}. Falling back to non-stream mode.")
                fallback_text = self.generate_completion(prompt, system_prompt, temperature, model)
                yield fallback_text
                return
                
            import json
            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line.decode("utf-8"))
                    text = chunk.get("response", "")
                    if text:
                        yield text
        except Exception as e:
            logger.error(f"Error calling Ollama LLM stream: {e}. Falling back to non-stream.")
            try:
                fallback_text = self.generate_completion(prompt, system_prompt, temperature, model)
                yield fallback_text
            except Exception as ex:
                yield f"\n[Stream Error: {e} | Fallback Error: {ex}]"

    def generate_embeddings(self, text: str) -> List[float]:
        url = f"{self.base_url}/api/embed"
        payload = {
            "model": self.embed_model,
            "input": text
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
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
