#!/bin/bash
set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Container App Secrets 설정 스크립트${NC}"
echo -e "${GREEN}========================================${NC}"

# .env 파일에서 변수 로드
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 파일을 찾을 수 없습니다.${NC}"
    exit 1
fi

source .env

# 필수 변수 확인
RESOURCE_GROUP="${RESOURCE_GROUP:rg-sk-appinsights}"
CONTAINER_APP_NAME="${CONTAINER_APP_NAME:etf-agent-app}"

echo -e "${YELLOW}📋 현재 설정:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Container App: $CONTAINER_APP_NAME"
echo ""

# Container App 존재 확인
echo -e "${YELLOW}1️⃣  Container App 확인 중...${NC}"
APP_EXISTS=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "name" -o tsv 2>/dev/null || echo "")

if [ -z "$APP_EXISTS" ]; then
    echo -e "${RED}❌ Container App을 찾을 수 없습니다: $CONTAINER_APP_NAME${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Container App 확인 완료${NC}"

# 2. Secrets 추가
echo ""
echo -e "${YELLOW}2️⃣  Secrets 설정 중...${NC}"

# Application Insights
if [ -n "$APPLICATIONINSIGHTS_CONNECTION_STRING" ]; then
    echo -e "${YELLOW}   - APPLICATIONINSIGHTS_CONNECTION_STRING${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets applicationinsights-connection-string="$APPLICATIONINSIGHTS_CONNECTION_STRING" \
        --output none
    echo -e "${GREEN}   ✅ Application Insights 설정 완료${NC}"
fi

# Cosmos DB
if [ -n "$COSMOS_ENDPOINT" ]; then
    echo -e "${YELLOW}   - COSMOS_ENDPOINT${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets cosmos-endpoint="$COSMOS_ENDPOINT" \
        --output none
    echo -e "${GREEN}   ✅ Cosmos Endpoint 설정 완료${NC}"
fi

if [ -n "$COSMOS_DATABASE_NAME" ]; then
    echo -e "${YELLOW}   - COSMOS_DATABASE_NAME${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets cosmos-database-name="$COSMOS_DATABASE_NAME" \
        --output none
    echo -e "${GREEN}   ✅ Cosmos Database Name 설정 완료${NC}"
fi

if [ -n "$COSMOS_CONTAINER_NAME" ]; then
    echo -e "${YELLOW}   - COSMOS_CONTAINER_NAME${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets cosmos-container-name="$COSMOS_CONTAINER_NAME" \
        --output none
    echo -e "${GREEN}   ✅ Cosmos Container Name 설정 완료${NC}"
fi

# OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}   - OPENAI_API_KEY${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets openai-api-key="$OPENAI_API_KEY" \
        --output none
    echo -e "${GREEN}   ✅ OpenAI API Key 설정 완료${NC}"
fi

if [ -n "$OPENAI_ORG_ID" ]; then
    echo -e "${YELLOW}   - OPENAI_ORG_ID${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets openai-org-id="$OPENAI_ORG_ID" \
        --output none
    echo -e "${GREEN}   ✅ OpenAI Org ID 설정 완료${NC}"
fi

# Azure OpenAI
if [ -n "$AZURE_OPENAI_ENDPOINT" ]; then
    echo -e "${YELLOW}   - AZURE_OPENAI_ENDPOINT${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets azure-openai-endpoint="$AZURE_OPENAI_ENDPOINT" \
        --output none
    echo -e "${GREEN}   ✅ Azure OpenAI Endpoint 설정 완료${NC}"
fi

