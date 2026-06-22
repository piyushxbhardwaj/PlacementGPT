import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[uuid.UUID] = None
    email: Optional[str] = None
    role: Optional[str] = None

# Document Schemas
class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_type: str
    status: str
    version: int
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Chat Message & Session Schemas
class CitationSchema(BaseModel):
    document_id: uuid.UUID
    filename: str
    page: int
    chunk_id: uuid.UUID
    snippet: str
    confidence: float

class ChatMessageCreate(BaseModel):
    content: str = Field(..., description="The query/message content")

class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    sender: str
    content: str
    citations: Optional[List[CitationSchema]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = Field(default=None, description="Optional title for the chat session")

class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    user_id: uuid.UUID

    class Config:
        from_attributes = True

class ChatSessionDetail(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True

# System Metrics
class SystemStats(BaseModel):
    total_users: int
    total_documents: int
    total_chunks: int
    total_tokens: int
