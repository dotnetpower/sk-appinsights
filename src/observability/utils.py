"""
Observability 유틸리티 함수
"""
import functools
import inspect
from typing import Any, Callable, Optional

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer(__name__)


def trace_span(
    name: Optional[str] = None,
    attributes: Optional[dict] = None
):
    """
    함수 실행을 추적하는 데코레이터
    
    Args:
        name: 스팬 이름 (기본값: 함수명)
        attributes: 추가할 속성들
    
    Example:
        @trace_span(name="get_stock_data", attributes={"source": "yfinance"})
        async def get_stock(symbol: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        span_name = name or f"{func.__module__}.{func.__name__}"
        
        if inspect.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs) -> Any:
                with tracer.start_as_current_span(span_name) as span:
                    # 기본 속성 추가
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                    
                    # 사용자 정의 속성 추가
                    if attributes:
                        for key, value in attributes.items():
                            span.set_attribute(key, value)
                    
                    # 함수 인자를 속성으로 추가 (문자열이나 숫자인 경우만)
                    for i, arg in enumerate(args):
                        if isinstance(arg, (str, int, float, bool)):
                            span.set_attribute(f"arg.{i}", str(arg))
                    
                    for key, value in kwargs.items():
                        if isinstance(value, (str, int, float, bool)):
                            span.set_attribute(f"param.{key}", str(value))
                    
                    try:
                        result = await func(*args, **kwargs)
                        span.set_status(Status(StatusCode.OK))
                        return result
                    except Exception as e:
                        span.set_status(Status(StatusCode.ERROR, str(e)))
                        span.record_exception(e)
                        raise
            
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs) -> Any:
                with tracer.start_as_current_span(span_name) as span:
                    # 기본 속성 추가
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                    
                    # 사용자 정의 속성 추가
                    if attributes:
                        for key, value in attributes.items():
                            span.set_attribute(key, value)
                    
                    # 함수 인자를 속성으로 추가
                    for i, arg in enumerate(args):
                        if isinstance(arg, (str, int, float, bool)):
                            span.set_attribute(f"arg.{i}", str(arg))
                    
                    for key, value in kwargs.items():
                        if isinstance(value, (str, int, float, bool)):
                            span.set_attribute(f"param.{key}", str(value))
                    
                    try:
                        result = func(*args, **kwargs)
                        span.set_status(Status(StatusCode.OK))
                        return result
                    except Exception as e:
                        span.set_status(Status(StatusCode.ERROR, str(e)))
                        span.record_exception(e)
                        raise
            
            return sync_wrapper
    
    return decorator
