from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

router = APIRouter(tags=["Metrics"])

@router.get("/metrics")
def get_metrics():
    """Exposes internal Prometheus metrics to the Prometheus scraper."""
    return Response(
        content=generate_latest(), 
        media_type=CONTENT_TYPE_LATEST
    )
