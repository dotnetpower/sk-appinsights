"""
ETF Agent Main Module
FastAPI 서버 진입점
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import chat, etf, news, stocks
from .observability import (TracingMiddleware, initialize_metrics,
                            setup_telemetry)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="ETF Agent API",
    description="ETF 및 주식 종목 데이터 분석 API",
    version="0.1.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
    openapi_url="/openapi.json"  # OpenAPI schema
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Application Insights 텔레메트리 설정 (앱 생성 후)
setup_telemetry(app)

# 커스텀 메트릭 초기화 (Live Metrics용)
initialize_metrics()

# Tracing 미들웨어 추가 (Live Metrics 데이터 수집)
app.add_middleware(TracingMiddleware)

# API 라우터 등록
app.include_router(etf.router)
app.include_router(stocks.router)
app.include_router(news.router)
app.include_router(chat.router)

logger.info("🚀 ETF Agent API 시작 - Live Metrics 활성화됨")



@app.get("/")
async def root():
    """헬스체크 엔드포인트"""
    return {"status": "ok", "message": "ETF Agent API is running"}


@app.get("/health")
async def health():
    """헬스체크 상세 정보"""
    return {
        "status": "healthy",
        "service": "etf-agent",
        "version": "0.1.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
