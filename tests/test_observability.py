#!/usr/bin/env python3
"""
Observability 테스트 스크립트
"""
import asyncio
import sys

sys.path.insert(0, '/home/moonchoi/dev/sk-appinsights')

from src.observability import trace_span
from src.services.yfinance_service import get_yfinance_client


@trace_span(name="test.calculate_sum", attributes={"test": "example"})
def calculate_sum(a: int, b: int) -> int:
    """테스트 함수"""
    return a + b


@trace_span(name="test.fetch_stock_data")
async def fetch_stock_data(symbol: str):
    """주식 데이터 가져오기 테스트"""
    client = get_yfinance_client()
    quote = client.get_quote(symbol)
    return quote


async def main():
    print("=" * 60)
    print("Observability 테스트")
    print("=" * 60)
    
    # 동기 함수 테스트
    print("\n1. 동기 함수 trace_span 테스트")
    result = calculate_sum(10, 20)
    print(f"   결과: {result}")
    
    # 비동기 함수 테스트
    print("\n2. 비동기 함수 trace_span 테스트")
    stock_data = await fetch_stock_data("AAPL")
    print(f"   AAPL 현재가: ${stock_data.get('c', 'N/A')}")
    
    # YFinance 클라이언트 테스트 (데코레이터 적용됨)
    print("\n3. YFinance 클라이언트 trace 테스트")
    client = get_yfinance_client()
    profile = client.get_etf_profile("SPY")
    print(f"   SPY ETF: {profile.get('name', 'N/A')}")
    
    print("\n" + "=" * 60)
    print("✅ Observability 테스트 완료!")
    print("=" * 60)
    print("\n💡 Application Insights에서 트레이스를 확인하세요:")
    print("   https://portal.azure.com")


if __name__ == "__main__":
    asyncio.run(main())
