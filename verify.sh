#!/bin/bash
# ETF Agent 시스템 검증 스크립트

echo "================================"
echo "ETF Agent 시스템 검증"
echo "================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 가상환경 확인
echo -n "1. Python 가상환경 확인... "
if [ -d ".venv" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ .venv 디렉토리가 없습니다${NC}"
    exit 1
fi

# 가상환경 활성화
source .venv/bin/activate

# Python 버전 확인
echo -n "2. Python 버전 확인... "
PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
if [[ $PYTHON_VERSION == 3.13* ]]; then
    echo -e "${GREEN}✓ Python $PYTHON_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ Python $PYTHON_VERSION (권장: 3.13+)${NC}"
fi

# 패키지 설치 확인
echo -n "3. Python 패키지 확인... "
if python -c "import fastapi, uvicorn, semantic_kernel, finnhub, azure.cosmos" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ 필수 패키지가 설치되지 않았습니다${NC}"
    echo "   실행: uv sync --prerelease=allow"
    exit 1
fi

# Backend import 테스트
echo -n "4. Backend 코드 검증... "
if python -c "from src.main import app" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Backend import 실패${NC}"
    exit 1
fi

# 환경변수 파일 확인
echo -n "5. 환경변수 파일 확인... "
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC}"
    
    # 필수 환경변수 확인
    echo "   필수 환경변수 상태:"
    
    if grep -q "^FINNHUB_API_KEY=.\+" .env; then
        echo -e "   - FINNHUB_API_KEY: ${GREEN}설정됨${NC}"
    else
        echo -e "   - FINNHUB_API_KEY: ${YELLOW}미설정${NC}"
    fi
    
    if grep -q "^COSMOS_ENDPOINT=.\+" .env; then
        echo -e "   - COSMOS_ENDPOINT: ${GREEN}설정됨${NC}"
    else
        echo -e "   - COSMOS_ENDPOINT: ${YELLOW}미설정${NC}"
    fi
    
    if grep -q "^OPENAI_API_KEY=.\+" .env; then
        echo -e "   - OPENAI_API_KEY: ${GREEN}설정됨${NC}"
    else
        echo -e "   - OPENAI_API_KEY: ${YELLOW}미설정${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env 파일이 없습니다${NC}"
    echo "   .env.example을 복사하여 .env 파일을 생성하세요"
fi

# Frontend 확인
echo -n "6. Frontend 디렉토리 확인... "
if [ -d "frontend" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ frontend 디렉토리가 없습니다${NC}"
    exit 1
fi

# Node modules 확인
echo -n "7. Frontend 패키지 확인... "
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ node_modules가 없습니다${NC}"
    echo "   실행: cd frontend && npm install"
fi

# Frontend 컴포넌트 확인
echo -n "8. Frontend 컴포넌트 확인... "
COMPONENTS=("Dashboard.tsx" "ETFList.tsx" "StockDetail.tsx" "NewsFeed.tsx" "ChatInterface.tsx")
ALL_EXIST=true
for comp in "${COMPONENTS[@]}"; do
    if [ ! -f "frontend/src/components/$comp" ]; then
        ALL_EXIST=false
        break
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ 일부 컴포넌트가 없습니다${NC}"
    exit 1
fi

echo ""
echo "================================"
echo -e "${GREEN}시스템 검증 완료!${NC}"
echo "================================"
echo ""
echo "다음 단계:"
echo "1. .env 파일에 API 키를 설정하세요"
echo "2. Backend 실행: uvicorn src.main:app --reload"
echo "3. Frontend 실행: cd frontend && npm start"
echo ""
echo "자세한 내용은 GUIDE.md를 참고하세요"
