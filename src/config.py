"""
애플리케이션 설정 관리
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # Application Insights
    applicationinsights_connection_string: str = ""
    
    # Finnhub API
    finnhub_api_key: str = ""
    
    # Azure Cosmos DB
    cosmos_endpoint: str = ""
    cosmos_key: str = ""
    cosmos_database_name: str = "etf-agent"
    cosmos_container_name: str = "etf-data"
    
    # OpenAI
    openai_api_key: str = ""
    openai_org_id: str = ""
    
    # Azure OpenAI (Optional)
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment_name: str = ""
    
    # FastAPI
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤 반환"""
    return Settings()
