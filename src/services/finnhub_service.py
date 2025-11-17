"""
Finnhub API 클라이언트
"""
import finnhub
from typing import List, Dict, Any, Optional
from ..config import get_settings


class FinnhubClient:
    """Finnhub API 클라이언트"""
    
    def __init__(self):
        settings = get_settings()
        self.client = finnhub.Client(api_key=settings.finnhub_api_key)
    
    def get_etf_profile(self, symbol: str) -> Dict[str, Any]:
        """ETF 프로필 조회"""
        try:
            return self.client.etf_profile(symbol)
        except Exception as e:
            print(f"Error fetching ETF profile for {symbol}: {e}")
            return {}
    
    def get_etf_holdings(self, symbol: str) -> Dict[str, Any]:
        """ETF 보유 종목 조회"""
        try:
            return self.client.etf_holdings(symbol)
        except Exception as e:
            print(f"Error fetching ETF holdings for {symbol}: {e}")
            return {}
    
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """실시간 시세 조회"""
        try:
            return self.client.quote(symbol)
        except Exception as e:
            print(f"Error fetching quote for {symbol}: {e}")
            return {}
    
    def get_company_profile(self, symbol: str) -> Dict[str, Any]:
        """기업 프로필 조회"""
        try:
            return self.client.company_profile2(symbol=symbol)
        except Exception as e:
            print(f"Error fetching company profile for {symbol}: {e}")
            return {}
    
    def get_company_news(
        self, 
        symbol: str, 
        start_date: str, 
        end_date: str
    ) -> List[Dict[str, Any]]:
        """기업 뉴스 조회"""
        try:
            return self.client.company_news(symbol, _from=start_date, to=end_date)
        except Exception as e:
            print(f"Error fetching news for {symbol}: {e}")
            return []
    
    def get_market_news(self, category: str = "general") -> List[Dict[str, Any]]:
        """시장 뉴스 조회"""
        try:
            return self.client.general_news(category)
        except Exception as e:
            print(f"Error fetching market news: {e}")
            return []
    
    def get_candles(
        self,
        symbol: str,
        resolution: str,
        from_timestamp: int,
        to_timestamp: int
    ) -> Dict[str, Any]:
        """캔들스틱 데이터 조회 (차트용)"""
        try:
            return self.client.stock_candles(
                symbol, resolution, from_timestamp, to_timestamp
            )
        except Exception as e:
            print(f"Error fetching candles for {symbol}: {e}")
            return {}
    
    def search_symbol(self, query: str) -> Dict[str, Any]:
        """심볼 검색"""
        try:
            return self.client.symbol_lookup(query)
        except Exception as e:
            print(f"Error searching symbol {query}: {e}")
            return {}


# 싱글톤 인스턴스
_finnhub_client: Optional[FinnhubClient] = None


def get_finnhub_client() -> FinnhubClient:
    """Finnhub 클라이언트 싱글톤"""
    global _finnhub_client
    if _finnhub_client is None:
        _finnhub_client = FinnhubClient()
    return _finnhub_client
