"""
API 라우터 - 뉴스 관련 엔드포인트
"""
from fastapi import APIRouter, Query
from typing import List, Dict, Any
from ..services import get_finnhub_client

router = APIRouter(prefix="/api/news", tags=["News"])


@router.get("/market")
async def get_market_news(
    category: str = Query(
        default="general",
        regex="^(general|forex|crypto|merger)$"
    ),
    limit: int = Query(default=20, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """시장 뉴스 조회"""
    finnhub = get_finnhub_client()
    news = finnhub.get_market_news(category)
    
    # 제한된 개수만 반환
    return news[:limit] if news else []
