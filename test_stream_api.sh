#!/bin/bash
# 스트리밍 채팅 API 테스트

echo "=== 스트리밍 채팅 API 테스트 ==="
echo ""
echo "메시지: AAPL 주식 가격 알려줘"
echo "응답:"
echo ""

curl -N -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"AAPL 주식 가격 알려줘"}' \
  2>/dev/null

echo ""
echo ""
echo "=== 테스트 완료 ==="
