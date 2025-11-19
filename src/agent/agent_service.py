"""  
Semantic Kernel 에이전트 서비스
"""
from typing import AsyncGenerator, Optional

from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.function_choice_behavior import \
    FunctionChoiceBehavior
from semantic_kernel.connectors.ai.open_ai import (AzureChatCompletion,
                                                   OpenAIChatCompletion)
from semantic_kernel.contents import ChatHistory, StreamingChatMessageContent

from src.observability.utils import trace_span

from ..config import get_settings
from .stock_plugin import StockAnalysisPlugin


class AgentService:
    """AI 에이전트 서비스"""
    
    def __init__(self):
        self.settings = get_settings()
        self.kernel = Kernel()
        self.chat_history = ChatHistory()
        self._initialize_kernel()
    
    def _initialize_kernel(self):
        """커널 초기화"""
        service_id = "chat-gpt"
        
        # Azure OpenAI 우선 사용, 없으면 OpenAI 사용
        if self.settings.azure_openai_endpoint and self.settings.azure_openai_api_key:
            self.kernel.add_service(
                AzureChatCompletion(
                    service_id=service_id,
                    deployment_name=self.settings.azure_openai_deployment_name,
                    endpoint=self.settings.azure_openai_endpoint,
                    api_key=self.settings.azure_openai_api_key,
                    api_version=self.settings.azure_openai_api_version
                )
            )
            print(f"Using Azure OpenAI: {self.settings.azure_openai_deployment_name}")
        elif self.settings.openai_api_key:
            self.kernel.add_service(
                OpenAIChatCompletion(
                    service_id=service_id,
                    api_key=self.settings.openai_api_key,
                    ai_model_id="gpt-4"
                )
            )
            print("Using OpenAI")
        else:
            raise ValueError(
                "No AI service configured. Please set either "
                "AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_API_KEY or OPENAI_API_KEY"
            )
        
        # 주식 분석 플러그인 추가
        self.kernel.add_plugin(
            StockAnalysisPlugin(),
            plugin_name="StockAnalysis"
        )
        
        # 시스템 메시지 추가
        self.chat_history.add_system_message(
            "당신은 ETF와 주식 데이터를 분석하는 전문 금융 AI 에이전트입니다. "
            "사용자의 질문에 정확하고 유용한 정보를 제공하세요. "
            "필요한 경우 제공된 함수를 호출하여 실시간 데이터를 조회할 수 있습니다."
        )
    
    @trace_span()
    async def chat(self, user_message: str) -> str:
        """사용자 메시지 처리"""
        # 사용자 메시지 추가
        self.chat_history.add_user_message(user_message)
        
        # 함수 호출 설정
        execution_settings = self.kernel.get_prompt_execution_settings_from_service_id(
            service_id="chat-gpt"
        )
        execution_settings.function_choice_behavior = FunctionChoiceBehavior.Auto()
        
        # 채팅 완성 서비스 가져오기
        chat_completion = self.kernel.get_service(service_id="chat-gpt")
        
        # 응답 생성
        response = await chat_completion.get_chat_message_content(
            chat_history=self.chat_history,
            settings=execution_settings,
            kernel=self.kernel
        )
        
        # 응답을 히스토리에 추가
        self.chat_history.add_assistant_message(str(response))
        
        return str(response)
    
    @trace_span()
    async def chat_stream(self, user_message: str) -> AsyncGenerator[str, None]:
        """사용자 메시지 처리 (스트리밍)"""
        # 사용자 메시지 추가
        self.chat_history.add_user_message(user_message)
        
        # 함수 호출 설정
        execution_settings = self.kernel.get_prompt_execution_settings_from_service_id(
            service_id="chat-gpt"
        )
        execution_settings.function_choice_behavior = FunctionChoiceBehavior.Auto()
        
        # 채팅 완성 서비스 가져오기
        chat_completion = self.kernel.get_service(service_id="chat-gpt")
        
        # 스트리밍 응답 생성
        full_response = ""
        async for chunk in chat_completion.get_streaming_chat_message_content(
            chat_history=self.chat_history,
            settings=execution_settings,
            kernel=self.kernel
        ):
            if chunk:
                content = str(chunk)
                full_response += content
                yield content
        
        # 전체 응답을 히스토리에 추가
        self.chat_history.add_assistant_message(full_response)
    
    def reset_conversation(self):
        """대화 히스토리 리셋"""
        self.chat_history = ChatHistory()
        self.chat_history.add_system_message(
            "당신은 ETF와 주식 데이터를 분석하는 전문 금융 AI 에이전트입니다."
        )


# 싱글톤 인스턴스
_agent_service: Optional[AgentService] = None


def get_agent_service() -> AgentService:
    """에이전트 서비스 싱글톤"""
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
