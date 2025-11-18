#!/usr/bin/env python3
"""
RSS 뉴스 서비스 테스트
"""
import asyncio

from src.services.rss_news_service import get_rss_news_service


def test_rss_news():
    """RSS 뉴스 서비스 테스트"""
    print("=" * 60)
    print("RSS 뉴스 서비스 테스트")
    print("=" * 60)
    
    rss_service = get_rss_news_service()
    
    print("\n1. 모든 소스에서 뉴스 가져오기 (최대 10개)")
    news = rss_service.fetch_news(limit=10)
    print(f"   총 {len(news)}개 뉴스")
    
    if news:
        print("\n   첫 번째 뉴스:")
        first = news[0]
        print(f"   제목: {first['headline']}")
        print(f"   소스: {first['source']}")
        print(f"   URL: {first['url'][:80]}...")
        if first.get('summary'):
            print(f"   요약: {first['summary'][:100]}...")
    
    print("\n2. Yahoo Finance 뉴스만 가져오기")
    yahoo_news = rss_service.fetch_news(sources=["yahoo_finance"], limit=5)
    print(f"   총 {len(yahoo_news)}개 뉴스")
    for i, item in enumerate(yahoo_news[:3], 1):
        print(f"   {i}. {item['headline'][:60]}...")
    
    print("\n3. 키워드 검색: 'stock'")
    search_results = rss_service.search_news("stock", limit=5)
    print(f"   총 {len(search_results)}개 검색 결과")
    for i, item in enumerate(search_results[:3], 1):
        print(f"   {i}. {item['headline'][:60]}...")
    
    print("\n" + "=" * 60)
    print("✅ RSS 뉴스 테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    test_rss_news()