if [ -n "$AZURE_OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}   - AZURE_OPENAI_API_KEY${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets azure-openai-api-key="$AZURE_OPENAI_API_KEY" \
        --output none
    echo -e "${GREEN}   ✅ Azure OpenAI API Key 설정 완료${NC}"
fi

if [ -n "$AZURE_OPENAI_DEPLOYMENT_NAME" ]; then
    echo -e "${YELLOW}   - AZURE_OPENAI_DEPLOYMENT_NAME${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets azure-openai-deployment-name="$AZURE_OPENAI_DEPLOYMENT_NAME" \
        --output none
    echo -e "${GREEN}   ✅ Azure OpenAI Deployment Name 설정 완료${NC}"
fi

if [ -n "$AZURE_OPENAI_API_VERSION" ]; then
    echo -e "${YELLOW}   - AZURE_OPENAI_API_VERSION${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets azure-openai-api-version="$AZURE_OPENAI_API_VERSION" \
        --output none
    echo -e "${GREEN}   ✅ Azure OpenAI API Version 설정 완료${NC}"
fi

# Alpha Vantage
if [ -n "$ALPHA_VANTAGE_KEY" ]; then
    echo -e "${YELLOW}   - ALPHA_VANTAGE_KEY${NC}"
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets alpha-vantage-key="$ALPHA_VANTAGE_KEY" \
        --output none
    echo -e "${GREEN}   ✅ Alpha Vantage Key 설정 완료${NC}"
fi

# 3. 환경변수를 Secrets으로 연결
echo ""
echo -e "${YELLOW}3️⃣  환경변수를 Secrets으로 연결 중...${NC}"

az containerapp update \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars \
        "APPLICATIONINSIGHTS_CONNECTION_STRING=secretref:applicationinsights-connection-string" \
        "COSMOS_ENDPOINT=secretref:cosmos-endpoint" \
        "COSMOS_DATABASE_NAME=secretref:cosmos-database-name" \
        "COSMOS_CONTAINER_NAME=secretref:cosmos-container-name" \
        "AZURE_OPENAI_ENDPOINT=secretref:azure-openai-endpoint" \
        "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key" \
        "AZURE_OPENAI_DEPLOYMENT_NAME=secretref:azure-openai-deployment-name" \
        "AZURE_OPENAI_API_VERSION=secretref:azure-openai-api-version" \
        "ALPHA_VANTAGE_KEY=secretref:alpha-vantage-key" \
    --output none

echo -e "${GREEN}✅ 환경변수 연결 완료${NC}"

# OpenAI Secrets 조건부 추가 (값이 있는 경우만)
if [ -n "$OPENAI_API_KEY" ]; then
    az containerapp update \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --set-env-vars "OPENAI_API_KEY=secretref:openai-api-key" \
        --output none
    echo -e "${GREEN}✅ OpenAI API Key 환경변수 연결 완료${NC}"
fi

if [ -n "$OPENAI_ORG_ID" ]; then
    az containerapp update \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --set-env-vars "OPENAI_ORG_ID=secretref:openai-org-id" \
        --output none
    echo -e "${GREEN}✅ OpenAI Org ID 환경변수 연결 완료${NC}"
fi

# 4. 설정 확인
echo ""
echo -e "${YELLOW}4️⃣  설정 확인 중...${NC}"

SECRET_COUNT=$(az containerapp secret list \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "length(@)" -o tsv)

echo -e "${GREEN}✅ 총 $SECRET_COUNT 개의 Secrets 설정 완료${NC}"

# Secrets 목록 출력 (값은 숨김)
echo -e "${YELLOW}📋 설정된 Secrets:${NC}"
az containerapp secret list \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "[].name" -o tsv | while read secret; do
    echo "   - $secret"
done

# 5. Container App 재시작
echo ""
read -p "Container App을 재시작하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔄 Container App 재시작 중...${NC}"
    az containerapp revision restart \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --output none
    echo -e "${GREEN}✅ 재시작 완료${NC}"
fi

# 최종 안내
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Secrets 설정 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📋 다음 단계:${NC}"
echo "  1. 로그 확인: az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --tail 50 --follow"
echo "  2. 애플리케이션 테스트"
echo ""
echo -e "${YELLOW}💡 참고:${NC}"
echo "  - Secrets 변경 후 자동으로 새 revision이 생성됩니다."
echo "  - 환경변수는 'secretref:' 형식으로 Secrets를 참조합니다."
echo "  - Secrets 값을 확인하려면: az containerapp secret show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --secret-name <secret-name>"
echo ""
