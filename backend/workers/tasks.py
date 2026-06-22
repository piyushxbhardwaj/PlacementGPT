import uuid
import logging
from backend.repositories.db import async_session_maker
from backend.services.document_service import DocumentService

logger = logging.getLogger("placementgpt")

async def process_document_task(document_id: uuid.UUID) -> None:
    """
    Asynchronous task to parse, chunk, and index a document in the database.
    This function creates its own database session to operate safely in a background thread/task.
    """
    logger.info(f"Background worker picked up ingestion task for document: {document_id}")
    async with async_session_maker() as session:
        try:
            await DocumentService.process_document(session, document_id)
        except Exception as e:
            logger.error(f"Error in background task for document {document_id}: {str(e)}")
