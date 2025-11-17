"""
Application Insights 및 OpenTelemetry 텔레메트리 설정
"""
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor


def setup_telemetry():
    """
    Application Insights 텔레메트리 설정
    환경변수 APPLICATIONINSIGHTS_CONNECTION_STRING 필요
    """
    connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
    
    if not connection_string:
        print("Warning: APPLICATIONINSIGHTS_CONNECTION_STRING not set. Telemetry disabled.")
        return
    
    try:
        # Azure Monitor 설정
        configure_azure_monitor(
            connection_string=connection_string,
            enable_live_metrics=True,
        )
        
        # FastAPI 자동 계측
        FastAPIInstrumentor.instrument()
        
        # HTTPX 클라이언트 자동 계측 (Finnhub API 호출 추적)
        HTTPXClientInstrumentor().instrument()
        
        print("Application Insights telemetry configured successfully")
    except Exception as e:
        print(f"Error configuring telemetry: {e}")


def get_tracer(name: str):
    """트레이서 가져오기"""
    return trace.get_tracer(name)


def get_meter(name: str):
    """미터 가져오기"""
    return metrics.get_meter(name)
