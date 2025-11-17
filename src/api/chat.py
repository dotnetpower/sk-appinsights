"""
API 라우터 - AI 에이전트 채팅 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from ..agent.agent_service import get_agent_service

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    """채팅 요청"""
    message: str


class ChatResponse(BaseModel):
    """채팅 응답"""
    response: str


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """AI 에이전트와 채팅"""
    try:
        agent = get_agent_service()
        response = await agent.chat(request.message)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/reset")
async def reset_chat() -> Dict[str, str]:
    """대화 히스토리 리셋"""
    try:
        agent = get_agent_service()
        agent.reset_conversation()
        return {"message": "Chat history reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset error: {str(e)}")
