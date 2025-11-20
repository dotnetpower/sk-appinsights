"""
API 라우터 - ETF 관련 엔드포인트
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from ..services import get_cosmos_service, get_yfinance_client
from ..observability.utils import trace_span

router = APIRouter(prefix="/api/etf", tags=["ETF"])


@router.get("/list")
@trace_span(name="api.etf.list_etfs", attributes={"endpoint": "/api/etf/list"})
async def list_etfs(
    limit: int = Query(default=20, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """저장된 ETF 목록 조회"""
    cosmos = get_cosmos_service()
    return cosmos.get_all_etfs(limit=limit)


@router.get("/{symbol}")
@trace_span(name="api.etf.get_etf_detail", attributes={"endpoint": "/api/etf/{symbol}"})
async def get_etf_detail(symbol: str) -> Dict[str, Any]:
    """ETF 상세 정보 조회"""
    yfinance = get_yfinance_client()
    
    # ETF 프로필 및 시세 정보
    profile = yfinance.get_etf_profile(symbol.upper())
    quote = yfinance.get_quote(symbol.upper())
    holdings = yfinance.get_etf_holdings(symbol.upper())
    
    if not profile and not quote:
        raise HTTPException(status_code=404, detail=f"ETF {symbol} not found")
    
    # Cosmos DB에 저장
    cosmos = get_cosmos_service()
    etf_data = {
        "profile": profile,
        "quote": quote,
        "holdings": holdings,
        "updated_at": datetime.now(timezone.utc).isoformat()
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
    yfinance = get_yfinance_client()
    holdings = yfinance.get_etf_holdings(symbol.upper())
    
    if not holdings:
        raise HTTPException(
            status_code=404, 
            detail=f"Holdings for ETF {symbol} not found"
        )
    
    return holdings


@router.post("/{symbol}/refresh")
async def refresh_etf_data(symbol: str) -> Dict[str, Any]:
    """ETF 데이터 새로고침 및 저장"""
    yfinance = get_yfinance_client()
    cosmos = get_cosmos_service()
    
    profile = yfinance.get_etf_profile(symbol.upper())
    quote = yfinance.get_quote(symbol.upper())
    holdings = yfinance.get_etf_holdings(symbol.upper())
    
    etf_data = {
        "profile": profile,
        "quote": quote,
        "holdings": holdings,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    success = cosmos.save_etf_data(symbol.upper(), etf_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save ETF data")
    
    return {
        "message": f"ETF {symbol} data refreshed successfully",
        "data": etf_data
    }


@router.delete("/{symbol}")
async def delete_etf(symbol: str) -> Dict[str, Any]:
    """ETF 데이터 삭제"""
    cosmos = get_cosmos_service()
    
    success = cosmos.delete_etf_data(symbol.upper())
    
    if not success:
        raise HTTPException(
            status_code=404, 
            detail=f"ETF {symbol} not found or failed to delete"
        )
    
    return {
        "message": f"ETF {symbol} deleted successfully",
        "symbol": symbol.upper()
    }
