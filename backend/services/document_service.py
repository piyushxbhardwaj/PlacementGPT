import os
import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from backend.models.models import Document, DocumentChunk
from backend.ingestion.parser import DocumentParser
from backend.ingestion.chunker import TokenRecursiveChunker
from backend.rag.embeddings.embeddings import embedding_service

logger = logging.getLogger("placementgpt")

class DocumentService:
    @staticmethod
    async def create_document(
        db: AsyncSession, 
        filename: str, 
        file_type: str, 
        storage_path: str, 
        uploader_id: uuid.UUID,
        is_public: bool = False
    ) -> Document:
        """Create metadata record for uploaded document with status 'uploaded'."""
        doc = Document(
            filename=filename,
            file_type=file_type,
            storage_path=storage_path,
            uploader_id=uploader_id,
            is_public=is_public,
            status="uploaded"
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def process_document(db: AsyncSession, document_id: uuid.UUID) -> None:
        """
        Ingestion pipeline: parsing -> chunking -> generating embeddings -> vector database storage.
        Runs asynchronously in background task to avoid blocking the REST API.
        """
        logger.info(f"Ingestion started for document: {document_id}")
        
        # 1. Fetch document metadata
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Document {document_id} not found in database.")
            return

        # Update status to processing
        doc.status = "processing"
        await db.commit()

        try:
            # 2. Parse text
            logger.info(f"Parsing document text from: {doc.storage_path}")
            if not os.path.exists(doc.storage_path):
                raise FileNotFoundError(f"File not found on disk: {doc.storage_path}")
                
            parsed_pages = DocumentParser.parse(doc.storage_path, doc.file_type)
            
            # 3. Chunk text
            logger.info("Splitting text into token chunks recursively...")
            chunker = TokenRecursiveChunker(chunk_size=800, chunk_overlap=150)
            chunks_data = chunker.chunk_document(parsed_pages)
            
            if not chunks_data:
                raise ValueError("No text content could be extracted or chunked.")

            # 4. Generate embeddings in batches
            logger.info(f"Generating dense embeddings for {len(chunks_data)} chunks...")
            chunk_contents = [chunk["content"] for chunk in chunks_data]
            embeddings = embedding_service.embed_documents(chunk_contents)
            
            # 5. Insert DocumentChunks into database
            logger.info("Storing chunks and vector representations into pgvector...")
            
            # Clean up old chunks if they somehow exist (versioning support)
            await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
            
            for idx, chunk in enumerate(chunks_data):
                new_chunk = DocumentChunk(
                    document_id=document_id,
                    chunk_index=chunk["chunk_index"],
                    content=chunk["content"],
                    page_number=chunk["page_number"],
                    embedding=embeddings[idx],
                    # Populate tsvector field using Postgres functions for BM25 hybrid search
                    tsv_content=func.to_tsvector("english", chunk["content"])
                )
                db.add(new_chunk)
            
            # Update status to indexed
            doc.status = "indexed"
            await db.commit()
            logger.info(f"Document {document_id} successfully indexed.")
            
        except Exception as e:
            logger.exception(f"Ingestion failed for document {document_id}")
            doc.status = "failed"
            await db.commit()

    @staticmethod
    async def get_document(db: AsyncSession, document_id: uuid.UUID) -> Document:
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_documents(db: AsyncSession, user_id: uuid.UUID, is_admin: bool = False) -> list[Document]:
        """List documents. Admin gets all, Users get their own + public ones."""
        if is_admin:
            result = await db.execute(select(Document).order_by(Document.created_at.desc()))
        else:
            result = await db.execute(
                select(Document)
                .where((Document.uploader_id == user_id) | (Document.is_public == True))
                .order_by(Document.created_at.desc())
            )
        return list(result.scalars().all())

    @staticmethod
    async def delete_document(db: AsyncSession, document_id: uuid.UUID) -> bool:
        """Deletes a document and its associated chunks (cascade delete)."""
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            return False
            
        # Delete file from storage
        try:
            if os.path.exists(doc.storage_path):
                os.remove(doc.storage_path)
        except Exception as e:
            logger.error(f"Failed to delete file from disk: {doc.storage_path}. Error: {str(e)}")

        await db.delete(doc)
        await db.commit()
        return True
