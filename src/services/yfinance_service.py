"""
Yahoo Finance API 클라이언트 (yfinance)
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import pandas as pd
import yfinance as yf

from ..observability import trace_span
from .alphavantage_service import get_alphavantage_client
from .totalrealreturns_service import get_totalrealreturns_client

logger = logging.getLogger(__name__)


class YFinanceClient:
    """Yahoo Finance API 클라이언트"""
    
    @trace_span(name="yfinance.get_etf_profile", attributes={"source": "yfinance"})
    def get_etf_profile(self, symbol: str) -> Dict[str, Any]:
        """ETF 프로필 조회 (yfinance 사용)"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # 유효한 데이터인지 확인 (최소한의 가격 정보가 있어야 함)
            if info and len(info) > 1 and (info.get("regularMarketPrice") or info.get("navPrice") or info.get("currentPrice")):
                # 배당율 처리
                trailing_yield = info.get("trailingAnnualDividendYield")
                if trailing_yield == 0 or trailing_yield == 0.0:
                    trailing_yield = None
                elif trailing_yield and trailing_yield < 1:
                    trailing_yield = trailing_yield * 100
                    
                yield_value = info.get("yield")
                if yield_value and yield_value < 1:
                    yield_value = yield_value * 100
                    
                dividend_yield = info.get("dividendYield") or yield_value or trailing_yield
                
                # YTD return 처리: totalrealreturns.com 우선 (yfinance 값이 부정확함)
                ytd_return = None
                try:
                    trr_client = get_totalrealreturns_client()
                    trr_data = trr_client.get_returns(symbol)
                    if trr_data and trr_data.get("ytdReturn") is not None:
                        ytd_return = trr_data["ytdReturn"] / 100  # 퍼센트를 비율로 변환
                        logger.info(f"Using YTD return from totalrealreturns for {symbol}: {ytd_return:.4f}")
                except Exception as e:
                    logger.debug(f"Could not get YTD return from totalrealreturns for {symbol}: {e}")
                
                # totalrealreturns 실패시 yfinance 폴백 (단, 비정상적으로 큰 값은 무시)
                if ytd_return is None:
                    yf_ytd = info.get("ytdReturn")
                    if yf_ytd is not None and abs(yf_ytd) <= 10:  # -1000% ~ +1000% 범위만 허용
                        ytd_return = yf_ytd
                        logger.info(f"Using YTD return from yfinance for {symbol}: {ytd_return:.4f}")
                
                return {
                    "symbol": symbol,
                    "name": info.get("longName", info.get("shortName", symbol)),
                    "description": info.get("longBusinessSummary", ""),
                    "currency": info.get("currency", "USD"),
                    "exchange": info.get("exchange", ""),
                    "category": info.get("category", ""),
                    "totalAssets": info.get("totalAssets"),
                    "navPrice": info.get("navPrice"),
                    "ytdReturn": ytd_return,
                    "threeYearAverageReturn": info.get("threeYearAverageReturn"),
                    "fiveYearAverageReturn": info.get("fiveYearAverageReturn"),
                    "dividendYield": dividend_yield,
                    "trailingAnnualDividendYield": info.get("trailingAnnualDividendYield") or dividend_yield,
                    "marketCap": info.get("marketCap"),
                }
        except Exception as e:
            logger.warning(f"yfinance failed for ETF {symbol}: {e}")
        
        # 2차: yfinance 시도
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # 유효한 데이터인지 확인 (최소한의 가격 정보가 있어야 함)
            if info and len(info) > 1 and (info.get("regularMarketPrice") or info.get("navPrice") or info.get("currentPrice")):
                # 배당율 처리
                trailing_yield = info.get("trailingAnnualDividendYield")
                if trailing_yield == 0 or trailing_yield == 0.0:
                    trailing_yield = None
                elif trailing_yield and trailing_yield < 1:
                    trailing_yield = trailing_yield * 100
                    
                yield_value = info.get("yield")
                if yield_value and yield_value < 1:
                    yield_value = yield_value * 100
                    
                dividend_yield = info.get("dividendYield") or yield_value or trailing_yield
                
                # 시가총액 계산
                market_cap = info.get("marketCap")
                if not market_cap:
                    try:
                        shares = info.get("sharesOutstanding") or info.get("impliedSharesOutstanding")
                        current_price = info.get("regularMarketPrice") or info.get("navPrice") or info.get("currentPrice")
                        
                        if shares and current_price:
                            market_cap = shares * current_price
                            logger.info(f"Calculated market cap for {symbol}: ${market_cap:,.0f}")
                    except Exception as e:
                        logger.debug(f"Could not calculate market cap for {symbol}: {e}")
                
                # YTD return 처리: totalrealreturns.com 우선 (yfinance 값이 부정확함)
                ytd_return = None
                try:
                    trr_client = get_totalrealreturns_client()
                    trr_data = trr_client.get_returns(symbol)
                    if trr_data and trr_data.get("ytdReturn") is not None:
                        ytd_return = trr_data["ytdReturn"] / 100  # 퍼센트를 비율로 변환
                        logger.info(f"Using YTD return from totalrealreturns for {symbol}: {ytd_return:.4f}")
                except Exception as e:
                    logger.debug(f"Could not get YTD return from totalrealreturns for {symbol}: {e}")
                
                # totalrealreturns 실패시 yfinance 폴백 (단, 비정상적으로 큰 값은 무시)
                if ytd_return is None:
                    yf_ytd = info.get("ytdReturn")
                    if yf_ytd is not None and abs(yf_ytd) <= 10:  # -1000% ~ +1000% 범위만 허용
                        ytd_return = yf_ytd
                        logger.info(f"Using YTD return from yfinance for {symbol}: {ytd_return:.4f}")
                
                logger.info(f"Fetched ETF profile for {symbol} from yfinance")
                return {
                    "symbol": symbol,
                    "name": info.get("longName", info.get("shortName", "")),
                    "description": info.get("longBusinessSummary", ""),
                    "currency": info.get("currency", "USD"),
                    "exchange": info.get("exchange", ""),
                    "category": info.get("category", ""),
                    "totalAssets": info.get("totalAssets"),
                    "navPrice": info.get("navPrice"),
                    "ytdReturn": ytd_return,
                    "threeYearAverageReturn": info.get("threeYearAverageReturn"),
                    "fiveYearAverageReturn": info.get("fiveYearAverageReturn"),
                    "dividendYield": dividend_yield,
                    "trailingAnnualDividendYield": info.get("trailingAnnualDividendYield") or dividend_yield,
                    "marketCap": market_cap,
                }
            else:
                logger.warning(f"yfinance returned insufficient data for ETF {symbol}")
        except Exception as e:
            logger.error(f"yfinance also failed for ETF {symbol}: {e}")
        
        # Alpha Vantage는 ETF OVERVIEW를 지원하지 않으므로 폴백하지 않음
        return {}
    
    def get_etf_holdings(self, symbol: str) -> Dict[str, Any]:
        """ETF 보유 종목 조회"""
        try:
            ticker = yf.Ticker(symbol)
            holdings = ticker.institutional_holders
            
            if holdings is not None and not holdings.empty:
                return {
                    "symbol": symbol,
                    "holdings": holdings.to_dict('records')
                }
            return {"symbol": symbol, "holdings": []}
        except Exception as e:
            print(f"Error fetching ETF holdings for {symbol}: {e}")
            return {}
    
    @trace_span(name="yfinance.get_quote", attributes={"source": "yfinance"})
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """실시간 시세 조회 (yfinance 사용)"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            history = ticker.history(period="2d")
            
            if not history.empty and len(history) > 0:
                current = history.iloc[-1]
                previous = history.iloc[-2] if len(history) > 1 else current
                
                current_price = float(current['Close'])
                previous_close = float(previous['Close'])
                change = current_price - previous_close
                percent_change = (change / previous_close * 100) if previous_close != 0 else 0
                
                try:
                    if isinstance(current.name, pd.Timestamp):
                        timestamp = int(current.name.timestamp())
                    else:
                        timestamp = int(datetime.now().timestamp())
                except (AttributeError, TypeError):
                    timestamp = int(datetime.now().timestamp())
                
                logger.info(f"Successfully fetched {symbol} from yfinance")
                return {
                    "c": current_price,
                    "h": float(current['High']),
                    "l": float(current['Low']),
                    "o": float(current['Open']),
                    "pc": previous_close,
                    "d": change,
                    "dp": percent_change,
                    "t": timestamp,
                }
            else:
                logger.warning(f"yfinance returned no history for {symbol}")
        except Exception as e:
            logger.error(f"yfinance also failed for {symbol}: {e}")
        
        return {}
    
    @trace_span(name="yfinance.get_company_profile", attributes={"source": "yfinance"})
    def get_company_profile(self, symbol: str) -> Dict[str, Any]:
        """기업 프로필 조회 (yfinance 사용)"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if info and len(info) > 1:
                # 배당율 처리
                trailing_yield = info.get("trailingAnnualDividendYield")
                if trailing_yield and trailing_yield < 1:
                    trailing_yield = trailing_yield * 100
                    
                yield_value = info.get("yield")
                if yield_value and yield_value < 1:
                    yield_value = yield_value * 100
                    
                dividend_yield = info.get("dividendYield") or yield_value or trailing_yield
                
                logger.info(f"Fetched company profile for {symbol} from yfinance")
                return {
                    "country": info.get("country", ""),
                    "currency": info.get("currency", "USD"),
                    "exchange": info.get("exchange", ""),
                    "name": info.get("longName", info.get("shortName", "")),
                    "ticker": symbol,
                    "ipo": info.get("firstTradeDateEpochUtc"),
                    "marketCapitalization": info.get("marketCap"),
                    "shareOutstanding": info.get("sharesOutstanding"),
                    "logo": info.get("logo_url", ""),
                    "phone": info.get("phone", ""),
                    "weburl": info.get("website", ""),
                    "finnhubIndustry": info.get("industry", ""),
                    "industry": info.get("industry", ""),
                    "sector": info.get("sector", ""),
                    "dividendYield": dividend_yield,
                    "marketCap": info.get("marketCap"),
                }
        except Exception as e:
            logger.error(f"yfinance also failed for {symbol} profile: {e}")
        
        # 3차: Alpha Vantage 시도
        try:
            av_client = get_alphavantage_client()
            overview = av_client.get_overview(symbol)
            
            if overview and overview.get("marketCap"):
                logger.info(f"Fetched company profile for {symbol} from Alpha Vantage")
                return {
                    "country": "",
                    "currency": "USD",
                    "exchange": overview.get("exchange", ""),
                    "name": overview.get("name", ""),
                    "ticker": symbol,
                    "ipo": None,
                    "marketCapitalization": overview.get("marketCap"),
                    "shareOutstanding": None,
                    "logo": "",
                    "phone": "",
                    "weburl": "",
                    "finnhubIndustry": overview.get("industry", ""),
                    "industry": overview.get("industry", ""),
                    "sector": overview.get("sector", ""),
                    "dividendYield": overview.get("dividendYield"),
                    "marketCap": overview.get("marketCap"),
                }
        except Exception as e:
            logger.warning(f"Alpha Vantage also failed for {symbol} profile: {e}")
        
        return {}
    
    def get_company_news(
        self, 
        symbol: str, 
        start_date: str, 
        end_date: str
    ) -> List[Dict[str, Any]]:
        """기업 뉴스 조회"""
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            
            if not news:
                return []
            
            # 날짜 필터링
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            filtered_news = []
            for item in news:
                # providerPublishTime이 timestamp인 경우
                pub_time = item.get('providerPublishTime')
                if pub_time:
                    news_dt = datetime.fromtimestamp(pub_time)
                    if start_dt <= news_dt <= end_dt:
                        filtered_news.append({
                            "category": "company",
                            "datetime": pub_time,
                            "headline": item.get('title', ''),
                            "id": item.get('uuid', ''),
                            "image": item.get('thumbnail', {}).get('resolutions', [{}])[0].get('url', ''),
                            "related": symbol,
                            "source": item.get('publisher', ''),
                            "summary": item.get('summary', ''),
                            "url": item.get('link', ''),
                        })
            
            return filtered_news[:50]  # 최대 50개
        except Exception as e:
            print(f"Error fetching news for {symbol}: {e}")
            return []
    
    def get_market_news(self, category: str = "general") -> List[Dict[str, Any]]:
        """시장 뉴스 조회 (yfinance는 전체 시장 뉴스를 제공하지 않음)"""
        # yfinance는 특정 심볼에 대한 뉴스만 제공
        # 주요 지수의 뉴스를 가져오는 방식으로 대체
        try:
            indices = ["^GSPC", "^DJI", "^IXIC"]  # S&P 500, Dow Jones, NASDAQ
            all_news = []
            
            for index in indices:
                ticker = yf.Ticker(index)
                news = ticker.news
                
                if news:
                    for item in news[:10]:  # 각 지수에서 10개씩
                        # 새로운 응답 구조: content 객체 안에 데이터
                        content = item.get('content', {})
                        
                        # pubDate를 timestamp로 변환
                        pub_date = content.get('pubDate', '')
                        if pub_date:
                            from dateutil import parser
                            try:
                                dt = parser.parse(pub_date)
                                publish_time = int(dt.timestamp())
                            except:
                                publish_time = int(datetime.now(timezone.utc).timestamp())
                        else:
                            publish_time = int(datetime.now(timezone.utc).timestamp())
                        
                        # 썸네일 URL 추출
                        thumbnail = content.get('thumbnail') or {}
                        resolutions = thumbnail.get('resolutions', [])
                        image_url = ''
                        if resolutions:
                            # 중간 크기 이미지 선택 (170x128)
                            for res in resolutions:
                                if res.get('tag') == '170x128':
                                    image_url = res.get('url', '')
                                    break
                            if not image_url and resolutions:
                                image_url = resolutions[0].get('url', '')
                        
                        all_news.append({
                            "category": category,
                            "datetime": publish_time,
                            "headline": content.get('title', ''),
                            "id": content.get('id', ''),
                            "image": image_url,
                            "related": index,
                            "source": content.get('provider', {}).get('displayName', ''),
                            "summary": content.get('summary', ''),
                            "url": content.get('canonicalUrl', {}).get('url', ''),
                        })
            
            # 시간순 정렬 (None 값 처리)
            all_news.sort(key=lambda x: x.get('datetime') or 0, reverse=True)
            return all_news[:30]  # 최대 30개
        except Exception as e:
            print(f"Error fetching market news: {e}")
            import traceback
            traceback.print_exc()
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
            # resolution 변환 (finnhub -> yfinance)
            interval_map = {
                "1": "1m",
                "5": "5m",
                "15": "15m",
                "30": "30m",
                "60": "1h",
                "D": "1d",
                "W": "1wk",
                "M": "1mo",
            }
            interval = interval_map.get(resolution, "1d")
            
            ticker = yf.Ticker(symbol)
            start_date = datetime.fromtimestamp(from_timestamp)
            end_date = datetime.fromtimestamp(to_timestamp)
            
            history = ticker.history(start=start_date, end=end_date, interval=interval)
            
            if history.empty:
                return {"s": "no_data"}
            
            # Finnhub 형식으로 변환
            return {
                "s": "ok",
                "c": history['Close'].tolist(),
                "h": history['High'].tolist(),
                "l": history['Low'].tolist(),
                "o": history['Open'].tolist(),
                "v": history['Volume'].tolist(),
                "t": [int(ts.timestamp()) for ts in history.index],
            }
        except Exception as e:
            print(f"Error fetching candles for {symbol}: {e}")
            return {"s": "error", "error": str(e)}
    
    def search_symbol(self, query: str) -> Dict[str, Any]:
        """심볼 검색"""
        try:
            # yfinance에는 직접적인 검색 기능이 없으므로
            # 입력된 쿼리를 심볼로 간주하고 유효성 확인
            ticker = yf.Ticker(query.upper())
            info = ticker.info
            
            if info and info.get('regularMarketPrice'):
                return {
                    "count": 1,
                    "result": [{
                        "description": info.get("longName", info.get("shortName", "")),
                        "displaySymbol": query.upper(),
                        "symbol": query.upper(),
                        "type": info.get("quoteType", ""),
                    }]
                }
            
            return {"count": 0, "result": []}
        except Exception as e:
            print(f"Error searching symbol {query}: {e}")
            return {"count": 0, "result": []}


# 싱글톤 인스턴스
_yfinance_client: Optional[YFinanceClient] = None


def get_yfinance_client() -> YFinanceClient:
    """YFinance 클라이언트 싱글톤"""
    global _yfinance_client
    if _yfinance_client is None:
        _yfinance_client = YFinanceClient()
    return _yfinance_client
