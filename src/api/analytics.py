"""
사용자 행동 분석 API
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..observability.telemetry import track_page_view, track_user_event

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class PageViewEvent(BaseModel):
    """페이지 뷰 이벤트"""
    page_name: str
    duration_ms: Optional[int] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Optional[dict] = None


class UserEvent(BaseModel):
    """사용자 이벤트"""
    event_name: str
    event_category: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    properties: Optional[dict] = None


@router.post("/page-view")
async def log_page_view(event: PageViewEvent):
    """
    페이지 뷰 이벤트 기록
    
    - page_name: 페이지 이름 (예: 'Dashboard', 'ETF List')
    - duration_ms: 페이지 체류 시간 (밀리초)
    - user_id: 사용자 ID (코호트 분석용)
    - session_id: 세션 ID
    - metadata: 추가 메타데이터
    """
    try:
        properties = {
            "page_name": event.page_name,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if event.duration_ms is not None:
            properties["duration_ms"] = str(event.duration_ms)
            properties["duration_seconds"] = str(event.duration_ms / 1000)
        
        if event.user_id:
            properties["user_id"] = event.user_id
        
        if event.session_id:
            properties["session_id"] = event.session_id
        
        if event.metadata:
            # metadata의 모든 값을 문자열로 변환
            properties.update({k: str(v) for k, v in event.metadata.items()})
        
        # pageViews 테이블에 저장
        track_page_view(
            name=event.page_name,
            url=f"/{event.page_name.lower().replace(' ', '-')}",
            properties=properties,
            duration_ms=event.duration_ms
        )
        
        return {
            "status": "success",
            "message": "Page view tracked successfully",
            "page_name": event.page_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/event")
async def log_user_event(event: UserEvent):
    """
    사용자 이벤트 기록
    
    - event_name: 이벤트 이름 (예: 'button_click', 'search', 'filter_applied')
    - event_category: 이벤트 카테고리 (예: 'navigation', 'interaction', 'search')
    - user_id: 사용자 ID (코호트 분석용)
    - session_id: 세션 ID
    - properties: 이벤트 속성
    """
    try:
        properties = {
            "event_category": event.event_category,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if event.user_id:
            properties["user_id"] = event.user_id
        
        if event.session_id:
            properties["session_id"] = event.session_id
        
        if event.properties:
            properties.update(event.properties)
        
        # customEvents 테이블에 저장
        track_user_event(
            name=event.event_name,
            properties=properties
        )
        
        return {
            "status": "success",
            "message": "Event tracked successfully",
            "event_name": event.event_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
