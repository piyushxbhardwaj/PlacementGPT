import json
import uuid
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.repositories.db import get_db
from backend.auth.auth_handler import get_current_user
from backend.models.models import User
from backend.schemas.schemas import ChatSessionResponse, ChatSessionDetail, ChatMessageCreate, ChatSessionCreate
from backend.services.chat_service import ChatService
from backend.services.document_service import DocumentService
from backend.services.cache_service import cache_service
from backend.rag.generation.generator import RAGPipeline

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/session", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_in: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat conversation session."""
    return await ChatService.create_chat_session(db, current_user.id, session_in.title)

@router.get("/session", response_model=List[ChatSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all chat sessions for the current user."""
    return await ChatService.list_chat_sessions(db, current_user.id)

@router.get("/session/{session_id}", response_model=ChatSessionDetail)
async def get_session_detail(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get complete conversation history for a specific chat session."""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format.")
        
    session = await ChatService.get_chat_session(db, session_uuid, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")
    return session

@router.delete("/session/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and all messages contained within."""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format.")
        
    success = await ChatService.delete_chat_session(db, session_uuid, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or access denied.")
    return {"message": "Chat session deleted successfully."}

@router.post("/session/{session_id}/message")
async def send_chat_message(
    session_id: str,
    message_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    RAG Chat endpoint. Streams the response using Server-Sent Events (SSE).
    Uses caching (hashes query + tenant document state) to speed up repeated queries.
    Saves user and final synthesized assistant responses to database.
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format.")

    session = await ChatService.get_chat_session(db, session_uuid, current_user.id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")

    # 1. Fetch conversation history for memory injection
    chat_history = [{"sender": msg.sender, "content": msg.content} for msg in session.messages]

    # 2. Get active document state to formulate cache key
    docs = await DocumentService.list_documents(db, current_user.id, current_user.role == "admin")
    indexed_doc_ids = [str(d.id) for d in docs if d.status == "indexed"]

    async def sse_generator():
        full_response = ""
        citations = []
        
        # --- Check Cache ---
        cached = cache_service.get_cached_response(
            user_id=str(current_user.id),
            query=message_in.content,
            document_ids=indexed_doc_ids
        )
        
        if cached:
            # Simulated streaming for cached hits to maintain UX consistency
            citations = cached.get("citations", [])
            full_response = cached.get("content", "")
            
            yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"
            await asyncio.sleep(0.05)
            
            # Yield content tokens
            words = full_response.split(" ")
            for i, word in enumerate(words):
                space = " " if i < len(words) - 1 else ""
                yield f"data: {json.dumps({'type': 'token', 'content': word + space})}\n\n"
                # Faster yield rate for cached responses
                await asyncio.sleep(0.01)
                
            yield f"data: {json.dumps({'type': 'done', 'latency_ms': 5, 'cached': True})}\n\n"
            yield "data: [DONE]\n\n"
            
            # Store in DB
            await ChatService.create_chat_message(db, session_uuid, "user", message_in.content)
            await ChatService.create_chat_message(db, session_uuid, "assistant", full_response, citations)
            return

        # --- Run RAG Pipeline ---
        async for frame in RAGPipeline.generate_response_stream(
            db=db,
            query=message_in.content,
            chat_history=chat_history,
            user_id=current_user.id,
            is_admin=(current_user.role == "admin")
        ):
            yield frame
            
            # Parse streaming frames to assemble response for DB storage and caching
            if frame.startswith("data: "):
                data_payload = frame[6:].strip()
                if data_payload == "[DONE]":
                    continue
                try:
                    parsed = json.loads(data_payload)
                    if parsed.get("type") == "token":
                        full_response += parsed.get("content", "")
                    elif parsed.get("type") == "citations":
                        citations = parsed.get("citations", [])
                except Exception:
                    pass

        # --- Complete transaction ---
        if full_response:
            # Save user query and assistant response
            await ChatService.create_chat_message(db, session_uuid, "user", message_in.content)
            await ChatService.create_chat_message(db, session_uuid, "assistant", full_response, citations)
            
            # Cache the newly generated RAG response
            cache_service.cache_response(
                user_id=str(current_user.id),
                query=message_in.content,
                document_ids=indexed_doc_ids,
                response_data={
                    "content": full_response,
                    "citations": citations
                }
            )

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
