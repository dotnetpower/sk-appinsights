#!/bin/bash

# GitHub Actions Secrets 설정 도우미 스크립트
# GitHub CLI (gh) 필요: https://cli.github.com/

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GitHub Actions Secrets 설정${NC}"
echo -e "${BLUE}========================================${NC}"

# GitHub CLI 확인
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh)가 설치되어 있지 않습니다.${NC}"
    echo -e "${YELLOW}💡 설치 방법: https://cli.github.com/${NC}"
    exit 1
fi

# GitHub 인증 확인
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub에 로그인이 필요합니다.${NC}"
    gh auth login
fi

# .env 파일 확인
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 파일이 없습니다.${NC}"
    exit 1
fi

echo -e "\n${BLUE}📥 .env 파일에서 환경변수 로드 중...${NC}"
export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)

# Repository 이름 확인
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${GREEN}✅ Repository: $REPO${NC}"

echo -e "\n${YELLOW}[1/9]${NC} Azure Service Principal 생성..."
read -p "Azure 구독 ID를 입력하세요: " SUBSCRIPTION_ID

if [ -z "$SUBSCRIPTION_ID" ]; then
    echo -e "${RED}❌ 구독 ID가 필요합니다.${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Service Principal 생성 중...${NC}"
AZURE_CREDS=$(az ad sp create-for-rbac \
  --name "github-actions-etf-agent-$(date +%s)" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth)

echo -e "${GREEN}✅ Service Principal 생성됨${NC}"

# GitHub Secrets 설정
echo -e "\n${YELLOW}[2/9]${NC} AZURE_CREDENTIALS Secret 설정..."
echo "$AZURE_CREDS" | gh secret set AZURE_CREDENTIALS

echo -e "\n${YELLOW}[3/9]${NC} APPLICATIONINSIGHTS_CONNECTION_STRING Secret 설정..."
if [ -n "$APPLICATIONINSIGHTS_CONNECTION_STRING" ]; then
    echo "$APPLICATIONINSIGHTS_CONNECTION_STRING" | gh secret set APPLICATIONINSIGHTS_CONNECTION_STRING
    echo -e "${GREEN}✅ 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠️  .env에 값이 없습니다. 수동 설정 필요${NC}"
fi

echo -e "\n${YELLOW}[4/9]${NC} COSMOS_ENDPOINT Secret 설정..."
if [ -n "$COSMOS_ENDPOINT" ]; then
    echo "$COSMOS_ENDPOINT" | gh secret set COSMOS_ENDPOINT
    echo -e "${GREEN}✅ 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠️  .env에 값이 없습니다. 수동 설정 필요${NC}"
fi

echo -e "\n${YELLOW}[5/9]${NC} COSMOS_KEY Secret 설정..."
if [ -n "$COSMOS_KEY" ]; then
    echo "$COSMOS_KEY" | gh secret set COSMOS_KEY
    echo -e "${GREEN}✅ 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠️  .env에 값이 없습니다. 수동 설정 필요${NC}"
fi

echo -e "\n${YELLOW}[6/9]${NC} COSMOS_DATABASE_NAME Secret 설정..."
echo "${COSMOS_DATABASE_NAME:-etf-agent}" | gh secret set COSMOS_DATABASE_NAME
echo -e "${GREEN}✅ 설정 완료${NC}"

echo -e "\n${YELLOW}[7/9]${NC} COSMOS_CONTAINER_NAME Secret 설정..."
echo "${COSMOS_CONTAINER_NAME:-etf-data}" | gh secret set COSMOS_CONTAINER_NAME
echo -e "${GREEN}✅ 설정 완료${NC}"

echo -e "\n${YELLOW}[8/9]${NC} OPENAI_API_KEY Secret 설정..."
if [ -n "$OPENAI_API_KEY" ]; then
    echo "$OPENAI_API_KEY" | gh secret set OPENAI_API_KEY
    echo -e "${GREEN}✅ 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠️  .env에 값이 없습니다. 수동 설정 필요${NC}"
fi

echo -e "\n${YELLOW}[9/9]${NC} 외부 API Keys Secret 설정..."
if [ -n "$ALPHA_VANTAGE_API_KEY" ]; then
    echo "$ALPHA_VANTAGE_API_KEY" | gh secret set ALPHA_VANTAGE_API_KEY
    echo -e "${GREEN}✅ ALPHA_VANTAGE_API_KEY 설정 완료${NC}"
fi

if [ -n "$FINNHUB_API_KEY" ]; then
    echo "$FINNHUB_API_KEY" | gh secret set FINNHUB_API_KEY
    echo -e "${GREEN}✅ FINNHUB_API_KEY 설정 완료${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 GitHub Secrets 설정 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}📍 확인: https://github.com/$REPO/settings/secrets/actions${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}💡 다음 단계:${NC}"
echo -e "1. 워크플로우 파일 커밋 및 푸시"
echo -e "   ${BLUE}git add .github/workflows/${NC}"
echo -e "   ${BLUE}git commit -m \"ci: Add GitHub Actions workflows\"${NC}"
echo -e "   ${BLUE}git push origin main${NC}"
echo -e ""
echo -e "2. GitHub Actions 실행 확인"
echo -e "   ${BLUE}https://github.com/$REPO/actions${NC}"
