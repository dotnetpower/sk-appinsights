#!/usr/bin/env python3
"""
AI 채팅 테스트 스크립트
"""
import asyncio
import sys

sys.path.insert(0, '/home/moonchoi/dev/sk-appinsights')

from src.agent.agent_service import get_agent_service


async def test_chat():
    """채팅 테스트"""
    print("=" * 60)
    print("AI 채팅 테스트 시작")
    print("=" * 60)
    
    try:
        print("\n1. Agent Service 초기화...")
        agent = get_agent_service()
        print("   ✅ Agent Service 초기화 성공")
        
        print("\n2. 일반 채팅 테스트: '안녕하세요'")
        response = await agent.chat("안녕하세요")
        print(f"   응답: {response}")
        
        print("\n3. 스트리밍 채팅 테스트: 'AAPL 주식 가격 알려줘'")
        print("   응답: ", end="", flush=True)
        async for chunk in agent.chat_stream("AAPL 주식 가격 알려줘"):
            print(chunk, end="", flush=True)
        print()  # 줄바꿈
        
        print("\n" + "=" * 60)
        print("✅ AI 채팅 테스트 완료!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_chat())
