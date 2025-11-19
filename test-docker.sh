#!/bin/bash

# 로컬 Docker 테스트 스크립트

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ETF Agent - 로컬 Docker 테스트${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. .env 파일 확인
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다. .env.example을 복사하세요.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[1/4]${NC} .env 파일 확인 완료"

# 2. Docker 이미지 빌드
echo -e "\n${YELLOW}[2/4]${NC} Docker 이미지 빌드 중..."
docker build -t etf-agent:local .
echo -e "${GREEN}✅ 빌드 완료${NC}"

# 3. 기존 컨테이너 중지 및 제거
echo -e "\n${YELLOW}[3/4]${NC} 기존 컨테이너 정리 중..."
docker stop etf-agent-test 2>/dev/null || true
docker rm etf-agent-test 2>/dev/null || true
echo -e "${GREEN}✅ 정리 완료${NC}"

# 4. 컨테이너 실행
echo -e "\n${YELLOW}[4/4]${NC} 컨테이너 실행 중..."
docker run -d \
  --name etf-agent-test \
  --env-file .env \
  -p 8000:8000 \
  etf-agent:local

echo -e "${GREEN}✅ 컨테이너 실행 완료${NC}"

# 5. Health check 대기
echo -e "\n${BLUE}⏳ Health check 대기 중...${NC}"
sleep 5

for i in {1..10}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo -e "${GREEN}✅ 서버 정상 작동!${NC}"
        break
    fi
    echo -e "${YELLOW}   재시도 중... ($i/10)${NC}"
    sleep 2
done

# 결과 출력
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 로컬 테스트 준비 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}📍 API URL: ${GREEN}http://localhost:8000${NC}"
echo -e "${BLUE}📍 Health: ${GREEN}http://localhost:8000/health${NC}"
echo -e "${BLUE}📍 API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo -e "${BLUE}📍 로그 확인: ${YELLOW}docker logs -f etf-agent-test${NC}"
echo -e "${BLUE}📍 중지: ${YELLOW}docker stop etf-agent-test${NC}"
echo -e "${GREEN}========================================${NC}"
