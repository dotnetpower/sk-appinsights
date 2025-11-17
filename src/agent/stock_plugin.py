"""
Semantic Kernel 에이전트 플러그인
"""
from semantic_kernel.functions import kernel_function
from typing import Annotated
from ..services import get_finnhub_client, get_cosmos_service


class StockAnalysisPlugin:
    """주식 분석 플러그인"""
    
    @kernel_function(
        name="get_stock_price",
        description="주식의 현재 가격과 시세 정보를 조회합니다"
    )
    def get_stock_price(
        self,
        symbol: Annotated[str, "주식 심볼 (예: AAPL, MSFT)"]
    ) -> str:
        """주식 시세 조회"""
        finnhub = get_finnhub_client()
        quote = finnhub.get_quote(symbol.upper())
        
        if not quote:
            return f"{symbol} 주식 정보를 찾을 수 없습니다."
        
        current_price = quote.get('c', 0)
        change = quote.get('d', 0)
        percent_change = quote.get('dp', 0)
        high = quote.get('h', 0)
        low = quote.get('l', 0)
        
        return f"""
{symbol} 주식 정보:
- 현재가: ${current_price:.2f}
- 변동: ${change:.2f} ({percent_change:.2f}%)
- 고가: ${high:.2f}
- 저가: ${low:.2f}
"""
    
    @kernel_function(
        name="get_company_info",
        description="기업의 상세 정보를 조회합니다"
    )
    def get_company_info(
        self,
        symbol: Annotated[str, "주식 심볼 (예: AAPL, MSFT)"]
    ) -> str:
        """기업 정보 조회"""
        finnhub = get_finnhub_client()
        profile = finnhub.get_company_profile(symbol.upper())
        
        if not profile:
            return f"{symbol} 기업 정보를 찾을 수 없습니다."
        
        name = profile.get('name', 'N/A')
        country = profile.get('country', 'N/A')
        currency = profile.get('currency', 'N/A')
        exchange = profile.get('exchange', 'N/A')
        industry = profile.get('finnhubIndustry', 'N/A')
        market_cap = profile.get('marketCapitalization', 0)
        
        return f"""
{symbol} 기업 정보:
- 회사명: {name}
- 국가: {country}
- 거래소: {exchange}
- 산업: {industry}
- 시가총액: ${market_cap:.2f}M
- 통화: {currency}
"""
    
    @kernel_function(
        name="get_etf_info",
        description="ETF의 상세 정보와 보유 종목을 조회합니다"
    )
    def get_etf_info(
        self,
        symbol: Annotated[str, "ETF 심볼 (예: SPY, QQQ)"]
    ) -> str:
        """ETF 정보 조회"""
        finnhub = get_finnhub_client()
        profile = finnhub.get_etf_profile(symbol.upper())
        
        if not profile:
            return f"{symbol} ETF 정보를 찾을 수 없습니다."
        
        name = profile.get('profile', {}).get('name', 'N/A')
        description = profile.get('profile', {}).get('description', 'N/A')
        
        return f"""
{symbol} ETF 정보:
- 이름: {name}
- 설명: {description}
"""
    
    @kernel_function(
        name="search_stocks",
        description="주식 심볼을 검색합니다"
    )
    def search_stocks(
        self,
        query: Annotated[str, "검색할 회사명 또는 심볼"]
    ) -> str:
        """주식 검색"""
        finnhub = get_finnhub_client()
        results = finnhub.search_symbol(query)
        
        if not results or 'result' not in results:
            return f"'{query}'에 대한 검색 결과가 없습니다."
        
        search_results = results['result'][:5]  # 상위 5개만
        
        if not search_results:
            return f"'{query}'에 대한 검색 결과가 없습니다."
        
        output = f"'{query}' 검색 결과:\n"
        for item in search_results:
            symbol = item.get('symbol', 'N/A')
            description = item.get('description', 'N/A')
            type_ = item.get('type', 'N/A')
            output += f"- {symbol}: {description} ({type_})\n"
        
        return output
    
    @kernel_function(
        name="get_saved_etfs",
        description="데이터베이스에 저장된 ETF 목록을 조회합니다"
    )
    def get_saved_etfs(self) -> str:
        """저장된 ETF 목록 조회"""
        cosmos = get_cosmos_service()
        etfs = cosmos.get_all_etfs(limit=10)
        
        if not etfs:
            return "저장된 ETF가 없습니다."
        
        output = "저장된 ETF 목록:\n"
        for etf in etfs:
            symbol = etf.get('symbol', 'N/A')
            timestamp = etf.get('timestamp', 'N/A')
            output += f"- {symbol} (업데이트: {timestamp})\n"
        
        return output
