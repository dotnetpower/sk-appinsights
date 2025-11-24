"""
Cosmos DB Application Map 테스트

이 스크립트는 Cosmos DB 호출이 Application Insights의 Application Map에
"COSMOS"로 표시되는지 테스트합니다.
"""
import asyncio
import logging
import time

from src.observability.telemetry import setup_telemetry
from src.services.cosmos_service import get_cosmos_service

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_cosmos_application_map():
    """Cosmos DB 호출 테스트 - Application Map 확인용"""
    
    print("=" * 80)
    print("🧪 Cosmos DB Application Map 테스트")
    print("=" * 80)
    
    # 1. Telemetry 설정
    print("\n1️⃣ Application Insights 텔레메트리 설정...")
    setup_telemetry()
    time.sleep(2)
    
    # 2. Cosmos DB 서비스 가져오기
    print("\n2️⃣ Cosmos DB 서비스 초기화...")
    cosmos_service = get_cosmos_service()
    
    if not cosmos_service.enabled:
        print("❌ Cosmos DB가 설정되지 않았습니다.")
        print("   환경변수를 확인하세요:")
        print("   - COSMOS_ENDPOINT")
        print("   - COSMOS_DATABASE_NAME")
        print("   - COSMOS_CONTAINER_NAME")
        return
    
    print("✅ Cosmos DB 연결 성공")
    
    # 3. 테스트 데이터 저장 (CREATE)
    print("\n3️⃣ 테스트 데이터 저장 (CREATE)...")
    test_symbol = "TEST_MAP"
    test_data = {
        "name": "Application Map Test",
        "price": 100.0,
        "volume": 1000000,
        "test_type": "application_map"
    }
    
    result = cosmos_service.save_etf_data(test_symbol, test_data)
    if result:
        print(f"✅ ETF 데이터 저장 성공: {test_symbol}")
    else:
        print(f"❌ ETF 데이터 저장 실패: {test_symbol}")
    
    time.sleep(1)
    
    # 4. 데이터 조회 (READ)
    print("\n4️⃣ 데이터 조회 (QUERY)...")
    latest_data = cosmos_service.get_latest_data(test_symbol, "etf")
    if latest_data:
        print(f"✅ 데이터 조회 성공: {latest_data.get('symbol')}")
        print(f"   타임스탬프: {latest_data.get('timestamp')}")
    else:
        print("❌ 데이터 조회 실패")
    
    time.sleep(1)
    
    # 5. 모든 ETF 조회 (QUERY)
    print("\n5️⃣ 모든 ETF 조회 (QUERY)...")
    all_etfs = cosmos_service.get_all_etfs(limit=10)
    print(f"✅ ETF 조회 성공: {len(all_etfs)}개")
    
    time.sleep(1)
    
    # 6. 검색 (QUERY)
    print("\n6️⃣ 검색 테스트 (QUERY)...")
    search_results = cosmos_service.search_data("TEST", limit=5)
    print(f"✅ 검색 성공: {len(search_results)}개")
    
    time.sleep(1)
    
    # 7. 주식 데이터 저장 (CREATE)
    print("\n7️⃣ 주식 데이터 저장 (CREATE)...")
    stock_data = {
        "name": "Test Stock",
        "price": 50.0,
        "change": 2.5
    }
    result = cosmos_service.save_stock_data(test_symbol, stock_data)
    if result:
        print(f"✅ 주식 데이터 저장 성공: {test_symbol}")
    else:
        print(f"❌ 주식 데이터 저장 실패: {test_symbol}")
    
    # 텔레메트리가 전송될 시간 확보
    print("\n⏳ 텔레메트리 전송 대기 중 (5초)...")
    time.sleep(5)
    
    print("\n" + "=" * 80)
    print("✅ 테스트 완료!")
    print("=" * 80)
    print("\n📊 Application Insights에서 확인하기:")
    print("\n1. Azure Portal → Application Insights 리소스")
    print("2. 왼쪽 메뉴 → Application map")
    print("3. 다음 연결을 확인:")
    print("   ┌─────────────┐")
    print("   │  etf-agent  │")
    print("   └──────┬──────┘")
    print("          │")
    print("          ▼")
    print("   ┌─────────────┐")
    print("   │   COSMOS    │  ← Cosmos DB가 이렇게 표시됩니다")
    print("   └─────────────┘")
    print("\n4. COSMOS 노드를 클릭하면 다음 정보 확인 가능:")
    print("   - Operation: create_item, query_items")
    print("   - Database: {database_name}")
    print("   - Container: {container_name}")
    print("   - 응답 시간, 실패율 등")
    print("\n5. Logs에서 쿼리로 확인:")
    print("   dependencies")
    print("   | where timestamp > ago(1h)")
    print("   | where target == 'COSMOS'")
    print("   | project timestamp, name, target, data, duration")
    print("=" * 80)


if __name__ == "__main__":
    test_cosmos_application_map()

