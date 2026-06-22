import logging
from typing import List, Dict, Any
from sentence_transformers import CrossEncoder

logger = logging.getLogger("placementgpt")

class CrossEncoderReranker:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(CrossEncoderReranker, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        if self._initialized:
            return
        logger.info(f"Loading CrossEncoder model: {model_name}...")
        # Load onto CPU for local development/light container execution
        self.model = CrossEncoder(model_name, device="cpu")
        self._initialized = True
        logger.info("CrossEncoder model loaded successfully.")

    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Reranks a list of retrieved chunks against the search query.
        Returns a sorted list of chunks with an added 'rerank_score'.
        """
        if not chunks:
            return []
            
        # Prepare inputs for the cross-encoder: list of [query, text] pairs
        pairs = [[query, chunk["content"]] for chunk in chunks]
        
        # Predict scores (higher is more relevant)
        logger.info(f"Reranking {len(chunks)} chunks with Cross-Encoder...")
        scores = self.model.predict(pairs, convert_to_numpy=True)
        
        # Attach scores to the chunk dicts
        for idx, score in enumerate(scores):
            chunks[idx]["rerank_score"] = float(score)
            
        # Sort by score in descending order
        reranked_chunks = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)
        
        logger.info(f"Top reranked chunk score: {reranked_chunks[0]['rerank_score'] if reranked_chunks else 'N/A'}")
        
        # Return top_k results
        return reranked_chunks[:top_k]

# Singleton instance
reranker_service = CrossEncoderReranker()
