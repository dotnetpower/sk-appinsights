"""
Application Insights 및 OpenTelemetry 텔레메트리 설정
"""
import logging
import os

from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import metrics, trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider

logger = logging.getLogger(__name__)

# Azure SDK tracing을 위한 import
try:
    from azure.core.settings import settings as azure_settings
    from azure.core.tracing.ext.opentelemetry_span import OpenTelemetrySpan
    AZURE_TRACING_AVAILABLE = True
except ImportError:
    AZURE_TRACING_AVAILABLE = False
    logger.warning("Azure Core tracing not available")

# Azure SDK HTTP 로깅 비활성화
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
logging.getLogger("azure.cosmos._cosmos_http_logging_policy").setLevel(logging.WARNING)
logging.getLogger("azure.monitor.opentelemetry").setLevel(logging.WARNING)
logging.getLogger("opentelemetry").setLevel(logging.WARNING)


def setup_telemetry(app=None):
    """
    Application Insights 텔레메트리 설정
    환경변수 APPLICATIONINSIGHTS_CONNECTION_STRING 필요
    
    Args:
        app: FastAPI 앱 인스턴스 (선택적)
    """
    connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
    
    if not connection_string:
        logger.warning("APPLICATIONINSIGHTS_CONNECTION_STRING not set. Telemetry disabled.")
        return
    
    try:
        # 리소스 속성 정의 (Live Metrics에 표시될 정보)
        resource = Resource.create({
            "service.name": "etf-agent",
            "service.version": "0.1.0",
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        })
        
        # Azure Monitor 설정 - Live Metrics 활성화
        configure_azure_monitor(
            connection_string=connection_string,
            enable_live_metrics=True,
            resource=resource,
            logger_name="etf-agent",
        )
        
        # FastAPI 자동 계측 (앱 인스턴스가 있는 경우)
        if app:
            FastAPIInstrumentor.instrument_app(app)
        
        # HTTPX 클라이언트 자동 계측 (yfinance API 호출 추적)
        HTTPXClientInstrumentor().instrument()
        
        # Azure SDK tracing 활성화 (Cosmos DB 등 Azure 서비스 호출 추적)
        if AZURE_TRACING_AVAILABLE:
            azure_settings.tracing_implementation = OpenTelemetrySpan
            logger.info("✅ Azure SDK tracing enabled for Cosmos DB and other Azure services")
        
        logger.info("✅ Application Insights telemetry configured with Live Metrics enabled")
        logger.info(f"📊 Connection String: {connection_string[:50]}...")
    except Exception as e:
        logger.error(f"❌ Error configuring telemetry: {e}")


def get_tracer(name: str):
    """트레이서 가져오기"""
    return trace.get_tracer(name)


def get_meter(name: str):
    """미터 가져오기"""
    return metrics.get_meter(name)


# 애플리케이션 전역 메트릭
_meter = None
_request_counter = None
_request_duration = None
_error_counter = None


def initialize_metrics():
    """커스텀 메트릭 초기화 (Live Metrics에 표시됨)"""
    global _meter, _request_counter, _request_duration, _error_counter
    
    _meter = metrics.get_meter("etf-agent.metrics")
    
    # 요청 카운터
    _request_counter = _meter.create_counter(
        name="app.requests.total",
        description="Total number of requests",
        unit="1",
    )
    
    # 요청 처리 시간
    _request_duration = _meter.create_histogram(
        name="app.requests.duration",
        description="Request duration in milliseconds",
        unit="ms",
    )
    
    # 에러 카운터
    _error_counter = _meter.create_counter(
        name="app.errors.total",
        description="Total number of errors",
        unit="1",
    )
    
    logger.info("📈 Custom metrics initialized for Live Metrics")


def record_request(endpoint: str, method: str, status_code: int, duration_ms: float):
    """요청 메트릭 기록 (Live Metrics에 실시간 표시)"""
    if _request_counter and _request_duration:
        attributes = {
            "endpoint": endpoint,
            "method": method,
            "status_code": str(status_code),
        }
        _request_counter.add(1, attributes)
        _request_duration.record(duration_ms, attributes)


def record_error(error_type: str, endpoint: str | None = None):
    """에러 메트릭 기록 (Live Metrics에 실시간 표시)"""
    if _error_counter:
        attributes = {"error_type": error_type}
        if endpoint:
            attributes["endpoint"] = endpoint
        _error_counter.add(1, attributes)
