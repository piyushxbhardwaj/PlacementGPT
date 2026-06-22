import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.repositories.db import get_db
from backend.auth.auth_handler import get_current_user
from backend.models.models import User
from backend.schemas.schemas import DocumentResponse
from backend.services.document_service import DocumentService
from backend.workers.tasks import process_document_task

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md"}

def validate_file(filename: str) -> str:
    """Validate file extension."""
    if "." not in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File has no extension."
        )
    ext = filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: .{ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return ext

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    is_public: bool = Form(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a document (PDF, DOCX, TXT).
    Saves the file to local storage, saves metadata, and queues ingestion worker in the background.
    """
    ext = validate_file(file.filename)
    
    # Secure storage filename using UUID
    unique_filename = f"{uuid.uuid4()}.{ext}"
    storage_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save the file to disk
    try:
        with open(storage_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save uploaded file to disk: {str(e)}"
        )
        
    # Create database record
    doc = await DocumentService.create_document(
        db=db,
        filename=file.filename,
        file_type=ext,
        storage_path=storage_path,
        uploader_id=current_user.id,
        is_public=is_public
    )
    
    # Queue background task to process document (parse -> chunk -> embedding)
    background_tasks.add_task(process_document_task, doc.id)
    
    return doc

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all documents. Admins see all; users see their own + public documents."""
    is_admin = current_user.role == "admin"
    return await DocumentService.list_documents(db, current_user.id, is_admin)

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get metadata for a specific document."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID format.")
        
    doc = await DocumentService.get_document(db, doc_uuid)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        
    # Check permissions (isolation)
    if doc.uploader_id != current_user.id and not doc.is_public and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a document (metadata and chunks). Available to owner and admins."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID format.")
        
    doc = await DocumentService.get_document(db, doc_uuid)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        
    # Check permissions (only uploader or admin can delete)
    if doc.uploader_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You cannot delete this document.")
        
    success = await DocumentService.delete_document(db, doc_uuid)
    if not success:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete document.")
         
    return {"message": "Document deleted successfully."}
