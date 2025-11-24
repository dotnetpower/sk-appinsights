#!/bin/bash
set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Cosmos DB 권한 설정 스크립트${NC}"
echo -e "${GREEN}========================================${NC}"

# 변수 설정
RESOURCE_GROUP="rg-sk-appinsights"
CONTAINER_APP_NAME="etf-agent-app"
COSMOS_ACCOUNT_NAME="cosmosskappinsights"  # 여기에 Cosmos DB 계정 이름 입력

# Cosmos DB 계정 이름 확인
if [ -z "$COSMOS_ACCOUNT_NAME" ]; then
    echo -e "${YELLOW}Cosmos DB 계정을 자동으로 찾는 중...${NC}"
    COSMOS_ACCOUNT_NAME=$(az cosmosdb list \
        --resource-group $RESOURCE_GROUP \
        --query "[0].name" -o tsv)
    
    if [ -z "$COSMOS_ACCOUNT_NAME" ]; then
        echo -e "${RED}❌ Cosmos DB 계정을 찾을 수 없습니다.${NC}"
        echo "스크립트 상단의 COSMOS_ACCOUNT_NAME 변수를 수동으로 설정하세요."
        exit 1
    fi
    
    echo -e "${GREEN}✅ Cosmos DB 계정 발견: $COSMOS_ACCOUNT_NAME${NC}"
fi

echo ""
echo -e "${YELLOW}📋 현재 설정:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Container App: $CONTAINER_APP_NAME"
echo "  Cosmos DB: $COSMOS_ACCOUNT_NAME"
echo ""

# 1. Container App의 Managed Identity 확인
echo -e "${YELLOW}1️⃣  Container App Managed Identity 확인 중...${NC}"
IDENTITY_TYPE=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "identity.type" -o tsv)

if [ "$IDENTITY_TYPE" != "SystemAssigned" ] && [ "$IDENTITY_TYPE" != "SystemAssigned, UserAssigned" ]; then
    echo -e "${RED}❌ System Assigned Identity가 활성화되지 않았습니다.${NC}"
    echo -e "${YELLOW}System Assigned Identity를 활성화하는 중...${NC}"
    
    az containerapp identity assign \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --system-assigned
    
    echo -e "${GREEN}✅ System Assigned Identity 활성화 완료${NC}"
else
    echo -e "${GREEN}✅ System Assigned Identity가 이미 활성화되어 있습니다.${NC}"
fi

# Principal ID 가져오기
PRINCIPAL_ID=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "identity.principalId" -o tsv)

echo -e "${GREEN}   Principal ID: $PRINCIPAL_ID${NC}"

# 2. Cosmos DB 정보 확인
echo ""
echo -e "${YELLOW}2️⃣  Cosmos DB 정보 확인 중...${NC}"

COSMOS_RESOURCE_ID=$(az cosmosdb show \
    --name $COSMOS_ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --query id -o tsv)

echo -e "${GREEN}✅ Cosmos DB Resource ID: $COSMOS_RESOURCE_ID${NC}"

# 3. 현재 역할 할당 확인
echo ""
echo -e "${YELLOW}3️⃣  현재 권한 확인 중...${NC}"

EXISTING_ASSIGNMENTS=$(az cosmosdb sql role assignment list \
    --account-name $COSMOS_ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "[?principalId=='$PRINCIPAL_ID'].roleDefinitionId" -o tsv)

if [ -z "$EXISTING_ASSIGNMENTS" ]; then
    echo -e "${YELLOW}⚠️  현재 할당된 권한이 없습니다.${NC}"
else
    echo -e "${GREEN}✅ 기존 권한 발견:${NC}"
    echo "$EXISTING_ASSIGNMENTS"
fi

# 4. Cosmos DB Built-in Data Contributor 역할 부여
echo ""
echo -e "${YELLOW}4️⃣  Cosmos DB 권한 부여 중...${NC}"

# Built-in Data Contributor Role Definition ID 가져오기
ROLE_DEF_ID=$(az cosmosdb sql role definition list \
    --account-name $COSMOS_ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "[?roleName=='Cosmos DB Built-in Data Contributor'].id" -o tsv)

if [ -z "$ROLE_DEF_ID" ]; then
    echo -e "${RED}❌ Built-in Data Contributor 역할을 찾을 수 없습니다.${NC}"
    echo -e "${YELLOW}대신 DocumentDB Account Contributor 역할을 시도합니다...${NC}"
    
    # Azure RBAC 역할 사용
    az role assignment create \
        --assignee $PRINCIPAL_ID \
        --role "DocumentDB Account Contributor" \
        --scope $COSMOS_RESOURCE_ID
    
    echo -e "${GREEN}✅ DocumentDB Account Contributor 역할 부여 완료${NC}"
