import uuid
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from backend.models.models import ChatSession, ChatMessage

logger = logging.getLogger("placementgpt")

class ChatService:
    @staticmethod
    async def create_chat_session(
        db: AsyncSession, 
        user_id: uuid.UUID, 
        title: Optional[str] = None
    ) -> ChatSession:
        """Create a new chat session for a student."""
        session_title = title or "New Conversation"
        session = ChatSession(
            user_id=user_id,
            title=session_title
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_chat_session(
        db: AsyncSession, 
        session_id: uuid.UUID, 
        user_id: uuid.UUID
    ) -> Optional[ChatSession]:
        """Fetch chat session and eager load its messages, validating ownership."""
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id)
            .where(ChatSession.user_id == user_id)
            .options(selectinload(ChatSession.messages))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_chat_sessions(
        db: AsyncSession, 
        user_id: uuid.UUID
    ) -> List[ChatSession]:
        """List all chat sessions for a student ordered by creation date."""
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_chat_message(
        db: AsyncSession,
        session_id: uuid.UUID,
        sender: str,
        content: str,
        citations: Optional[List[dict]] = None
    ) -> ChatMessage:
        """Save a new chat message (from user or assistant) with citations to DB."""
        msg = ChatMessage(
            session_id=session_id,
            sender=sender,
            content=content,
            citations=citations
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    @staticmethod
    async def update_session_title(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        title: str
    ) -> Optional[ChatSession]:
        """Update session title (e.g. auto-generated from first question)."""
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id)
            .where(ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.title = title
            await db.commit()
            await db.refresh(session)
        return session

    @staticmethod
    async def delete_chat_session(
        db: AsyncSession, 
        session_id: uuid.UUID, 
        user_id: uuid.UUID
    ) -> bool:
        """Delete a chat session and cascade delete all its messages."""
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id)
            .where(ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return False
            
        await db.delete(session)
        await db.commit()
        return True
