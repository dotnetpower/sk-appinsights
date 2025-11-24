"""
Application Insights API Router
KQL 쿼리 실행 및 인사이트 조회
"""
import logging
from typing import Any, Dict, List

from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient, LogsQueryStatus
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/insights", tags=["insights"])

settings = get_settings()


class KQLQueryRequest(BaseModel):
    """KQL 쿼리 요청"""
    query: str


class KQLQueryResponse(BaseModel):
    """KQL 쿼리 응답"""
    columns: List[str]
    rows: List[List[Any]]


def get_logs_client() -> LogsQueryClient:
    """
    Azure Monitor Logs 쿼리 클라이언트 생성
    """
    # Azure 인증 (환경에 따라 다름)
    # 1. Managed Identity (프로덕션)
    # 2. Azure CLI 인증 (개발)
    # 3. 환경 변수 (로컬)
    try:
        credential = DefaultAzureCredential()
        return LogsQueryClient(credential)
    except Exception as e:
        logger.error(f"Azure 인증 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail="Azure 인증에 실패했습니다. Azure CLI로 로그인하거나 Managed Identity를 설정하세요."
        )


def get_workspace_id() -> str:
    """
    Application Insights 워크스페이스 ID 추출
    연결 문자열에서 파싱
    """
    connection_string = settings.applicationinsights_connection_string
    if not connection_string:
        raise HTTPException(
            status_code=500,
            detail="APPLICATIONINSIGHTS_CONNECTION_STRING이 설정되지 않았습니다."
        )
    
    # 연결 문자열 파싱: InstrumentationKey=xxx;IngestionEndpoint=xxx;LiveEndpoint=xxx
    parts = dict(part.split("=", 1) for part in connection_string.split(";") if "=" in part)
    
    # 워크스페이스 ID는 환경 변수에서 별도로 가져와야 함
    # Application Insights 리소스의 Workspace ID
    import os
    workspace_id = os.getenv("APPLICATIONINSIGHTS_WORKSPACE_ID")
    
    if not workspace_id:
        raise HTTPException(
            status_code=500,
            detail="APPLICATIONINSIGHTS_WORKSPACE_ID 환경 변수를 설정하세요."
        )
    
    return workspace_id


@router.post("/query", response_model=KQLQueryResponse)
async def execute_kql_query(request: KQLQueryRequest) -> KQLQueryResponse:
    """
    KQL 쿼리 실행
    
    Application Insights 로그 데이터에 대해 KQL 쿼리를 실행합니다.
    
    - **query**: KQL 쿼리 문자열
    
    예시:
    ```kql
    requests
    | where timestamp > ago(1h)
    | summarize count()
    ```
    """
    try:
        # 쿼리 검증
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="쿼리가 비어있습니다.")
        
        # 위험한 쿼리 방지 (기본적인 검증)
        dangerous_keywords = ["drop", "delete", "truncate", "create", "alter"]
        query_lower = request.query.lower()
        if any(keyword in query_lower for keyword in dangerous_keywords):
            raise HTTPException(
                status_code=400,
                detail=f"보안상 허용되지 않는 키워드가 포함되어 있습니다: {dangerous_keywords}"
            )
        
        logger.info(f"KQL 쿼리 실행 시작: {request.query[:100]}...")
        
        # Azure Monitor Logs 클라이언트 생성
        client = get_logs_client()
        workspace_id = get_workspace_id()
        
        # 쿼리 실행
        response = client.query_workspace(
            workspace_id=workspace_id,
            query=request.query,
            timespan=None,  # 쿼리에서 시간 범위 지정
        )
        
        # 결과 처리 - Azure Monitor Query SDK v2.0 호환
        # response는 LogsQueryResult 또는 LogsQueryPartialResult
        if hasattr(response, 'status'):
            if response.status == LogsQueryStatus.PARTIAL:
                logger.warning(f"쿼리가 부분적으로만 성공했습니다: {getattr(response, 'partial_error', 'Unknown error')}")
                # 부분 결과도 반환
            elif response.status == LogsQueryStatus.FAILURE:
                error_msg = getattr(response, 'partial_error', 'Unknown error')
                logger.error(f"쿼리 실패: {error_msg}")
                raise HTTPException(
                    status_code=400,
                    detail=f"쿼리 실행 실패: {error_msg}"
                )
        
        # 테이블 데이터 추출
        tables = getattr(response, 'tables', [])
        if not tables:
            return KQLQueryResponse(columns=[], rows=[])
        
        # 첫 번째 테이블 결과 반환
        table = tables[0]
        columns = [col for col in table.columns]  # 컬럼 이름 리스트
        rows = [list(row) for row in table.rows]
        
        logger.info(f"KQL 쿼리 성공: {len(rows)}개 행 반환")
        
        return KQLQueryResponse(columns=columns, rows=rows)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"KQL 쿼리 실행 오류: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"쿼리 실행 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/health")
async def insights_health():
    """
    Insights API 헬스체크
    """
    try:
        workspace_id = get_workspace_id()
        return {
            "status": "healthy",
            "workspace_configured": bool(workspace_id),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }
