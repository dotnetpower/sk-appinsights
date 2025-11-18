"""
TotalRealReturns.com 스크래핑 클라이언트
YTD return 등의 추가 데이터 제공
"""
import logging
import re
from typing import Any, Dict, Optional

import requests
from bs4 import BeautifulSoup

from ..observability import trace_span

logger = logging.getLogger(__name__)


class TotalRealReturnsClient:
    """TotalRealReturns.com 웹 스크래핑 클라이언트"""
    
    def __init__(self):
        self.base_url = "https://totalrealreturns.com/s"
    
    @trace_span(name="totalrealreturns.get_returns", attributes={"source": "totalrealreturns"})
    def get_returns(self, symbol: str) -> Dict[str, Any]:
        """YTD return 및 기타 수익률 데이터 조회"""
        url = f"{self.base_url}/{symbol}"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            data = {
                "symbol": symbol,
                "ytdReturn": None,
                "totalReturn": None,
                "annualizedReturn": None,
            }
            
            # Annual Returns 테이블에서 YTD return 추출
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        cell_text = cells[0].get_text().strip()
                        
                        # YTD return
                        if 'YTD' in cell_text:
                            ytd_text = cells[1].get_text().strip()
                            # "+49.75%" -> 49.75
                            match = re.search(r'([+-]?\d+\.?\d*)%', ytd_text)
                            if match:
                                data["ytdReturn"] = float(match.group(1))
                                logger.info(f"Found YTD return for {symbol}: {data['ytdReturn']}%")
            
            # Returns 섹션에서 총 수익률 및 연간화 수익률 추출
            text = soup.get_text()
            
            # 총 수익률 패턴: "+49.75% +72.33%/yr"
            returns_pattern = r'([+-]\d+\.?\d*)%\s+([+-]\d+\.?\d*)%/yr'
            match = re.search(returns_pattern, text)
            if match:
                data["totalReturn"] = float(match.group(1))
                data["annualizedReturn"] = float(match.group(2))
                logger.info(f"Found returns for {symbol}: Total={data['totalReturn']}%, Annualized={data['annualizedReturn']}%/yr")
            
            if data["ytdReturn"] is not None:
                logger.info(f"Successfully scraped data for {symbol} from totalrealreturns.com")
                return data
            else:
                logger.warning(f"No YTD return found for {symbol} on totalrealreturns.com")
                return {}
                
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.info(f"Symbol {symbol} not found on totalrealreturns.com")
            else:
                logger.error(f"HTTP error fetching {symbol} from totalrealreturns.com: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error fetching {symbol} from totalrealreturns.com: {e}")
            return {}


# 싱글톤 인스턴스
_totalrealreturns_client: Optional[TotalRealReturnsClient] = None


def get_totalrealreturns_client() -> TotalRealReturnsClient:
    """TotalRealReturns 클라이언트 싱글톤"""
    global _totalrealreturns_client
    if _totalrealreturns_client is None:
        _totalrealreturns_client = TotalRealReturnsClient()
    return _totalrealreturns_client
