import time
import logging
import structlog
from fastapi import Request
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# 1. STRUCTURED LOGGING SETUP
def setup_logging():
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.format_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer() # Output JSON for production log collectors
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Configure root standard logger
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    
setup_logging()
logger = structlog.get_logger("placementgpt")

# 2. PROMETHEUS METRICS SETUP
# Request metrics
HTTP_REQUESTS_TOTAL = Counter(
    "placementgpt_http_requests_total",
    "Total count of HTTP requests",
    ["method", "endpoint", "status"]
)

HTTP_REQUEST_LATENCY = Histogram(
    "placementgpt_http_request_latency_seconds",
    "Latency of HTTP requests in seconds",
    ["method", "endpoint"]
)

# RAG Pipeline detailed stage metrics
RAG_STAGE_LATENCY = Histogram(
    "placementgpt_rag_stage_latency_seconds",
    "Latency of individual RAG stages in seconds",
    ["stage"]
)

LLM_TOKEN_USAGE = Counter(
    "placementgpt_llm_tokens_total",
    "Total input and output tokens consumed",
    ["type"] # 'input' or 'output'
)

LLM_COST_USD = Counter(
    "placementgpt_llm_cost_usd",
    "Estimated total cost of LLM queries in USD"
)

ACTIVE_CHATS = Gauge(
    "placementgpt_active_chats",
    "Number of active user chat sessions"
)

GUARDRAIL_VIOLATIONS = Counter(
    "placementgpt_guardrail_violations_total",
    "Total number of prompt injection or safety blocks"
)

# 3. OPENTELEMETRY TRACING SETUP
def setup_telemetry(app):
    """Sets up OpenTelemetry tracing and instruments the FastAPI app."""
    try:
        provider = TracerProvider()
        # Export spans to console/logs for local verification (or Jaeger/OTel Collector in prod)
        processor = SimpleSpanProcessor(ConsoleSpanExporter())
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        
        # Instrument FastAPI app
        FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)
        logger.info("OpenTelemetry instrumentation configured successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry: {str(e)}")

# 4. MEASUREMENT UTILITIES
class TrackLatency:
    """Context manager to measure and record latency of RAG stages."""
    def __init__(self, stage_name: str):
        self.stage_name = stage_name

    def __enter__(self):
        self.start = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start
        RAG_STAGE_LATENCY.labels(stage=self.stage_name).observe(duration)

def track_token_cost(input_tokens: int, output_tokens: int):
    """
    Estimates Gemini API cost:
    Gemini 1.5 Flash Pricing (as of late 2024 / 2025):
    $0.075 / 1M input tokens
    $0.300 / 1M output tokens
    """
    LLM_TOKEN_USAGE.labels(type="input").inc(input_tokens)
    LLM_TOKEN_USAGE.labels(type="output").inc(output_tokens)
    
    input_cost = (input_tokens / 1_000_000) * 0.075
    output_cost = (output_tokens / 1_000_000) * 0.30
    total_cost = input_cost + output_cost
    LLM_COST_USD.inc(total_cost)
