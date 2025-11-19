#!/bin/bash

# ETF Agent - Azure Container App 배포 스크립트

set -e

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# .env 파일에서 환경변수 로드 (있는 경우)
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
    echo -e "${GREEN}✅ .env 파일에서 환경변수 로드됨${NC}"
fi

# 설정 변수 (.env에서 로드된 값 우선 사용)
RESOURCE_GROUP="${RESOURCE_GROUP:-etf-agent-rg}"
LOCATION="${LOCATION:-koreacentral}"
CONTAINER_APP_NAME="${CONTAINER_APP_NAME:-etf-agent-app}"
CONTAINER_REGISTRY_NAME="${CONTAINER_REGISTRY_NAME}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-etf-agent-env}"
IMAGE_NAME="etf-agent"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ETF Agent - Azure Container App 배포${NC}"
echo -e "${BLUE}========================================${NC}"

# Container Registry 이름 확인
if [ -z "$CONTAINER_REGISTRY_NAME" ]; then
    echo -e "${RED}❌ CONTAINER_REGISTRY_NAME 환경변수가 설정되지 않았습니다.${NC}"
    echo -e "${YELLOW}💡 .env 파일에 CONTAINER_REGISTRY_NAME을 추가하거나${NC}"
    echo -e "${YELLOW}   export CONTAINER_REGISTRY_NAME=your-registry-name 으로 설정하세요${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Container Registry: ${GREEN}$CONTAINER_REGISTRY_NAME${NC}"
echo -e "${BLUE}🌍 Resource Group: ${GREEN}$RESOURCE_GROUP${NC}"
echo -e "${BLUE}📍 Location: ${GREEN}$LOCATION${NC}"
echo -e ""

# 1. Azure CLI 로그인 확인
echo -e "\n${YELLOW}[1/8]${NC} Azure CLI 로그인 확인..."
if ! az account show > /dev/null 2>&1; then
    echo -e "${RED}❌ Azure에 로그인되어 있지 않습니다.${NC}"
    az login
else
    echo -e "${GREEN}✅ Azure 로그인 확인됨${NC}"
fi

# 2. 리소스 그룹 생성
echo -e "\n${YELLOW}[2/8]${NC} 리소스 그룹 생성..."
if az group show --name $RESOURCE_GROUP > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 리소스 그룹 이미 존재: $RESOURCE_GROUP${NC}"
else
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo -e "${GREEN}✅ 리소스 그룹 생성됨: $RESOURCE_GROUP${NC}"
fi

# 3. Container Registry 생성
echo -e "\n${YELLOW}[3/8]${NC} Azure Container Registry 생성..."
if az acr show --name $CONTAINER_REGISTRY_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Container Registry 이미 존재: $CONTAINER_REGISTRY_NAME${NC}"
else
    az acr create \
        --resource-group $RESOURCE_GROUP \
        --name $CONTAINER_REGISTRY_NAME \
        --sku Basic \
        --admin-enabled true
    echo -e "${GREEN}✅ Container Registry 생성됨: $CONTAINER_REGISTRY_NAME${NC}"
fi

# 4. Container Registry 로그인
echo -e "\n${YELLOW}[4/8]${NC} Container Registry 로그인..."
az acr login --name $CONTAINER_REGISTRY_NAME
echo -e "${GREEN}✅ Container Registry 로그인 완료${NC}"

# 5. Docker 이미지 빌드
echo -e "\n${YELLOW}[5/8]${NC} Docker 이미지 빌드..."
FULL_IMAGE_NAME="$CONTAINER_REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG"
docker build -t $FULL_IMAGE_NAME .
echo -e "${GREEN}✅ Docker 이미지 빌드 완료: $FULL_IMAGE_NAME${NC}"

# 6. Docker 이미지 푸시
echo -e "\n${YELLOW}[6/8]${NC} Docker 이미지 푸시..."
docker push $FULL_IMAGE_NAME
echo -e "${GREEN}✅ Docker 이미지 푸시 완료${NC}"

# 7. Container App Environment 생성
echo -e "\n${YELLOW}[7/8]${NC} Container App Environment 생성..."
if az containerapp env show --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Container App Environment 이미 존재: $ENVIRONMENT_NAME${NC}"
else
    az containerapp env create \
        --name $ENVIRONMENT_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION
    echo -e "${GREEN}✅ Container App Environment 생성됨: $ENVIRONMENT_NAME${NC}"
fi

# 8. Container App 생성/업데이트
echo -e "\n${YELLOW}[8/8]${NC} Container App 배포..."

# .env 파일에서 환경 변수 읽기
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 파일이 없습니다. .env.example을 참고하여 생성하세요.${NC}"
    exit 1
fi

# ACR 자격증명 가져오기
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY_NAME --query passwords[0].value -o tsv)

if az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    echo -e "${BLUE}📦 기존 Container App 업데이트 중...${NC}"
    az containerapp update \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --image $FULL_IMAGE_NAME
else
    echo -e "${BLUE}📦 새 Container App 생성 중...${NC}"
    az containerapp create \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --environment $ENVIRONMENT_NAME \
        --image $FULL_IMAGE_NAME \
        --registry-server "$CONTAINER_REGISTRY_NAME.azurecr.io" \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --target-port 8000 \
        --ingress external \
        --min-replicas 1 \
        --max-replicas 3 \
        --cpu 0.5 \
        --memory 1Gi \
        --env-vars \
            "APPLICATIONINSIGHTS_CONNECTION_STRING=secretref:appinsights-connection-string" \
            "COSMOS_ENDPOINT=secretref:cosmos-endpoint" \
            "COSMOS_KEY=secretref:cosmos-key" \
            "COSMOS_DATABASE_NAME=secretref:cosmos-database-name" \
            "COSMOS_CONTAINER_NAME=secretref:cosmos-container-name" \
            "OPENAI_API_KEY=secretref:openai-api-key" \
            "OPENAI_MODEL=gpt-4" \
            "ALPHA_VANTAGE_API_KEY=secretref:alphavantage-api-key" \
            "FINNHUB_API_KEY=secretref:finnhub-api-key" \
            "LOG_LEVEL=INFO"
    
    echo -e "\n${YELLOW}⚠️  환경 변수 시크릿 설정이 필요합니다:${NC}"
    echo -e "${BLUE}다음 명령어로 시크릿을 설정하세요:${NC}"
    echo ""
    echo "az containerapp secret set --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP \\"
    echo "  --secrets \\"
    echo "    appinsights-connection-string=<YOUR_CONNECTION_STRING> \\"
    echo "    cosmos-endpoint=<YOUR_COSMOS_ENDPOINT> \\"
    echo "    cosmos-key=<YOUR_COSMOS_KEY> \\"
    echo "    cosmos-database-name=<YOUR_DATABASE_NAME> \\"
    echo "    cosmos-container-name=<YOUR_CONTAINER_NAME> \\"
    echo "    openai-api-key=<YOUR_OPENAI_KEY> \\"
    echo "    alphavantage-api-key=<YOUR_ALPHAVANTAGE_KEY> \\"
    echo "    finnhub-api-key=<YOUR_FINNHUB_KEY>"
fi

echo -e "\n${GREEN}✅ Container App 배포 완료!${NC}"

# 앱 URL 가져오기
APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}📍 App URL: ${GREEN}https://$APP_URL${NC}"
echo -e "${BLUE}📍 Health Check: ${GREEN}https://$APP_URL/health${NC}"
echo -e "${BLUE}📍 API Docs: ${GREEN}https://$APP_URL/docs${NC}"
echo -e "${GREEN}========================================${NC}"
