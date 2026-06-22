import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from backend.config.config import settings

logger = logging.getLogger("placementgpt")

# Create async engine. Pool size and max overflow configured for production-grade throughput.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database session in API routes."""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db() -> None:
    """Initialize database: create pgvector extension and tables."""
    async with engine.begin() as conn:
        logger.info("Initializing database: creating extension if not exists...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        
        logger.info("Initializing database: creating tables...")
        # To avoid circular imports, import models here
        from backend.models.models import User, Document, DocumentChunk, ChatSession, ChatMessage
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully.")
