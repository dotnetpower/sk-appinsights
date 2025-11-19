"""
Observability 미들웨어
"""
import logging
import time
from typing import Callable

from fastapi import Request, Response
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from starlette.middleware.base import BaseHTTPMiddleware

from .telemetry import record_error, record_request

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


class TracingMiddleware(BaseHTTPMiddleware):
    """
    HTTP 요청을 추적하는 미들웨어
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        HTTP 요청 처리 및 추적
        """
        # 스팬 이름 생성
        span_name = f"{request.method} {request.url.path}"
        
        with tracer.start_as_current_span(span_name) as span:
            # 요청 정보를 속성으로 추가
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", str(request.url))
            span.set_attribute("http.path", request.url.path)
            span.set_attribute("http.scheme", request.url.scheme)
            span.set_attribute("http.host", request.url.hostname or "")
            
            # 클라이언트 정보
            if request.client:
                span.set_attribute("http.client.host", request.client.host)
                span.set_attribute("http.client.port", request.client.port)
            
            # 쿼리 파라미터 (Live Metrics에 표시)
            if request.query_params:
                query_str = "&".join([f"{k}={v}" for k, v in request.query_params.items()])
                span.set_attribute("http.query_string", query_str)
                for key, value in request.query_params.items():
                    span.set_attribute(f"http.query.{key}", value)
                logger.info(f"📊 Query params: {query_str}")
            
            # 헤더 (민감한 정보 제외)
            safe_headers = ["content-type", "user-agent", "accept"]
            for header in safe_headers:
                if header in request.headers:
                    span.set_attribute(f"http.header.{header}", request.headers[header])
            
            # 시작 시간 기록
            start_time = time.time()
            
            try:
                # 요청 처리
                response = await call_next(request)
                
                # 응답 정보 추가
                span.set_attribute("http.status_code", response.status_code)
                
                # 성공/실패 상태 설정
                if 200 <= response.status_code < 400:
                    span.set_status(Status(StatusCode.OK))
                else:
                    span.set_status(Status(StatusCode.ERROR, f"HTTP {response.status_code}"))
                
                return response
                
            except Exception as e:
                # 오류 기록 → exceptions 테이블
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)  # exceptions 테이블에 기록
                span.set_attribute("http.status_code", 500)
                
                # TelemetryClient로도 예외 기록
                from .telemetry import track_exception
                track_exception(e, {
                    "endpoint": request.url.path,
                    "method": request.method,
                })
                raise
                
            finally:
                # 처리 시간 기록
                duration = time.time() - start_time
                duration_ms = round(duration * 1000, 2)
                span.set_attribute("http.duration_ms", duration_ms)
                
                # traces 테이블에 로그 기록
                status = response.status_code if 'response' in locals() else 500
                logger.info(
                    f"⚡ {request.method} {request.url.path} | "
                    f"Status: {status} | Duration: {duration_ms}ms"
                )
