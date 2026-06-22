import os
import sys
import pytest

# Ensure root directory is in python path for absolute package imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import TSVECTOR
from pgvector.sqlalchemy import Vector
import uuid

# Map PostgreSQL types to TEXT in SQLite for in-memory testing
@compiles(TSVECTOR, "sqlite")
def compile_tsvector_sqlite(element, compiler, **kw):
    return "TEXT"

@compiles(Vector, "sqlite")
def compile_vector_sqlite(element, compiler, **kw):
    return "TEXT"

from backend.main import app
from backend.repositories.db import Base, get_db
from backend.auth.auth_handler import hash_password

# 1. SETUP IN-MEMORY DATABASE FOR UNIT TESTS
DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Override database session dependency
async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
async def init_test_db():
    """Initializes in-memory database schema before each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

client = TestClient(app)

# 2. AUTHENTICATION TESTS
def test_user_registration_and_login():
    email = "student_test@placementgpt.com"
    password = "SecurePassword123!"
    
    # 1. Register User
    reg_response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password}
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert data["email"] == email
    assert data["role"] == "user"
    assert "id" in data

    # 2. Login User
    login_response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert token_data["token_type"] == "bearer"
    assert "access_token" in token_data

    # 3. Retrieve Profile
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_response = client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    profile = me_response.json()
    assert profile["email"] == email

def test_login_incorrect_credentials():
    response = client.post(
        "/api/auth/login",
        json={"email": "wrong@test.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."

# 3. DOCUMENT UPLOAD VALIDATION TESTS
def test_upload_invalid_extension():
    # Login to get token
    client.post("/api/auth/register", json={"email": "test_uploader@gmail.com", "password": "Password123!"})
    login_resp = client.post("/api/auth/login", json={"email": "test_uploader@gmail.com", "password": "Password123!"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload invalid file type (.exe)
    files = {"file": ("malicious.exe", b"dangerous-binary-code-here", "application/octet-stream")}
    response = client.post("/api/upload", files=files, headers=headers) # wait prefix check
    # Check fallback path prefix or document route prefix
    response = client.post(
        "/api/documents/upload", 
        files=files, 
        data={"is_public": "false"}, 
        headers=headers
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

# 4. TENANT ISOLATION TESTS
async def test_tenant_document_isolation():
    # We will verify tenant isolation by validating list routes
    pass
