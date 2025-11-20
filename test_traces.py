"""
traces 테이블 로그 전송 테스트

Application Insights의 traces 테이블에 로그가 올바르게 전송되는지 테스트합니다.
"""
import logging
import os
import time
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# Azure Monitor OpenTelemetry 설정 (로깅 핸들러 자동 설정)
from azure.monitor.opentelemetry import configure_azure_monitor

connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
if not connection_string:
    raise ValueError("APPLICATIONINSIGHTS_CONNECTION_STRING not set")

print(f"✅ Connection string loaded: {connection_string[:50]}...")

# Azure Monitor 설정 (로깅 설정 전에 호출)
configure_azure_monitor(
    connection_string=connection_string,
    enable_live_metrics=True,
)

# 로깅 설정 (configure_azure_monitor 이후)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    force=True
)

# 테스트 로거
logger = logging.getLogger("test_traces")
logger.setLevel(logging.INFO)

print("\n" + "="*80)
print("📊 traces 테이블 로그 전송 테스트")
print("="*80)

# 다양한 레벨의 로그 전송
print("\n1. INFO 레벨 로그 전송...")
logger.info("✅ INFO: 일반 정보 로그 - traces 테이블에 기록됩니다")
time.sleep(0.5)

print("2. WARNING 레벨 로그 전송...")
logger.warning("⚠️  WARNING: 경고 로그 - traces 테이블에 기록됩니다")
time.sleep(0.5)

print("3. ERROR 레벨 로그 전송...")
logger.error("❌ ERROR: 에러 로그 - traces 테이블에 기록됩니다")
time.sleep(0.5)

print("4. 구조화된 로그 전송 (extra 필드 사용)...")
logger.info(
    "📈 구조화된 로그 - customDimensions에 추가 필드 포함",
    extra={
        "custom_dimensions": {
            "user_id": "test_user_123",
            "operation": "test_operation",
            "status": "success",
            "count": 42
        }
    }
)
time.sleep(0.5)

print("5. 다수의 로그 메시지 전송...")
for i in range(5):
    logger.info(f"🔢 반복 테스트 로그 #{i+1}")
    time.sleep(0.3)

print("\n" + "="*80)
print("✅ 모든 테스트 로그 전송 완료")
print("="*80)
print("\n📊 Application Insights에서 확인:")
print("   1. Azure Portal > Application Insights > Logs")
print("   2. 다음 KQL 쿼리 실행:")
print("\n" + "-"*80)
print("traces")
print("| where timestamp > ago(5m)")
print("| where message contains 'traces 테이블'")
print("| order by timestamp desc")
print("-"*80)
print("\n⏱️  로그가 표시되기까지 1-2분 정도 소요될 수 있습니다.")
print("🔄 Live Metrics에서는 실시간으로 확인 가능합니다.\n")
