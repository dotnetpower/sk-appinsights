"""
Observability 모듈 초기화
Application Insights 및 OpenTelemetry 설정
"""
from .telemetry import setup_telemetry

__all__ = ["setup_telemetry"]
