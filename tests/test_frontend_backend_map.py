"""
Frontend-Backend Application Map 테스트

이 스크립트는 Frontend와 Backend가 Application Insights의 Application Map에
연결되어 표시되는지 테스트합니다.
"""
import asyncio
import logging
import time

import httpx

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_frontend_backend_connection():
    """Frontend-Backend 연결 테스트 - Application Map 확인용"""
    
    print("=" * 80)
    print("🧪 Frontend-Backend Application Map 테스트")
    print("=" * 80)
    
    backend_url = "http://localhost:8000"
    
    # 1. 백엔드 서버 확인
    print("\n1️⃣ 백엔드 서버 상태 확인...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{backend_url}/health")
            if response.status_code == 200:
                print(f"✅ 백엔드 서버 정상: {response.json()}")
            else:
                print(f"❌ 백엔드 서버 오류: {response.status_code}")
                return
    except Exception as e:
        print(f"❌ 백엔드 서버 연결 실패: {e}")
        print("   먼저 백엔드 서버를 시작하세요: uvicorn src.main:app --reload")
        return
    
    # 2. Frontend 시뮬레이션 요청 (추적 헤더 포함)
    print("\n2️⃣ Frontend 시뮬레이션 요청 (추적 헤더 포함)...")
    
    # Operation ID 생성
    operation_id = f"{int(time.time() * 1000)}-{hash('test') % 100000:05d}"
    
    # W3C Trace Context 및 Application Insights 헤더
    headers = {
        "traceparent": f"00-{operation_id.zfill(32)}-{operation_id[:16].zfill(16)}-01",
        "Request-Id": f"|{operation_id}.",
        "Request-Context": "appId=cid-v1:etf-agent-frontend",
        "User-Agent": "Mozilla/5.0 (React App) ETF-Agent-Frontend/0.1.0",
        "Content-Type": "application/json",
    }
    
    print(f"   Operation ID: {operation_id[:16]}...")
    print(f"   Headers: traceparent, Request-Id, Request-Context")
    
    # 3. 여러 API 엔드포인트 호출
    endpoints = [
        ("/api/v1/etf/list?limit=5", "ETF 목록 조회"),
        ("/api/v1/news/market?category=general&limit=5", "뉴스 조회"),
        ("/api/v1/stocks/search?q=AAPL", "주식 검색"),
    ]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for endpoint, description in endpoints:
            print(f"\n3️⃣ {description}...")
            print(f"   Endpoint: {endpoint}")
            
            try:
                # 각 요청마다 고유한 Operation ID 생성
                request_id = f"{int(time.time() * 1000)}-{hash(endpoint) % 100000:05d}"
                request_headers = headers.copy()
                request_headers["traceparent"] = f"00-{request_id.zfill(32)}-{request_id[:16].zfill(16)}-01"
                request_headers["Request-Id"] = f"|{request_id}."
                
                start_time = time.time()
                response = await client.get(
                    f"{backend_url}{endpoint}",
                    headers=request_headers
                )
                duration_ms = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    data = response.json()
                    item_count = 0
                    
                    if isinstance(data, dict):
                        if 'etfs' in data:
                            item_count = len(data['etfs'])
                        elif 'items' in data:
                            item_count = len(data['items'])
                        elif 'results' in data:
                            item_count = len(data['results'])
                    elif isinstance(data, list):
                        item_count = len(data)
                    
                    print(f"   ✅ 성공: {response.status_code}")
                    print(f"   ⏱️  응답 시간: {duration_ms:.2f}ms")
                    print(f"   📊 결과 수: {item_count}개")
                else:
                    print(f"   ❌ 오류: {response.status_code}")
                    print(f"   응답: {response.text[:100]}")
                
                # 요청 간 간격
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"   ❌ 요청 실패: {e}")
    
    # 4. 채팅 API 테스트
    print("\n4️⃣ 채팅 API 테스트...")
    try:
        request_id = f"{int(time.time() * 1000)}-chat"
        chat_headers = headers.copy()
        chat_headers["traceparent"] = f"00-{request_id.zfill(32)}-{request_id[:16].zfill(16)}-01"
        chat_headers["Request-Id"] = f"|{request_id}."
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{backend_url}/api/v1/chat/",
                json={"message": "AAPL 주식에 대해 알려줘"},
                headers=chat_headers
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 성공: {response.status_code}")
                print(f"   💬 응답: {result.get('response', '')[:100]}...")
            else:
                print(f"   ❌ 오류: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 채팅 요청 실패: {e}")
    
    # 텔레메트리가 전송될 시간 확보
    print("\n⏳ 텔레메트리 전송 대기 중 (5초)...")
    await asyncio.sleep(5)
    
    print("\n" + "=" * 80)
    print("✅ 테스트 완료!")
    print("=" * 80)
    print("\n📊 Application Insights에서 확인하기:")
    print("\n1. Azure Portal → Application Insights 리소스")
    print("2. 왼쪽 메뉴 → Application map")
    print("3. 다음 연결을 확인:")
    print("")
    print("   ┌──────────────────────┐")
    print("   │  Browser (Frontend)  │")
    print("   └──────────┬───────────┘")
    print("              │")
    print("              ▼")
    print("   ┌──────────────────────┐")
    print("   │     etf-agent        │  ← Backend API")
    print("   └──────────┬───────────┘")
    print("              │")
    print("              ├─────────────────────┐")
    print("              │                     │")
    print("              ▼                     ▼")
    print("   ┌──────────────────┐  ┌──────────────────┐")
    print("   │     COSMOS       │  │  External APIs   │")
    print("   │  (Cosmos DB)     │  │  (yfinance 등)   │")
    print("   └──────────────────┘  └──────────────────┘")
    print("")
    print("4. 각 노드를 클릭하면 다음 정보 확인 가능:")
    print("   - 요청 수, 응답 시간, 실패율")
    print("   - 상세 요청 내역 (Request-Id로 추적)")
    print("")
    print("5. Logs에서 쿼리로 확인:")
    print("")
    print("   // Frontend → Backend 요청 확인")
    print("   requests")
    print("   | where timestamp > ago(1h)")
    print("   | where customDimensions.['http.request_context'] contains 'frontend'")
    print("   | project timestamp, name, url, duration, success")
    print("   | order by timestamp desc")
    print("")
    print("   // End-to-End 트랜잭션 추적")
    print("   requests")
    print("   | where timestamp > ago(1h)")
    print("   | extend RequestId = customDimensions.['http.request_id']")
    print("   | join kind=inner (")
    print("       dependencies")
    print("       | extend RequestId = customDimensions.['http.request_id']")
    print("   ) on RequestId")
    print("   | project timestamp, RequestName = name, DependencyName = name1, ")
    print("            RequestDuration = duration, DependencyDuration = duration1")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_frontend_backend_connection())

