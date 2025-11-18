#!/usr/bin/env python3
"""
Live Metrics 테스트 스크립트
서버에 다양한 요청을 보내서 Live Metrics 데이터 생성
"""
import asyncio
import time

import httpx


async def test_live_metrics():
    """Live Metrics 테스트"""
    print("=" * 60)
    print("Live Metrics 테스트 시작")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        print("\n1. 헬스체크 요청 (성공)")
        response = await client.get(f"{base_url}/")
        print(f"   Status: {response.status_code}")
        
        print("\n2. 헬스체크 상세 요청 (성공)")
        response = await client.get(f"{base_url}/health")
        print(f"   Status: {response.status_code}")
        
        print("\n3. ETF 목록 조회 (성공)")
        response = await client.get(f"{base_url}/api/etf")
        print(f"   Status: {response.status_code}")
        print(f"   ETFs: {len(response.json())} 개")
        
        print("\n4. 주식 상세 조회 (성공)")
        response = await client.get(f"{base_url}/api/stocks/AAPL")
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Symbol: {data.get('symbol')}, Price: ${data.get('price')}")
        
        print("\n5. 뉴스 조회 (성공)")
        response = await client.get(f"{base_url}/api/news/general")
        print(f"   Status: {response.status_code}")
        
        print("\n6. AI 채팅 (성공)")
        response = await client.post(
            f"{base_url}/api/chat",
            json={"message": "안녕하세요"}
        )
        print(f"   Status: {response.status_code}")
        
        print("\n7. 존재하지 않는 엔드포인트 (404 에러)")
        try:
            response = await client.get(f"{base_url}/api/nonexistent")
            print(f"   Status: {response.status_code}")
        except Exception as e:
            print(f"   Error: {e}")
        
        print("\n8. 잘못된 주식 심볼 (에러 가능)")
        try:
            response = await client.get(f"{base_url}/api/stocks/INVALID999")
            print(f"   Status: {response.status_code}")
        except Exception as e:
            print(f"   Error: {e}")
        
        print("\n9. 부하 테스트 - 10개 연속 요청")
        for i in range(10):
            response = await client.get(f"{base_url}/health")
            print(f"   Request {i+1}: {response.status_code}", end="\r")
            await asyncio.sleep(0.1)
        print("\n   완료!")
    
    print("\n" + "=" * 60)
    print("✅ Live Metrics 테스트 완료!")
    print("=" * 60)
    print("\n💡 Application Insights Portal에서 Live Metrics를 확인하세요:")
    print("   https://portal.azure.com")
    print("   → Application Insights 리소스 선택")
    print("   → 왼쪽 메뉴에서 'Live Metrics' 클릭")
    print("\n📊 확인할 항목:")
    print("   - Incoming Requests (요청 수)")
    print("   - Overall Health (서버 상태)")
    print("   - Servers (서버 정보)")
    print("   - Sample Telemetry (샘플 데이터)")
    print("   - Custom Metrics (app.requests.total, app.requests.duration)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_live_metrics())
