"""
API 라우터 - 주식 관련 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from datetime import datetime, timedelta
from ..services import get_finnhub_client, get_cosmos_service

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])


@router.get("/{symbol}")
async def get_stock_detail(symbol: str) -> Dict[str, Any]:
    """주식 상세 정보 조회"""
    finnhub = get_finnhub_client()
    
    profile = finnhub.get_company_profile(symbol.upper())
    quote = finnhub.get_quote(symbol.upper())
    
    if not profile and not quote:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
    
    # Cosmos DB에 저장
    cosmos = get_cosmos_service()
    stock_data = {
        "profile": profile,
        "quote": quote,
        "updated_at": datetime.utcnow().isoformat()
    }
    cosmos.save_stock_data(symbol.upper(), stock_data)
    
    return {
        "symbol": symbol.upper(),
        "profile": profile,
        "quote": quote
    }


@router.get("/{symbol}/quote")
async def get_stock_quote(symbol: str) -> Dict[str, Any]:
    """실시간 시세 조회"""
    finnhub = get_finnhub_client()
    quote = finnhub.get_quote(symbol.upper())
    
    if not quote:
        raise HTTPException(status_code=404, detail=f"Quote for {symbol} not found")
    
    return {
        "symbol": symbol.upper(),
        "quote": quote,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/{symbol}/news")
async def get_stock_news(
    symbol: str,
    days: int = Query(default=7, ge=1, le=30)
) -> List[Dict[str, Any]]:
    """주식 뉴스 조회"""
    finnhub = get_finnhub_client()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    news = finnhub.get_company_news(
        symbol.upper(),
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d")
    )
    
    return news


@router.get("/{symbol}/candles")
async def get_stock_candles(
    symbol: str,
    resolution: str = Query(default="D", regex="^(1|5|15|30|60|D|W|M)$"),
    days: int = Query(default=30, ge=1, le=365)
) -> Dict[str, Any]:
    """주식 캔들스틱 데이터 조회 (차트용)"""
    finnhub = get_finnhub_client()
    
    end_time = int(datetime.now().timestamp())
    start_time = int((datetime.now() - timedelta(days=days)).timestamp())
    
    candles = finnhub.get_candles(symbol.upper(), resolution, start_time, end_time)
    
    if not candles or candles.get('s') == 'no_data':
        raise HTTPException(
            status_code=404, 
            detail=f"No candle data found for {symbol}"
        )
    
    return {
        "symbol": symbol.upper(),
        "resolution": resolution,
        "data": candles
    }


@router.get("/search")
async def search_stocks(q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    """주식 심볼 검색"""
    finnhub = get_finnhub_client()
    results = finnhub.search_symbol(q)
    
    return results
