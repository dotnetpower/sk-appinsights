"""
ETF Agent Main Module
FastAPI 서버 진입점
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import etf, stocks, news, chat
from .observability.telemetry import setup_telemetry

# Application Insights 텔레메트리 설정
setup_telemetry()

app = FastAPI(
    title="ETF Agent API",
    description="ETF 및 주식 종목 데이터 분석 API",
    version="0.1.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(etf.router)
app.include_router(stocks.router)
app.include_router(news.router)
app.include_router(chat.router)


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
