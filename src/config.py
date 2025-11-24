"""
애플리케이션 설정 관리
"""
import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # Deployment
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # Application Insights
    applicationinsights_connection_string: str = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "")
    
    # Azure Cosmos DB
    cosmos_endpoint: str = os.getenv("COSMOS_ENDPOINT", "")
    cosmos_key: str = os.getenv("COSMOS_KEY", "")
    cosmos_database_name: str = os.getenv("COSMOS_DATABASE_NAME", "etf-agent")
    cosmos_container_name: str = os.getenv("COSMOS_CONTAINER_NAME", "etf-data")
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_org_id: str = os.getenv("OPENAI_ORG_ID", "")
    
    # Azure OpenAI (Optional)
    azure_openai_endpoint: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    azure_openai_api_key: str = os.getenv("AZURE_OPENAI_API_KEY", "")
    azure_openai_deployment_name: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
    azure_openai_api_version: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
    
    # External APIs
    alpha_vantage_key: str = os.getenv("ALPHA_VANTAGE_KEY", "")
    
    # FastAPI
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # 추가 필드 무시


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤 반환"""
    # .env 파일 로드
    load_dotenv()
    return Settings()
