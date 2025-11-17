"""
API 라우터 - ETF 관련 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from datetime import datetime, timedelta
from ..services import get_finnhub_client, get_cosmos_service

router = APIRouter(prefix="/api/etf", tags=["ETF"])


@router.get("/list")
async def list_etfs(
    limit: int = Query(default=20, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """저장된 ETF 목록 조회"""
    cosmos = get_cosmos_service()
    return cosmos.get_all_etfs(limit=limit)


@router.get("/{symbol}")
async def get_etf_detail(symbol: str) -> Dict[str, Any]:
    """ETF 상세 정보 조회"""
    finnhub = get_finnhub_client()
    
    # ETF 프로필 및 시세 정보
    profile = finnhub.get_etf_profile(symbol.upper())
    quote = finnhub.get_quote(symbol.upper())
    holdings = finnhub.get_etf_holdings(symbol.upper())
    
    if not profile and not quote:
        raise HTTPException(status_code=404, detail=f"ETF {symbol} not found")
    
    # Cosmos DB에 저장
    cosmos = get_cosmos_service()
    etf_data = {
        "profile": profile,
        "quote": quote,
        "holdings": holdings,
        "updated_at": datetime.utcnow().isoformat()
    }
    cosmos.save_etf_data(symbol.upper(), etf_data)
    
    return {
        "symbol": symbol.upper(),
        "profile": profile,
        "quote": quote,
        "holdings": holdings
    }


@router.get("/{symbol}/holdings")
async def get_etf_holdings(symbol: str) -> Dict[str, Any]:
    """ETF 보유 종목 조회"""
    finnhub = get_finnhub_client()
    holdings = finnhub.get_etf_holdings(symbol.upper())
    
    if not holdings:
        raise HTTPException(
            status_code=404, 
            detail=f"Holdings for ETF {symbol} not found"
        )
    
    return holdings


@router.post("/{symbol}/refresh")
async def refresh_etf_data(symbol: str) -> Dict[str, Any]:
    """ETF 데이터 새로고침 및 저장"""
    finnhub = get_finnhub_client()
    cosmos = get_cosmos_service()
    
    profile = finnhub.get_etf_profile(symbol.upper())
    quote = finnhub.get_quote(symbol.upper())
    holdings = finnhub.get_etf_holdings(symbol.upper())
    
    etf_data = {
        "profile": profile,
        "quote": quote,
        "holdings": holdings,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    success = cosmos.save_etf_data(symbol.upper(), etf_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save ETF data")
    
    return {
        "message": f"ETF {symbol} data refreshed successfully",
        "data": etf_data
    }
