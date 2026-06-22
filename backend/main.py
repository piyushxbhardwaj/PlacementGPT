import os
import sys
import time
import logging

# Ensure root directory is in python path for absolute package imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config.config import settings
from backend.repositories.db import init_db, async_session_maker
from backend.repositories.seed import seed_first_admin
from backend.observability.observability import (
    setup_telemetry,
    HTTP_REQUESTS_TOTAL,
    HTTP_REQUEST_LATENCY,
    logger
)

# Import Routers
from backend.api.auth import router as auth_router
from backend.api.documents import router as documents_router
from backend.api.chat import router as chat_router
from backend.api.admin import router as admin_router
from backend.api.metrics import router as metrics_router

# Initialize FastAPI App
app = FastAPI(
    title="PlacementGPT API",
    description="Enterprise-Grade RAG Platform for Career Intelligence",
    version="1.0.0"
)

# CORS Configuration
# Allow local dev servers and frontend containers
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus and Request tracking middleware
@app.middleware("http")
async def prometheus_metrics_middleware(request: Request, call_next):
    start_time = time.time()
    method = request.method
    endpoint = request.url.path
    
    # Process the request
    response = await call_next(request)
    
    duration = time.time() - start_time
    status_code = str(response.status_code)
    
    # Normalize paths to avoid Prometheus label cardinality explosion (e.g. replacing UUIDs)
    # This is standard practice in production-grade metrics instrumentation
    normalized_path = endpoint
    parts = endpoint.split("/")
    for i, part in enumerate(parts):
        if len(part) == 36 and part.count("-") == 4: # basic UUID format detection
            parts[i] = "{id}"
    normalized_path = "/".join(parts)
    
    HTTP_REQUESTS_TOTAL.labels(method=method, endpoint=normalized_path, status=status_code).inc()
    HTTP_REQUEST_LATENCY.labels(method=method, endpoint=normalized_path).observe(duration)
    
    return response

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(metrics_router) # Metrics endpoint exposed globally /metrics

# Setup OpenTelemetry tracing
setup_telemetry(app)

@app.on_event("startup")
async def startup_event():
    """Initializes Database tables, pgvector extension, and seeds default accounts."""
    logger.info("Starting PlacementGPT API...")
    try:
        await init_db()
        async with async_session_maker() as session:
            await seed_first_admin(session)
        logger.info("Application startup check complete.")
    except Exception as e:
        logger.error(f"Startup database initialization failed: {str(e)}")

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple service healthcheck endpoint."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "environment": settings.ENV
    }
