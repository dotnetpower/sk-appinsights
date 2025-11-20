"""
ETF Agent Main Module
FastAPI 서버 진입점
"""
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api import analytics, chat, etf, news, stocks
from .observability import (TracingMiddleware, initialize_metrics,
                            setup_telemetry)
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource

app = FastAPI(
    title="ETF Agent API",
    description="ETF 및 주식 종목 데이터 분석 API",
    version="0.1.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
    openapi_url="/openapi.json"  # OpenAPI schema
)

# Application Insights 텔레메트리 설정 (로깅 설정 전에 호출)
# service.name을 명확히 지정하여 Application Map에 표시
setup_telemetry(app)

# 로깅 설정 (텔레메트리 설정 이후)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    force=True  # 기존 핸들러를 유지하면서 설정 적용
)
logger = logging.getLogger(__name__)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 커스텀 메트릭 초기화 (Live Metrics용)
initialize_metrics()

# Tracing 미들웨어 추가 (Live Metrics 데이터 수집)
app.add_middleware(TracingMiddleware)

# API 라우터 등록
app.include_router(etf.router)
app.include_router(stocks.router)
app.include_router(news.router)
app.include_router(chat.router)
app.include_router(analytics.router)

# Frontend 정적 파일 서빙
frontend_build_path = Path(__file__).parent.parent / "frontend" / "build"
if frontend_build_path.exists():
    # 정적 파일 (CSS, JS 등)
    app.mount("/static", StaticFiles(directory=str(frontend_build_path / "static")), name="static")
    
    # React 앱 라우팅을 위한 catch-all
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """
        React 앱 서빙 (SPA 라우팅)
        API 경로가 아닌 모든 경로는 index.html로 리디렉션
        """
        # API 경로는 제외
        if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json", "health"]:
            return {"error": "Not found"}
        
        # index.html 반환
        index_file = frontend_build_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        
        return {"error": "Frontend not found"}
    
    logger.info(f"✅ Frontend 정적 파일 서빙: {frontend_build_path}")
else:
    logger.warning(f"⚠️  Frontend build 디렉토리를 찾을 수 없습니다: {frontend_build_path}")

logger.info("🚀 ETF Agent API 시작 - Live Metrics 활성화됨")


@app.get("/", include_in_schema=False)
async def root():
    """루트 경로 - Frontend로 리디렉션"""
    index_file = Path(__file__).parent.parent / "frontend" / "build" / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"status": "ok", "message": "ETF Agent API is running", "frontend": "not available"}


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