else
    echo -e "${GREEN}Role Definition ID: $ROLE_DEF_ID${NC}"
    
    # 이미 할당되어 있는지 확인
    EXISTING_ROLE=$(az cosmosdb sql role assignment list \
        --account-name $COSMOS_ACCOUNT_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "[?principalId=='$PRINCIPAL_ID' && roleDefinitionId=='$ROLE_DEF_ID'].id" -o tsv)
    
    if [ -z "$EXISTING_ROLE" ]; then
        # 역할 할당
        az cosmosdb sql role assignment create \
            --account-name $COSMOS_ACCOUNT_NAME \
            --resource-group $RESOURCE_GROUP \
            --role-definition-id $ROLE_DEF_ID \
            --principal-id $PRINCIPAL_ID \
            --scope "/"
        
        echo -e "${GREEN}✅ Cosmos DB Built-in Data Contributor 역할 부여 완료${NC}"
    else
        echo -e "${GREEN}✅ 역할이 이미 할당되어 있습니다.${NC}"
    fi
fi

# 5. 네트워크 설정 확인
echo ""
echo -e "${YELLOW}5️⃣  Cosmos DB 방화벽 설정 확인 중...${NC}"

FIREWALL_ENABLED=$(az cosmosdb show \
    --name $COSMOS_ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "ipRules" -o tsv)

if [ -n "$FIREWALL_ENABLED" ]; then
    echo -e "${YELLOW}⚠️  Cosmos DB에 IP 방화벽이 설정되어 있습니다.${NC}"
    echo -e "${YELLOW}   Container App이 접근할 수 있도록 'Allow access from Azure services' 활성화를 권장합니다.${NC}"
    
    read -p "Cosmos DB에 모든 IP 접근을 허용하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        az cosmosdb update \
            --name $COSMOS_ACCOUNT_NAME \
            --resource-group $RESOURCE_GROUP \
            --ip-range-filter "0.0.0.0" \
            --enable-public-network true \
            --enable-virtual-network false
        
        echo -e "${GREEN}✅ Cosmos DB 네트워크 설정 완료 (0.0.0.0 허용)${NC}"
    fi
else
    echo -e "${GREEN}✅ 방화벽 설정이 없거나 Azure 서비스 접근이 허용되어 있습니다.${NC}"
fi

# 6. Container App 환경변수 확인
echo ""
echo -e "${YELLOW}6️⃣  Container App 환경변수 확인 중...${NC}"

ENV_VARS=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "properties.template.containers[0].env[?name=='COSMOS_ENDPOINT'].name" -o tsv)

if [ -z "$ENV_VARS" ]; then
    echo -e "${YELLOW}⚠️  COSMOS_ENDPOINT 환경변수가 설정되지 않았습니다.${NC}"
    
    COSMOS_ENDPOINT=$(az cosmosdb show \
        --name $COSMOS_ACCOUNT_NAME \
        --resource-group $RESOURCE_GROUP \
        --query documentEndpoint -o tsv)
    
    echo -e "${YELLOW}   Cosmos Endpoint: $COSMOS_ENDPOINT${NC}"
    echo -e "${YELLOW}   GitHub Secrets 또는 Container App 환경변수에 설정하세요.${NC}"
else
    echo -e "${GREEN}✅ COSMOS_ENDPOINT 환경변수가 설정되어 있습니다.${NC}"
fi

# 7. 최종 확인
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 설정 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📋 최종 확인 사항:${NC}"
echo "  1. Principal ID: $PRINCIPAL_ID"
echo "  2. Cosmos DB 역할 할당 완료"
echo "  3. 환경변수 확인 필요 (COSMOS_ENDPOINT, COSMOS_DATABASE_NAME, COSMOS_CONTAINER_NAME)"
echo ""
echo -e "${YELLOW}🔄 다음 단계:${NC}"
echo "  1. Container App 재시작: az containerapp restart --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"
echo "  2. 로그 확인: az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --tail 50"
echo "  3. Cosmos DB 연결 테스트"
echo ""
echo -e "${YELLOW}💡 참고:${NC}"
echo "  - 역할 할당 후 전파까지 1-2분 소요될 수 있습니다."
echo "  - COSMOS_KEY 환경변수가 설정되어 있다면 제거하세요 (Managed Identity 사용 시 불필요)"
echo ""
