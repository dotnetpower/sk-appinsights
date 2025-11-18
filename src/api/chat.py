"""
API 라우터 - AI 에이전트 채팅 엔드포인트
"""
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

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
    """AI 에이전트와 채팅 (비스트리밍)"""
    try:
        agent = get_agent_service()
        response = await agent.chat(request.message)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """AI 에이전트와 채팅 (스트리밍)"""
    try:
        agent = get_agent_service()
        
        async def generate():
            async for chunk in agent.chat_stream(request.message):
                yield chunk
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
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
