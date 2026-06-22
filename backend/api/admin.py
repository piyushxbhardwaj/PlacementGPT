from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from backend.repositories.db import get_db
from backend.auth.auth_handler import get_admin_user
from backend.models.models import User, Document, DocumentChunk
from backend.schemas.schemas import SystemStats

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Admin-only: Retrieve global system usage stats (users, docs, chunks, and mock/prometheus metrics)."""
    # 1. Total users
    user_count_result = await db.execute(select(func.count(User.id)))
    total_users = user_count_result.scalar_one()

    # 2. Total documents
    doc_count_result = await db.execute(select(func.count(Document.id)))
    total_documents = doc_count_result.scalar_one()

    # 3. Total chunks
    chunk_count_result = await db.execute(select(func.count(DocumentChunk.id)))
    total_chunks = chunk_count_result.scalar_one()

    # Fetch token stats (mocked or aggregated from Prometheus clients)
    from backend.observability.observability import LLM_TOKEN_USAGE
    try:
        # Collect metric values if initialized
        total_tokens = int(LLM_TOKEN_USAGE.labels(type="input")._value.get() + LLM_TOKEN_USAGE.labels(type="output")._value.get())
    except Exception:
        total_tokens = total_chunks * 250 # estimate

    return {
        "total_users": total_users,
        "total_documents": total_documents,
        "total_chunks": total_chunks,
        "total_tokens": total_tokens
    }
