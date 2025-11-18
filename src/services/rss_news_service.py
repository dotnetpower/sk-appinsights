"""
RSS 피드 뉴스 서비스
"""
import hashlib
import logging
from datetime import datetime
from time import mktime
from typing import Any, Dict, List, Optional

import feedparser

from ..observability import trace_span

logger = logging.getLogger(__name__)


class RSSNewsService:
    """RSS 피드에서 금융 뉴스를 가져오는 서비스"""
    
    # 주요 금융 뉴스 RSS 피드
    RSS_FEEDS = {
        "yahoo_finance": "https://finance.yahoo.com/news/rssindex",
        "marketwatch": "https://www.marketwatch.com/rss/topstories",
        "reuters_business": "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
        "cnbc": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
        "investing": "https://www.investing.com/rss/news.rss",
    }
    
    @trace_span(name="rss.fetch_news", attributes={"source": "rss"})
    def fetch_news(
        self, 
        sources: Optional[List[str]] = None,
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        """
        RSS 피드에서 뉴스 가져오기
        
        Args:
            sources: 사용할 RSS 소스 리스트 (None이면 모든 소스)
            limit: 최대 뉴스 개수
            
        Returns:
            뉴스 리스트
        """
        if sources is None:
            sources = list(self.RSS_FEEDS.keys())
        
        all_news = []
        
        for source in sources:
            if source not in self.RSS_FEEDS:
                logger.warning(f"Unknown RSS source: {source}")
                continue
            
            try:
                feed_url = self.RSS_FEEDS[source]
                news_items = self._parse_feed(feed_url, source)
                all_news.extend(news_items)
                logger.info(f"Fetched {len(news_items)} articles from {source}")
            except Exception as e:
                logger.error(f"Error fetching RSS from {source}: {e}")
                continue
        
        # 시간순 정렬 (최신순)
        all_news.sort(key=lambda x: x.get('datetime', 0), reverse=True)
        
        return all_news[:limit]
    
    def _parse_feed(self, feed_url: str, source: str) -> List[Dict[str, Any]]:
        """
        RSS 피드 파싱
        
        Args:
            feed_url: RSS 피드 URL
            source: 소스 이름
            
        Returns:
            파싱된 뉴스 리스트
        """
        try:
            feed = feedparser.parse(feed_url)
            
            if not feed.entries:
                logger.warning(f"No entries found in RSS feed: {feed_url}")
                return []
            
            news_list = []
            
            for entry in feed.entries[:20]:  # 각 소스에서 최대 20개
                try:
                    # 발행 시간 파싱
                    published_time = None
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        try:
                            published_time = int(mktime(entry.published_parsed))  # type: ignore
                        except (TypeError, ValueError):
                            published_time = int(datetime.now().timestamp())
                    elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                        try:
                            published_time = int(mktime(entry.updated_parsed))  # type: ignore
                        except (TypeError, ValueError):
                            published_time = int(datetime.now().timestamp())
                    else:
                        published_time = int(datetime.now().timestamp())
                    
                    # 이미지 URL 추출
                    image_url = ""
                    if hasattr(entry, 'media_content') and entry.media_content:
                        image_url = str(entry.media_content[0].get('url', ''))
                    elif hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                        image_url = str(entry.media_thumbnail[0].get('url', ''))
                    elif hasattr(entry, 'enclosures') and entry.enclosures:
                        for enclosure in entry.enclosures:
                            enc_type = str(enclosure.get('type', ''))
                            if 'image' in enc_type:
                                image_url = str(enclosure.get('href', ''))
                                break
                    
                    # 요약문 추출
                    summary = ""
                    if hasattr(entry, 'summary'):
                        summary = str(entry.summary)
                    elif hasattr(entry, 'description'):
                        summary = str(entry.description)
                    
                    # HTML 태그 제거
                    if summary:
                        import re
                        summary = re.sub('<[^<]+?>', '', summary)
                        summary = summary.strip()[:500]  # 최대 500자
                    
                    # 고유 ID 생성 (URL 기반 해시)
                    link_str = str(entry.link) if hasattr(entry, 'link') else ""
                    article_id = hashlib.md5(
                        link_str.encode('utf-8')
                    ).hexdigest()
                    
                    news_item = {
                        "category": "market",
                        "datetime": published_time,
                        "headline": str(entry.title) if hasattr(entry, 'title') else "",
                        "id": article_id,
                        "image": image_url,
                        "related": source,
                        "source": source,
                        "summary": summary,
                        "url": link_str,
                    }
                    
                    news_list.append(news_item)
                    
                except Exception as e:
                    logger.error(f"Error parsing RSS entry: {e}")
                    continue
            
            return news_list
            
        except Exception as e:
            logger.error(f"Error parsing RSS feed {feed_url}: {e}")
            return []
    
    @trace_span(name="rss.search_news")
    def search_news(
        self, 
        keyword: str,
        sources: Optional[List[str]] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        키워드로 뉴스 검색
        
        Args:
            keyword: 검색 키워드
            sources: 검색할 RSS 소스
            limit: 최대 결과 개수
            
        Returns:
            검색된 뉴스 리스트
        """
        all_news = self.fetch_news(sources=sources, limit=100)
        
        # 키워드 필터링 (제목 또는 요약에 포함)
        keyword_lower = keyword.lower()
        filtered_news = [
            news for news in all_news
            if keyword_lower in news.get('headline', '').lower()
            or keyword_lower in news.get('summary', '').lower()
        ]
        
        return filtered_news[:limit]


# 싱글톤 인스턴스
_rss_news_service: Optional[RSSNewsService] = None


def get_rss_news_service() -> RSSNewsService:
    """RSS 뉴스 서비스 싱글톤"""
    global _rss_news_service
    if _rss_news_service is None:
        _rss_news_service = RSSNewsService()
    return _rss_news_service
