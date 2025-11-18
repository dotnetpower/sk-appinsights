"""
API 라우터 - 주식 관련 엔드포인트
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from ..services import get_cosmos_service, get_yfinance_client

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])

# 간단한 메모리 캐시 (60초 TTL)
_quote_cache: Dict[str, Dict[str, Any]] = {}
_cache_ttl = 60  # 60초

# ThreadPoolExecutor for parallel processing
_executor = ThreadPoolExecutor(max_workers=10)


@router.get("/search")
async def search_stocks(q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    """주식 심볼 검색"""
    yfinance = get_yfinance_client()
    results = yfinance.search_symbol(q)
    
    return results


@router.get("/batch-quotes")
async def get_multiple_quotes(symbols: str = Query(..., description="콤마로 구분된 심볼 목록 (e.g., SPY,QQQ,DIA)")) -> Dict[str, Any]:
    """여러 심볼의 시세를 한 번에 조회 (대시보드용) - 병렬 처리"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    yfinance = get_yfinance_client()
    now = datetime.now(timezone.utc)
    
    results = {}
    symbols_to_fetch = []
    
    # 1단계: 캐시 확인
    for symbol in symbol_list:
        cache_key = symbol
        if cache_key in _quote_cache:
            cached = _quote_cache[cache_key]
            cache_time = datetime.fromisoformat(cached["timestamp"])
            if (now - cache_time).total_seconds() < _cache_ttl:
                results[symbol] = cached
                continue
        symbols_to_fetch.append(symbol)
    
    # 2단계: 캐시 미스된 심볼들을 병렬로 조회
    if symbols_to_fetch:
        def fetch_quote(symbol: str):
            try:
                quote = yfinance.get_quote(symbol)
                if quote:
                    return {
                        "symbol": symbol,
                        "quote": quote,
                        "timestamp": now.isoformat()
                    }
            except Exception as e:
                print(f"Error fetching quote for {symbol}: {e}")
                return {"symbol": symbol, "error": str(e)}
            return {"symbol": symbol, "error": "No data"}
        
        # 병렬 실행 (최대 3초 타임아웃)
        loop = asyncio.get_event_loop()
        try:
            tasks = [
                loop.run_in_executor(_executor, fetch_quote, symbol)
                for symbol in symbols_to_fetch
            ]
            fetched_results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=3.0
            )
            
            for result in fetched_results:
                if isinstance(result, dict):
                    symbol = result.get("symbol")
                    if symbol:
                        if "error" not in result:
                            _quote_cache[symbol] = result
                        results[symbol] = result
        except asyncio.TimeoutError:
            print(f"Timeout fetching quotes for: {symbols_to_fetch}")
            for symbol in symbols_to_fetch:
                if symbol not in results:
                    results[symbol] = {"symbol": symbol, "error": "Timeout"}
    
    return {"quotes": results, "cached": len([r for r in results.values() if "error" not in r])}


@router.get("/{symbol}")
async def get_stock_detail(symbol: str) -> Dict[str, Any]:
    """주식 상세 정보 조회"""
    yfinance = get_yfinance_client()
    
    # quoteType으로 ETF 판단
    import yfinance as yf
    ticker = yf.Ticker(symbol.upper())
    info = ticker.info
    quote_type = info.get("quoteType", "")
    is_etf = quote_type == "ETF"
    
    # ETF이면 ETF 프로필, 아니면 회사 프로필
    if is_etf:
        profile = yfinance.get_etf_profile(symbol.upper())
    else:
        profile = yfinance.get_company_profile(symbol.upper())
    
    quote = yfinance.get_quote(symbol.upper())
    
    if not profile and not quote:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
    
    # Cosmos DB에 저장
    cosmos = get_cosmos_service()
    data = {
        "profile": profile,
        "quote": quote,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # ETF인 경우 ETF로 저장, 아니면 주식으로 저장
    if is_etf:
        # ETF 보유 종목도 함께 저장 (만약 있다면)
        try:
            holdings = yfinance.get_etf_holdings(symbol.upper())
            if holdings:
                data["holdings"] = holdings
        except Exception as e:
            print(f"Could not get holdings for {symbol}: {e}")
        
        cosmos.save_etf_data(symbol.upper(), data)
    else:
        cosmos.save_stock_data(symbol.upper(), data)
    
    return {
        "symbol": symbol.upper(),
        "profile": profile,
        "quote": quote,
        "is_etf": is_etf
    }


@router.get("/{symbol}/quote")
async def get_stock_quote(symbol: str) -> Dict[str, Any]:
    """실시간 시세 조회 (캐싱 적용)"""
    symbol = symbol.upper()
    now = datetime.now(timezone.utc)
    
    # 캐시 확인
    if symbol in _quote_cache:
        cached = _quote_cache[symbol]
        cache_time = datetime.fromisoformat(cached["timestamp"])
        if (now - cache_time).total_seconds() < _cache_ttl:
            return cached
    
    # 캐시 미스 - 데이터 조회
    yfinance = get_yfinance_client()
    quote = yfinance.get_quote(symbol)
    
    if not quote:
        raise HTTPException(status_code=404, detail=f"Quote for {symbol} not found")
    
    data = {
        "symbol": symbol,
        "quote": quote,
        "timestamp": now.isoformat()
    }
    _quote_cache[symbol] = data
    return data


@router.get("/{symbol}/news")
async def get_stock_news(
    symbol: str,
    days: int = Query(default=7, ge=1, le=30)
) -> List[Dict[str, Any]]:
    """주식 뉴스 조회"""
    yfinance = get_yfinance_client()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    news = yfinance.get_company_news(
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
    yfinance = get_yfinance_client()
    
    end_time = int(datetime.now().timestamp())
    start_time = int((datetime.now() - timedelta(days=days)).timestamp())
    
    candles = yfinance.get_candles(symbol.upper(), resolution, start_time, end_time)
    
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

