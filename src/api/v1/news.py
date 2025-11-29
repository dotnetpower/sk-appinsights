"""
API 라우터 - 뉴스 관련 엔드포인트 (v1)
"""
from typing import Any, Dict, List

from fastapi import APIRouter, Query

from src.services import get_rss_news_service, get_yfinance_client

router = APIRouter(prefix="/api/v1/news", tags=["News"])


@router.get("/market")
async def get_market_news(
    category: str = Query(
        default="general",
        regex="^(general|forex|crypto|merger)$"
    ),
    limit: int = Query(default=20, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """시장 뉴스 조회"""
    yfinance = get_yfinance_client()
    news = yfinance.get_market_news(category)
    
    return news[:limit] if news else []


@router.get("/global")
async def get_global_news(
    sources: str = Query(
        default="all",
        description="RSS 소스 (all, yahoo_finance, marketwatch, reuters_business, cnbc, investing)"
    ),
    limit: int = Query(default=30, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """글로벌 금융 뉴스 조회 (RSS 피드)"""
    rss_service = get_rss_news_service()
    
    if sources == "all":
        source_list = None
    else:
        source_list = [s.strip() for s in sources.split(",")]
    
    news = rss_service.fetch_news(sources=source_list, limit=limit)
    return news


@router.get("/search")
async def search_news(
    q: str = Query(..., description="검색 키워드"),
    sources: str = Query(
        default="all",
        description="검색할 RSS 소스"
    ),
    limit: int = Query(default=20, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """뉴스 검색"""
    rss_service = get_rss_news_service()
    
    if sources == "all":
        source_list = None
    else:
        source_list = [s.strip() for s in sources.split(",")]
    
    news = rss_service.search_news(keyword=q, sources=source_list, limit=limit)
    return news
