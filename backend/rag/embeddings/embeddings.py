import logging
from typing import List
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("placementgpt")

class EmbeddingService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(EmbeddingService, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        if self._initialized:
            return
        logger.info(f"Loading SentenceTransformer model: {model_name}...")
        # Load model onto CPU (default for lightweight server instances)
        self.model = SentenceTransformer(model_name, device="cpu")
        self._initialized = True
        logger.info("SentenceTransformer model loaded successfully.")

    def embed_query(self, text: str) -> List[float]:
        """Generate a single vector embedding for a search query."""
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate a list of vector embeddings for a list of document chunks."""
        if not texts:
            return []
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return embeddings.tolist()

# Singleton instance for global use
embedding_service = EmbeddingService()
