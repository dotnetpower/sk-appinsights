#!/usr/bin/env python3
"""WebSocket 클라이언트 테스트"""
import asyncio
import json

import websockets


async def test_websocket():
    uri = "ws://localhost:8000/api/live-metrics/ws/traffic"
    print(f"🔌 연결 시도: {uri}")
    
    async with websockets.connect(uri) as websocket:
        print("✅ WebSocket 연결됨!")
        
        # 10초 동안 메시지 수신
        try:
            for i in range(20):  # 최대 20개 메시지
                message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                data = json.loads(message)
                print(f"📨 [{i+1}] {data['type']}: {json.dumps(data.get('data', {}), indent=2)}")
        except asyncio.TimeoutError:
            print("⏱️ 타임아웃 (2초간 메시지 없음)")
        except Exception as e:
            print(f"❌ 오류: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
