"""
Alpha Vantage API 클라이언트
"""
import logging
import os
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv

from ..observability import trace_span

# .env 파일 로드
load_dotenv()

logger = logging.getLogger(__name__)


class AlphaVantageClient:
    """Alpha Vantage API 클라이언트"""
    
    def __init__(self):
        self.api_key = os.getenv("ALPHA_VANTAGE_KEY")
        if not self.api_key:
            logger.warning("ALPHA_VANTAGE_KEY not set")
        self.base_url = "https://www.alphavantage.co/query"
    
    @trace_span(name="alphavantage.get_overview", attributes={"source": "alphavantage"})
    def get_overview(self, symbol: str) -> Dict[str, Any]:
        """회사/ETF 개요 조회 (배당율, 시가총액 포함)"""
        if not self.api_key:
            return {}
        
        try:
            params = {
                "function": "OVERVIEW",
                "symbol": symbol,
                "apikey": self.api_key,
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # API 에러 체크
            if "Error Message" in data or "Note" in data:
                logger.warning(f"Alpha Vantage API error for {symbol}: {data}")
                return {}
            
            if not data or "Symbol" not in data:
                logger.info(f"No overview data for {symbol}")
                return {}
            
            # 배당율 처리
            dividend_yield = data.get("DividendYield")
            if dividend_yield:
                try:
                    dividend_yield = float(dividend_yield) * 100  # 퍼센트 변환
                except (ValueError, TypeError):
                    dividend_yield = None
            
            # 시가총액 처리
            market_cap = data.get("MarketCapitalization")
            if market_cap:
                try:
                    market_cap = int(market_cap)
                except (ValueError, TypeError):
                    market_cap = None
            
            logger.info(f"Fetched overview for {symbol} from Alpha Vantage")
            
            return {
                "symbol": data.get("Symbol", symbol),
                "name": data.get("Name", ""),
                "description": data.get("Description", ""),
                "exchange": data.get("Exchange", ""),
                "sector": data.get("Sector", ""),
                "industry": data.get("Industry", ""),
                "marketCap": market_cap,
                "dividendYield": dividend_yield,
                "peRatio": data.get("PERatio"),
                "eps": data.get("EPS"),
                "beta": data.get("Beta"),
                "week52High": data.get("52WeekHigh"),
                "week52Low": data.get("52WeekLow"),
                "movingAverage50": data.get("50DayMovingAverage"),
                "movingAverage200": data.get("200DayMovingAverage"),
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Alpha Vantage API request failed for {symbol}: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error fetching overview for {symbol}: {e}")
            return {}
    
    @trace_span(name="alphavantage.get_quote", attributes={"source": "alphavantage"})
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """실시간 시세 조회"""
        if not self.api_key:
            return {}
        
        try:
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": self.api_key,
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if "Error Message" in data or "Note" in data:
                logger.warning(f"Alpha Vantage API error for {symbol}: {data}")
                return {}
            
            quote = data.get("Global Quote", {})
            if not quote:
                logger.info(f"No quote data for {symbol}")
                return {}
            
            logger.info(f"Fetched quote for {symbol} from Alpha Vantage")
            
            return {
                "symbol": quote.get("01. symbol", symbol),
                "price": float(quote.get("05. price", 0)),
                "change": float(quote.get("09. change", 0)),
                "changePercent": quote.get("10. change percent", "0%").rstrip("%"),
                "volume": int(quote.get("06. volume", 0)),
                "previousClose": float(quote.get("08. previous close", 0)),
                "high": float(quote.get("03. high", 0)),
                "low": float(quote.get("04. low", 0)),
                "open": float(quote.get("02. open", 0)),
            }
        except Exception as e:
            logger.error(f"Error fetching quote for {symbol}: {e}")
            return {}


# 싱글톤 인스턴스
_alphavantage_client: Optional[AlphaVantageClient] = None


def get_alphavantage_client() -> AlphaVantageClient:
    """Alpha Vantage 클라이언트 싱글톤"""
    global _alphavantage_client
    if _alphavantage_client is None:
        _alphavantage_client = AlphaVantageClient()
    return _alphavantage_client
