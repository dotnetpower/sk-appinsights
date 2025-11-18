#!/usr/bin/env python3
"""
pandas-datareader 폴백 테스트
"""
from src.services.yfinance_service import get_yfinance_client


def test_fallback():
    """폴백 메커니즘 테스트"""
    print("=" * 60)
    print("pandas-datareader 폴백 테스트")
    print("=" * 60)
    
    client = get_yfinance_client()
    
    # 테스트할 심볼들
    test_symbols = [
        ("AAPL", "정상 작동 예상"),
        ("PLTW", "yfinance 실패 → pandas-datareader 폴백 예상"),
        ("SPY", "ETF 정상 작동 예상"),
    ]
    
    for symbol, description in test_symbols:
        print(f"\n{'='*60}")
        print(f"테스트: {symbol} - {description}")
        print(f"{'='*60}")
        
        # 시세 조회
        print(f"\n1. {symbol} 시세 조회")
        quote = client.get_quote(symbol)
        if quote:
            print(f"   ✅ 성공: ${quote.get('c', 0):.2f}")
            print(f"   변동: {quote.get('d', 0):+.2f} ({quote.get('dp', 0):+.2f}%)")
        else:
            print(f"   ❌ 실패: 데이터를 가져올 수 없습니다")
        
        # 프로필 조회
        print(f"\n2. {symbol} 프로필 조회")
        profile = client.get_company_profile(symbol)
        if profile:
            print(f"   ✅ 성공")
            print(f"   이름: {profile.get('name', 'N/A')}")
            print(f"   업종: {profile.get('industry', 'N/A')}")
        else:
            print(f"   ❌ 실패: 프로필을 가져올 수 없습니다")
    
    print("\n" + "=" * 60)
    print("✅ 폴백 테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    test_fallback()
