import uuid
import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func, or_
from backend.models.models import Document, DocumentChunk
from backend.rag.embeddings.embeddings import embedding_service

logger = logging.getLogger("placementgpt")

class HybridRetriever:
    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k

    async def retrieve(
        self, 
        db: AsyncSession, 
        query: str, 
        user_id: uuid.UUID,
        is_admin: bool = False,
        top_k: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top relevant chunks using Hybrid Search: Dense Vector + Sparse Full-Text (BM25).
        Fuses results using Reciprocal Rank Fusion (RRF).
        Enforces tenant isolation: users only access their own docs or public docs.
        """
        # 1. Fetch search query embedding
        query_vector = embedding_service.embed_query(query)
        
        # 2. Build tenant isolation filter
        # Get list of document IDs the user is allowed to access
        doc_subquery = select(Document.id)
        if not is_admin:
            doc_subquery = doc_subquery.where(
                or_(Document.uploader_id == user_id, Document.is_public == True)
            )
        
        # 3. Dense Vector Search (cosine similarity)
        # <=> is cosine distance, so 1 - distance is cosine similarity
        vector_query = (
            select(
                DocumentChunk,
                (1 - DocumentChunk.embedding.cosine_distance(query_vector)).label("vector_similarity")
            )
            .where(DocumentChunk.document_id.in_(doc_subquery))
            .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(top_k * 2)
        )
        
        vector_results = await db.execute(vector_query)
        vector_list = vector_results.all() # list of (DocumentChunk, score)
        
        # 4. Sparse Keyword Search (Postgres TSVector with ts_rank)
        # Parse query for tsquery
        formatted_query = " | ".join([f"'{word}'" for word in query.split() if word.isalnum()])
        if not formatted_query:
            formatted_query = query
            
        tsquery = func.plainto_tsquery("english", query)
        
        sparse_query = (
            select(
                DocumentChunk,
                func.ts_rank(DocumentChunk.tsv_content, tsquery).label("fts_score")
            )
            .where(DocumentChunk.document_id.in_(doc_subquery))
            .where(DocumentChunk.tsv_content.op("@@")(tsquery))
            .order_by(func.ts_rank(DocumentChunk.tsv_content, tsquery).desc())
            .limit(top_k * 2)
        )
        
        try:
            sparse_results = await db.execute(sparse_query)
            sparse_list = sparse_results.all()
        except Exception as e:
            logger.warning(f"Full text search query failed: {str(e)}. Falling back to dense vector search only.")
            sparse_list = []

        # 5. Apply Reciprocal Rank Fusion (RRF)
        rrf_scores = {}
        chunk_map = {}
        
        # Helper to compute and accumulate RRF score
        def add_rrf_scores(results_list, weight=1.0):
            for rank, (chunk, _) in enumerate(results_list):
                chunk_id = chunk.id
                if chunk_id not in chunk_map:
                    chunk_map[chunk_id] = chunk
                    
                rank_score = weight / (self.rrf_k + rank + 1)
                rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + rank_score

        # Combine vector (weight 1.0) and sparse (weight 1.0) ranking
        add_rrf_scores(vector_list, weight=1.0)
        add_rrf_scores(sparse_list, weight=1.0)
        
        # Sort chunks by RRF score desc
        sorted_chunk_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)
        
        # 6. Retrieve document details for citations
        # Batch load related documents to avoid N+1 query problem
        retrieved_chunks = []
        if sorted_chunk_ids:
            target_ids = sorted_chunk_ids[:top_k]
            chunk_query = (
                select(DocumentChunk, Document.filename)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(DocumentChunk.id.in_(target_ids))
            )
            chunk_results = await db.execute(chunk_query)
            
            # Map chunk UUID -> (chunk_model, filename)
            db_chunks = {r[0].id: (r[0], r[1]) for r in chunk_results.all()}
            
            for cid in target_ids:
                if cid in db_chunks:
                    chunk_model, filename = db_chunks[cid]
                    retrieved_chunks.append({
                        "id": chunk_model.id,
                        "document_id": chunk_model.document_id,
                        "filename": filename,
                        "content": chunk_model.content,
                        "page_number": chunk_model.page_number,
                        "rrf_score": rrf_scores[cid]
                    })
                    
        logger.info(f"Retrieved {len(retrieved_chunks)} chunks for query: '{query}'")
        return retrieved_chunks

# Singleton hybrid retriever
hybrid_retriever = HybridRetriever()
