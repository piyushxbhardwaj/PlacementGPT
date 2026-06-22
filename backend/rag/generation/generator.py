import time
import json
import uuid
import logging
from typing import AsyncGenerator, List, Dict, Any
import google.generativeai as genai

from backend.config.config import settings
from backend.rag.guardrails.guardrails import RAGGuardrails
from backend.rag.generation.query_processor import QueryProcessor
from backend.rag.retrieval.hybrid_search import hybrid_retriever
from backend.rag.reranking.reranker import reranker_service

logger = logging.getLogger("placementgpt")

class RAGPipeline:
    @staticmethod
    async def generate_response_stream(
        db,
        query: str,
        chat_history: List[Dict[str, Any]],
        user_id: uuid.UUID,
        is_admin: bool = False
    ) -> AsyncGenerator[str, None]:
        """
        Executes the full RAG pipeline and yields SSE chunks.
        Steps:
        1. Guardrails check
        2. Query Rewriting & Expansion
        3. Hybrid Retrieval & Deduplication
        4. Cross-Encoder Reranking & Compression
        5. Citation Mapping & System Prompt formulation
        6. Stream response from Gemini
        """
        start_time = time.time()
        
        # --- 1. GUARDRAILS ---
        is_safe, error_msg = RAGGuardrails.inspect_query(query)
        if not is_safe:
            yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # --- 2. QUERY REWRITING & EXPANSION ---
        rewritten_query = await QueryProcessor.rewrite_query(query, chat_history)
        expanded_queries = await QueryProcessor.expand_query(rewritten_query)

        # --- 3. HYBRID RETRIEVAL ---
        all_retrieved_chunks = []
        seen_chunk_ids = set()
        
        # Retrieve for each expanded variation to maximize recall
        for eq in expanded_queries:
            chunks = await hybrid_retriever.retrieve(
                db=db, 
                query=eq, 
                user_id=user_id, 
                is_admin=is_admin, 
                top_k=8
            )
            for chunk in chunks:
                if chunk["id"] not in seen_chunk_ids:
                    seen_chunk_ids.add(chunk["id"])
                    all_retrieved_chunks.append(chunk)

        if not all_retrieved_chunks:
            # Safe fallback if no documents are uploaded yet
            fallback_msg = "No placement documents have been uploaded to your workspace yet. Please upload files (PDFs, DOCX, TXT) via the Document Management panel to ask questions."
            yield f"data: {json.dumps({'type': 'token', 'content': fallback_msg})}\n\n"
            yield f"data: {json.dumps({'type': 'citations', 'citations': []})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # --- 4. RERANKING & COMPRESSION ---
        # Rerank and filter down to top 5 chunks
        reranked_chunks = reranker_service.rerank(
            query=rewritten_query, 
            chunks=all_retrieved_chunks, 
            top_k=5
        )

        # --- 5. CITATION BUILDER & CONTEXT ASSEMBLY ---
        # Map chunks to numbered citations for Gemini grounding
        citations = []
        context_blocks = []
        
        for idx, chunk in enumerate(reranked_chunks):
            source_index = idx + 1
            context_blocks.append(
                f"Source [{source_index}]: {chunk['filename']} (Page {chunk['page_number']})\nContent: {chunk['content']}"
            )
            
            # Map database chunk metadata to citation schema
            citations.append({
                "document_id": str(chunk["document_id"]),
                "filename": chunk["filename"],
                "page": chunk["page_number"],
                "chunk_id": str(chunk["id"]),
                "snippet": chunk["content"][:200] + "...",
                "confidence": round(chunk.get("rerank_score", 0.0), 3)
            })

        context_text = "\n\n".join(context_blocks)
        
        # Yield citations immediately to the frontend so they render during typing
        yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"

        # --- 6. GEMINI LLM GROUNDING & GENERATION ---
        system_prompt = """You are PlacementGPT, a professional AI career intelligence assistant. 
Your goal is to answer student questions based strictly on the provided placement documents context (company JDs, interview experiences, notes).

Instructions:
1. Provide detailed, well-structured answers using bullet points, tables, or code formatting where appropriate.
2. For every fact, assertion, or response block, you MUST cite the source document. Use brackets with the source index number, e.g., [1] or [2], to link statements to their specific source. Do not combine citations into [1, 2], write them separately like [1][2].
3. Grounding rule: If the context does not contain the answer to the question, state: "Based on the uploaded documents, I do not have enough information to answer this question." Do not make up any facts outside the context.
"""

        user_prompt = f"""Context:
{context_text}

---

Conversation History:
(Use this history for understanding context, but prioritize answering the current query below)
{json.dumps(chat_history[-6:]) if chat_history else "No previous history."}

---

Student Query: {rewritten_query}
Answer:"""

        if not settings.GEMINI_API_KEY:
            # Fallback if no API Key (mock streaming for safety/testing)
            mock_text = f"**[Local Fallback Mode - GEMINI_API_KEY missing]**\nBased on your documents ({len(citations)} sources found), here is what was retrieved for: '{rewritten_query}':\n\n"
            for token in mock_text.split(" "):
                yield f"data: {json.dumps({'type': 'token', 'content': token + ' '})}\n\n"
                time.sleep(0.05)
            for idx, c in enumerate(citations):
                ref_text = f"\n* {c['filename']} (Page {c['page']}): \"{c['snippet']}\" [Source {idx+1}]"
                for token in ref_text.split(" "):
                    yield f"data: {json.dumps({'type': 'token', 'content': token + ' '})}\n\n"
                    time.sleep(0.02)
            yield f"data: {json.dumps({'type': 'done', 'latency_ms': int((time.time() - start_time) * 1000)})}\n\n"
            yield "data: [DONE]\n\n"
            return

        try:
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_prompt
            )
            
            # Start streaming generation
            response = model.generate_content(
                user_prompt,
                generation_config=genai.GenerationConfig(temperature=0.3),
                stream=True
            )
            
            full_response_text = ""
            for response_chunk in response:
                token_content = response_chunk.text
                full_response_text += token_content
                yield f"data: {json.dumps({'type': 'token', 'content': token_content})}\n\n"
            
            latency = int((time.time() - start_time) * 1000)
            logger.info(f"RAG streaming complete. Latency: {latency}ms.")
            yield f"data: {json.dumps({'type': 'done', 'latency_ms': latency, 'total_tokens': len(full_response_text.split())})}\n\n"
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.exception("Error during LLM response generation")
            yield f"data: {json.dumps({'type': 'error', 'content': f'LLM Generation Error: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"
