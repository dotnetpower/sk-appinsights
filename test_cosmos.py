#!/usr/bin/env python3
"""
CosmosDB 연결 테스트 스크립트
"""
import sys
from datetime import datetime, timezone

# 프로젝트 경로 추가
sys.path.insert(0, '/home/moonchoi/dev/sk-appinsights')

from src.config import get_settings
from src.services.cosmos_service import get_cosmos_service


def test_cosmos_connection():
    """CosmosDB 연결 테스트"""
    print("=" * 60)
    print("CosmosDB 연결 테스트 시작")
    print("=" * 60)
    
    # 설정 확인
    print("\n1. 환경 변수 확인...")
    settings = get_settings()
    print(f"   COSMOS_ENDPOINT: {settings.cosmos_endpoint[:50]}..." if settings.cosmos_endpoint else "   COSMOS_ENDPOINT: 설정되지 않음")
    # print(f"   COSMOS_KEY: {'*' * 20}..." if settings.cosmos_key else "   COSMOS_KEY: 설정되지 않음")
    print(f"   COSMOS_DATABASE_NAME: {settings.cosmos_database_name}")
    print(f"   COSMOS_CONTAINER_NAME: {settings.cosmos_container_name}")
    
    # CosmosDB 서비스 초기화
    print("\n2. CosmosDB 서비스 초기화...")
    try:
        cosmos = get_cosmos_service()
        if not cosmos.enabled:
            print("   ❌ CosmosDB가 비활성화되어 있습니다.")
            print("   .env 파일에 COSMOS_ENDPOINT와 COSMOS_KEY를 확인하세요.")
            return False
        print("   ✅ CosmosDB 서비스 초기화 성공")
    except Exception as e:
        print(f"   ❌ 초기화 실패: {e}")
        return False
    
    # 데이터베이스 및 컨테이너 확인
    print("\n3. 데이터베이스 및 컨테이너 확인...")
    try:
        if cosmos.database:
            print(f"   ✅ 데이터베이스 '{cosmos.database_name}' 연결됨")
        else:
            print("   ❌ 데이터베이스 연결 실패")
            return False
            
        if cosmos.container:
            print(f"   ✅ 컨테이너 '{cosmos.container_name}' 연결됨")
        else:
            print("   ❌ 컨테이너 연결 실패")
            return False
    except Exception as e:
        print(f"   ❌ 확인 실패: {e}")
        return False
    
    # 테스트 데이터 저장
    print("\n4. 테스트 데이터 저장...")
    test_symbol = "TEST"
    test_data = {
        "profile": {
            "name": "Test Stock",
            "description": "테스트용 주식 데이터"
        },
        "quote": {
            "c": 100.50,
            "h": 102.00,
            "l": 99.00,
            "pc": 101.00
        },
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        result = cosmos.save_stock_data(test_symbol, test_data)
        if result:
            print(f"   ✅ 테스트 데이터 저장 성공 (symbol: {test_symbol})")
        else:
            print("   ❌ 테스트 데이터 저장 실패")
            return False
    except Exception as e:
        print(f"   ❌ 저장 중 오류: {e}")
        return False
    
    # 저장된 데이터 조회
    print("\n5. 저장된 데이터 조회...")
    try:
        latest_data = cosmos.get_latest_data(test_symbol, "stock")
        if latest_data:
            print(f"   ✅ 데이터 조회 성공")
            print(f"   - ID: {latest_data.get('id')}")
            print(f"   - Symbol: {latest_data.get('symbol')}")
            print(f"   - Timestamp: {latest_data.get('timestamp')}")
            print(f"   - 데이터: {latest_data.get('data', {}).get('profile', {}).get('name')}")
        else:
            print("   ⚠️  데이터를 찾을 수 없습니다 (저장은 성공했지만 조회 실패)")
    except Exception as e:
        print(f"   ❌ 조회 중 오류: {e}")
    
    # 모든 ETF 조회
    print("\n6. 저장된 ETF 목록 조회...")
    try:
        etfs = cosmos.get_all_etfs(limit=10)
        print(f"   ✅ {len(etfs)}개의 ETF 데이터 발견")
        if etfs:
            for i, etf in enumerate(etfs[:5], 1):
                print(f"   - ETF {i}: {etf.get('symbol')} ({etf.get('timestamp')})")
    except Exception as e:
        print(f"   ❌ 조회 중 오류: {e}")
    
    print("\n" + "=" * 60)
    print("✅ CosmosDB 연결 테스트 완료!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    try:
        success = test_cosmos_connection()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
