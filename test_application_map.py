"""
Application Map 통합 테스트

Frontend → Backend → Cosmos DB → External APIs
전체 연결이 Application Insights의 Application Map에 제대로 표시되는지 테스트
"""
import asyncio
import logging
import sys
import time
from typing import Dict, List, Tuple

import httpx

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ApplicationMapTester:
    """Application Map 테스트 클래스"""
    
    def __init__(self, backend_url: str = "http://localhost:8000"):
        self.backend_url = backend_url
        self.test_results: List[Dict] = []
        
    def generate_operation_id(self, prefix: str = "") -> str:
        """고유한 Operation ID 생성"""
        timestamp = int(time.time() * 1000)
        suffix = hash(f"{prefix}{timestamp}") % 100000
        return f"{timestamp}-{suffix:05d}"
    
    def create_trace_headers(self, operation_id: str) -> Dict[str, str]:
        """W3C Trace Context + Application Insights 헤더 생성"""
        return {
            "traceparent": f"00-{operation_id.zfill(32)}-{operation_id[:16].zfill(16)}-01",
            "Request-Id": f"|{operation_id}.",
            "Request-Context": "appId=cid-v1:etf-agent-frontend",
            "User-Agent": "Mozilla/5.0 (React App) ETF-Agent-Frontend/0.1.0",
            "Content-Type": "application/json",
        }
    
    async def check_health(self) -> bool:
        """백엔드 서버 상태 확인"""
        print("\n" + "=" * 80)
        print("🏥 백엔드 서버 상태 확인")
        print("=" * 80)
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.backend_url}/health")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ 백엔드 서버 정상 작동")
                    print(f"   상태: {data.get('status', 'unknown')}")
                    print(f"   타임스탬프: {data.get('timestamp', 'N/A')}")
                    return True
                else:
                    print(f"❌ 백엔드 서버 응답 오류: {response.status_code}")
                    return False
                    
        except httpx.ConnectError:
            print(f"❌ 백엔드 서버 연결 실패")
            print(f"   다음 명령으로 서버를 시작하세요:")
            print(f"   source .venv/bin/activate && uvicorn src.main:app --reload")
            return False
        except Exception as e:
            print(f"❌ 예기치 않은 오류: {e}")
            return False
    
    async def test_endpoint(
        self,
        endpoint: str,
        description: str,
        method: str = "GET",
        json_data: Dict = None
    ) -> Tuple[bool, Dict]:
        """개별 엔드포인트 테스트"""
        operation_id = self.generate_operation_id(endpoint)
        headers = self.create_trace_headers(operation_id)
        
        print(f"\n📡 {description}")
        print(f"   Endpoint: {endpoint}")
        print(f"   Method: {method}")
        print(f"   Operation ID: {operation_id[:20]}...")
        
        result = {
            "endpoint": endpoint,
            "description": description,
            "operation_id": operation_id,
            "success": False,
            "status_code": None,
            "duration_ms": None,
            "error": None,
            "response_summary": None,
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                start_time = time.time()
                
                if method == "GET":
                    response = await client.get(
                        f"{self.backend_url}{endpoint}",
                        headers=headers
                    )
                elif method == "POST":
                    response = await client.post(
                        f"{self.backend_url}{endpoint}",
                        headers=headers,
                        json=json_data or {}
                    )
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                duration_ms = (time.time() - start_time) * 1000
                
                result["status_code"] = response.status_code
                result["duration_ms"] = round(duration_ms, 2)
                
                if response.status_code == 200:
                    result["success"] = True
                    
                    # 응답 데이터 분석
                    try:
                        data = response.json()
                        if isinstance(data, dict):
                            # 결과 항목 수 계산
                            item_count = 0
                            for key in ['etfs', 'items', 'results', 'news', 'data']:
                                if key in data and isinstance(data[key], list):
                                    item_count = len(data[key])
                                    break
                            
                            result["response_summary"] = f"{item_count} items" if item_count > 0 else "success"
                        elif isinstance(data, list):
                            result["response_summary"] = f"{len(data)} items"
                        else:
                            result["response_summary"] = "success"
                    except:
                        result["response_summary"] = "success"
                    
                    print(f"   ✅ 성공: {response.status_code}")
                    print(f"   ⏱️  응답 시간: {duration_ms:.2f}ms")
                    print(f"   📊 결과: {result['response_summary']}")
                else:
                    result["error"] = f"HTTP {response.status_code}"
                    print(f"   ❌ 오류: {response.status_code}")
                    print(f"   응답: {response.text[:100]}")
                    
        except httpx.TimeoutException:
            result["error"] = "Timeout"
            print(f"   ⏰ 타임아웃")
        except Exception as e:
            result["error"] = str(e)
            print(f"   ❌ 요청 실패: {e}")
        
        self.test_results.append(result)
        return result["success"], result
    
    async def run_all_tests(self):
        """모든 테스트 실행"""
        print("\n" + "=" * 80)
        print("🧪 Application Map 통합 테스트 시작")
        print("=" * 80)
        
        # 1. 서버 상태 확인
        if not await self.check_health():
            print("\n❌ 백엔드 서버가 실행 중이지 않습니다. 테스트를 중단합니다.")
            return False
        
        # 2. 테스트 케이스 정의
        test_cases = [
            # ETF API 테스트
            ("/api/etf/list?limit=5", "ETF 목록 조회", "GET", None),
            
            # 뉴스 API 테스트
            ("/api/news/market?category=general&limit=5", "시장 뉴스 조회", "GET", None),
            ("/api/news/global?sources=all&limit=5", "글로벌 뉴스 조회", "GET", None),
            
            # 주식 API 테스트
            ("/api/stocks/search?q=AAPL", "주식 검색 (AAPL)", "GET", None),
            ("/api/stocks/search?q=MSFT", "주식 검색 (MSFT)", "GET", None),
            
            # 채팅 API 테스트 (Semantic Kernel + Cosmos DB + External APIs)
            ("/api/chat/", "AI 채팅 - AAPL 분석", "POST", {"message": "AAPL 주식에 대해 알려줘"}),
            ("/api/chat/", "AI 채팅 - ETF 추천", "POST", {"message": "기술주 ETF 추천해줘"}),
        ]
        
        # 3. 각 테스트 실행
        print("\n" + "=" * 80)
        print("📋 API 엔드포인트 테스트")
        print("=" * 80)
        
        success_count = 0
        for endpoint, description, method, json_data in test_cases:
            success, _ = await self.test_endpoint(endpoint, description, method, json_data)
            if success:
                success_count += 1
            
            # 요청 간 간격 (텔레메트리 처리 시간)
            await asyncio.sleep(0.5)
        
        # 4. 결과 요약
        total_tests = len(test_cases)
        print("\n" + "=" * 80)
        print("📊 테스트 결과 요약")
        print("=" * 80)
        print(f"\n총 테스트: {total_tests}")
        print(f"성공: {success_count}")
        print(f"실패: {total_tests - success_count}")
        print(f"성공률: {(success_count / total_tests * 100):.1f}%")
        
        # 실패한 테스트 상세 정보
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\n❌ 실패한 테스트:")
            for test in failed_tests:
                print(f"   - {test['description']}")
                print(f"     Endpoint: {test['endpoint']}")
                print(f"     오류: {test['error']}")
        
        # 5. 텔레메트리 전송 대기
        print("\n⏳ 텔레메트리 전송 대기 중 (10초)...")
        await asyncio.sleep(10)
        
        # 6. Application Map 확인 가이드
        self.print_verification_guide()
        
        return success_count == total_tests
    
    def print_verification_guide(self):
        """Application Map 확인 가이드 출력"""
        print("\n" + "=" * 80)
        print("📊 Application Insights에서 확인하기")
        print("=" * 80)
        
        print("\n1️⃣ Application Map 보기:")
        print("   Azure Portal → Application Insights 리소스")
        print("   → 왼쪽 메뉴 → Application map")
        
        print("\n2️⃣ 예상 연결 구조:")
        print("")
        print("   ┌──────────────────────┐")
        print("   │  Browser (Frontend)  │  ← React App")
        print("   │   etf-agent-frontend │")
        print("   └──────────┬───────────┘")
        print("              │ HTTP Requests")
        print("              │ (traceparent, Request-Id)")
        print("              ▼")
        print("   ┌──────────────────────┐")
        print("   │     etf-agent        │  ← FastAPI Backend")
        print("   │   (Backend API)      │")
        print("   └──────────┬───────────┘")
        print("              │")
        print("              ├─────────────────────┬─────────────────────┐")
        print("              │                     │                     │")
        print("              ▼                     ▼                     ▼")
        print("   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐")
        print("   │     COSMOS       │  │  yfinance API    │  │  RSS Feeds       │")
        print("   │  (Cosmos DB)     │  │  (External)      │  │  (External)      │")
        print("   └──────────────────┘  └──────────────────┘  └──────────────────┘")
        print("")
        
        print("3️⃣ 각 노드 확인 사항:")
        print("   ✓ 노드 이름이 올바르게 표시되는지")
        print("   ✓ 연결선(화살표)이 그려져 있는지")
        print("   ✓ 요청 수, 평균 응답 시간이 표시되는지")
        print("   ✓ 실패한 요청이 있다면 빨간색으로 표시되는지")
        
        print("\n4️⃣ KQL 쿼리로 상세 확인:")
        print("")
        print("   # Frontend → Backend 요청 추적")
        print("   requests")
        print("   | where timestamp > ago(1h)")
        print("   | where customDimensions.['http.request_context'] contains 'frontend'")
        print("   | project timestamp, name, url, duration, success,")
        print("            operation_Id, request_id = customDimensions.['http.request_id']")
        print("   | order by timestamp desc")
        print("")
        print("   # Backend → Cosmos DB 의존성")
        print("   dependencies")
        print("   | where timestamp > ago(1h)")
        print("   | where target == 'COSMOS'")
        print("   | summarize Count = count(), AvgDuration = avg(duration)")
        print("       by name, type")
        print("   | order by Count desc")
        print("")
        print("   # End-to-End 트랜잭션 (Frontend → Backend → Dependencies)")
        print("   let timeRange = ago(1h);")
        print("   requests")
        print("   | where timestamp > timeRange")
        print("   | extend operation_Id")
        print("   | join kind=inner (")
        print("       dependencies")
        print("       | where timestamp > timeRange")
        print("       | extend operation_Id")
        print("   ) on operation_Id")
        print("   | project ")
        print("       timestamp,")
        print("       RequestName = name,")
        print("       DependencyType = type1,")
        print("       DependencyTarget = target,")
        print("       RequestDuration = duration,")
        print("       DependencyDuration = duration1,")
        print("       TotalDuration = duration + duration1,")
        print("       Success = success and success1")
        print("   | order by timestamp desc")
        print("")
        
        print("5️⃣ Live Metrics 확인:")
        print("   Application Insights → Live Metrics")
        print("   → 실시간으로 요청/응답/의존성 확인 가능")
        print("")
        
        print("=" * 80)


async def main():
    """메인 함수"""
    print("\n🚀 Application Map 통합 테스트 도구")
    print("=" * 80)
    print("이 도구는 다음을 테스트합니다:")
    print("  - Frontend → Backend 연결 (W3C Trace Context)")
    print("  - Backend → Cosmos DB 연결 (peer.service)")
    print("  - Backend → External APIs 연결")
    print("  - Application Map 노드 및 연결 표시")
    print("=" * 80)
    
    # 테스터 생성 및 실행
    tester = ApplicationMapTester()
    success = await tester.run_all_tests()
    
    # 종료 코드
    if success:
        print("\n✅ 모든 테스트가 성공적으로 완료되었습니다!")
        sys.exit(0)
    else:
        print("\n⚠️  일부 테스트가 실패했습니다. 위의 결과를 확인하세요.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  사용자에 의해 테스트가 중단되었습니다.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ 예기치 않은 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
