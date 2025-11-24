"""
pytest 공통 설정 및 fixture
"""
import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv

# 프로젝트 루트 경로 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# .env 파일 로드
load_dotenv(project_root / ".env")


@pytest.fixture(scope="session", autouse=True)
def disable_telemetry_in_tests():
    """테스트 실행 시 Application Insights 텔레메트리 비활성화"""
    # OpenTelemetry SDK 비활성화
    os.environ["OTEL_SDK_DISABLED"] = "true"
    # Application Insights 비활성화
    os.environ["APPLICATIONINSIGHTS_ENABLED"] = "false"
    yield
    # 테스트 종료 후 원래 상태로 복원
    os.environ.pop("OTEL_SDK_DISABLED", None)
    os.environ.pop("APPLICATIONINSIGHTS_ENABLED", None)


@pytest.fixture(scope="session")
def project_root_path():
    """프로젝트 루트 경로 반환"""
    return project_root


@pytest.fixture(scope="session")
def env_loaded():
    """환경변수 로드 확인"""
    required_vars = [
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "COSMOS_ENDPOINT",
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        pytest.skip(f"Required environment variables not set: {', '.join(missing_vars)}")
    
    return True


@pytest.fixture
def skip_if_no_appinsights():
    """Application Insights 연결 문자열이 없으면 테스트 스킵"""
    if not os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"):
        pytest.skip("APPLICATIONINSIGHTS_CONNECTION_STRING not set")


@pytest.fixture
def skip_if_no_cosmos():
    """Cosmos DB 설정이 없으면 테스트 스킵"""
    if not os.getenv("COSMOS_ENDPOINT"):
        pytest.skip("COSMOS_ENDPOINT not set")


@pytest.fixture
def skip_if_no_openai():
    """OpenAI API 키가 없으면 테스트 스킵"""
    if not os.getenv("AZURE_OPENAI_ENDPOINT") and not os.getenv("OPENAI_API_KEY"):
        pytest.skip("Neither AZURE_OPENAI_ENDPOINT nor OPENAI_API_KEY is set")
