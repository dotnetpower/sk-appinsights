# Cosmos DB 네트워크 접근 설정 가이드

## 📋 개요

Azure Cosmos DB의 네트워크 보안을 위해 public network access가 정책적으로 제한될 수 있습니다. 
이 경우 Container App이 Cosmos DB에 접근하려면 Container App의 outbound IP 주소를 Cosmos DB 방화벽 허용 목록에 추가해야 합니다.

이 프로젝트의 CI/CD 파이프라인은 자동으로 Container App의 IP를 Cosmos DB 방화벽 규칙에 추가합니다.

---

## 🔧 자동 구성 (CI/CD 파이프라인)

### GitHub Actions 워크플로우

`.github/workflows/deploy-containerapp.yml` 워크플로우는 배포 과정에서 자동으로 다음 작업을 수행합니다:

1. **Container App Environment의 Static IP 확인**
   ```bash
   az containerapp env show \
     --name <env-name> \
     --resource-group <resource-group> \
     --query "properties.staticIp"
   ```

2. **Cosmos DB 현재 방화벽 규칙 확인**
   ```bash
   az cosmosdb show \
     --name <cosmos-account> \
     --resource-group <resource-group> \
     --query "ipRules[].ipAddressOrRange"
   ```

3. **Container App IP를 방화벽 규칙에 추가** (아직 없는 경우)
   ```bash
   az cosmosdb update \
     --name <cosmos-account> \
     --resource-group <resource-group> \
     --ip-range-filter "<container-app-ip>,<existing-ips>"
   ```

### 필수 GitHub Secret

워크플로우가 정상 작동하려면 다음 Secret이 설정되어 있어야 합니다:

| Secret 이름 | 설명 | 필수 여부 |
|------------|------|----------|
| `COSMOS_ACCOUNT_NAME` | Cosmos DB 계정 이름 | 선택 (기본값: `cosmosskappinsights`) |
| `AZURE_CREDENTIALS` | Azure Service Principal 자격증명 | 필수 |

Cosmos DB 계정 이름을 기본값과 다르게 사용하는 경우:

```bash
# GitHub Repository → Settings → Secrets and variables → Actions
# New repository secret 클릭
# Name: COSMOS_ACCOUNT_NAME
# Value: <your-cosmos-account-name>
```

---

## 🛠️ 수동 구성 방법

### Option 1: Azure CLI 사용

#### 1. Container App의 Static IP 확인

```bash
# 환경 변수 설정
RESOURCE_GROUP="rg-sk-appinsights"
CONTAINER_APP_NAME="etf-agent-app"

# Container App Environment 이름 가져오기
ENV_NAME=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.environmentId" -o tsv | xargs basename)

# Static IP 가져오기
STATIC_IP=$(az containerapp env show \
  --name $ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.staticIp" -o tsv)

echo "Container App Static IP: $STATIC_IP"
```

#### 2. Cosmos DB 방화벽 규칙에 IP 추가

```bash
COSMOS_ACCOUNT_NAME="cosmosskappinsights"

# 현재 IP 규칙 확인
az cosmosdb show \
  --name $COSMOS_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "ipRules[].ipAddressOrRange" -o tsv

# Container App IP 추가
az cosmosdb update \
  --name $COSMOS_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --ip-range-filter "$STATIC_IP"
```

**주의**: `--ip-range-filter`는 기존 IP를 모두 대체합니다. 기존 IP가 있는 경우 함께 포함해야 합니다:

```bash
# 기존 IP들과 함께 추가
EXISTING_IPS="1.2.3.4,5.6.7.8"
az cosmosdb update \
  --name $COSMOS_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --ip-range-filter "$STATIC_IP,$EXISTING_IPS"
```

#### 3. 방화벽 규칙 확인

```bash
az cosmosdb show \
  --name $COSMOS_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "ipRules" -o table
```

### Option 2: Azure Portal 사용

1. **Azure Portal** (https://portal.azure.com) 접속
2. **Cosmos DB 계정** 이동
3. 왼쪽 메뉴에서 **Networking** 클릭
4. **Firewall and virtual networks** 섹션에서:
   - ✅ **Selected networks** 선택
   - **Firewall** 섹션에 Container App의 Static IP 추가
   - **Save** 클릭

---

## 🔍 네트워크 구성 옵션

### Option 1: IP 기반 방화벽 (현재 구현)

**장점**:
- 간단하고 빠른 설정
- 추가 비용 없음
- CI/CD 파이프라인에서 자동 구성 가능

**단점**:
- Container App Environment가 변경되면 IP가 바뀔 수 있음
- 각 환경(dev, staging, prod)마다 별도 설정 필요

### Option 2: Virtual Network 통합 (고급)

더 강력한 보안이 필요한 경우 Virtual Network 통합을 고려할 수 있습니다:

```bash
# 1. Virtual Network 생성
az network vnet create \
  --name etf-agent-vnet \
  --resource-group $RESOURCE_GROUP \
  --address-prefix 10.0.0.0/16 \
  --subnet-name cosmos-subnet \
  --subnet-prefix 10.0.1.0/24

# 2. Cosmos DB에 VNet 규칙 추가
SUBNET_ID=$(az network vnet subnet show \
  --vnet-name etf-agent-vnet \
  --name cosmos-subnet \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

az cosmosdb network-rule add \
  --name $COSMOS_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --subnet $SUBNET_ID

# 3. Container App Environment를 VNet과 통합
az containerapp env create \
  --name etf-agent-env \
  --resource-group $RESOURCE_GROUP \
  --location koreacentral \
  --infrastructure-subnet-resource-id $SUBNET_ID
```

**장점**:
- 더 강력한 네트워크 격리
- Private Endpoint 지원
- IP 변경에 영향 받지 않음

**단점**:
- 추가 비용 발생 (VNet, Private Endpoint)
- 복잡한 설정
- 초기 구성 시간 소요

---

## 🐛 트러블슈팅

### Container App에서 Cosmos DB 연결 실패

#### 증상
```
azure.cosmos.exceptions.CosmosHttpResponseError: Status code: 403
Message: Request originated from client IP x.x.x.x through public internet.
This is blocked by your Cosmos DB account firewall settings.
```

#### 해결 방법

1. **Container App의 Static IP 확인**
   ```bash
   ENV_NAME=$(az containerapp show \
     --name etf-agent-app \
     --resource-group rg-sk-appinsights \
     --query "properties.environmentId" -o tsv | xargs basename)
   
   az containerapp env show \
     --name $ENV_NAME \
     --resource-group rg-sk-appinsights \
     --query "properties.staticIp" -o tsv
   ```

2. **Cosmos DB 방화벽 규칙에 IP 추가**
   ```bash
   az cosmosdb update \
     --name cosmosskappinsights \
     --resource-group rg-sk-appinsights \
     --ip-range-filter "<static-ip>"
   ```

3. **방화벽 규칙 적용 대기**
   
   방화벽 규칙 변경 후 적용까지 1-2분 소요될 수 있습니다.

4. **Container App 재시작** (선택사항)
   ```bash
   az containerapp restart \
     --name etf-agent-app \
     --resource-group rg-sk-appinsights
   ```

### Static IP가 없는 경우

Container App Environment가 VNet 통합 없이 생성된 경우 Static IP가 없을 수 있습니다.

#### 해결 방법 1: IP 기반 방화벽 규칙 (모든 IP 허용)
```bash
az cosmosdb update \
  --name cosmosskappinsights \
  --resource-group rg-sk-appinsights \
  --ip-range-filter "0.0.0.0" \
  --enable-public-network true \
  --enable-virtual-network false
```

#### 해결 방법 2: VNet 통합 환경 재생성
위의 "Virtual Network 통합" 섹션 참조

### IP 규칙이 자동으로 추가되지 않는 경우

#### CI/CD 워크플로우 로그 확인

1. GitHub Repository → Actions
2. 최근 워크플로우 실행 클릭
3. "Configure Cosmos DB Network Access" 단계 확인

#### Service Principal 권한 확인

Service Principal에 Cosmos DB 수정 권한이 있는지 확인:

```bash
# Service Principal의 Client ID 확인
CLIENT_ID=$(echo '${{ secrets.AZURE_CREDENTIALS }}' | jq -r '.clientId')

# Cosmos DB Contributor 역할 할당
az role assignment create \
  --assignee $CLIENT_ID \
  --role "DocumentDB Account Contributor" \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-sk-appinsights/providers/Microsoft.DocumentDB/databaseAccounts/cosmosskappinsights
```

---

## 📚 추가 리소스

### Azure 공식 문서
- [Cosmos DB 방화벽 구성](https://learn.microsoft.com/azure/cosmos-db/how-to-configure-firewall)
- [Container Apps 네트워킹](https://learn.microsoft.com/azure/container-apps/networking)
- [Virtual Network 통합](https://learn.microsoft.com/azure/container-apps/vnet-custom)

### 관련 스크립트
- `setup-cosmos-permissions.sh` - Cosmos DB 권한 설정 스크립트
- `.github/workflows/deploy-containerapp.yml` - CI/CD 배포 워크플로우

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] Azure Service Principal에 Cosmos DB 수정 권한 부여
- [ ] GitHub Secrets 설정 (`AZURE_CREDENTIALS`)
- [ ] `COSMOS_ACCOUNT_NAME` Secret 설정 (기본값 사용 시 불필요)
- [ ] Container App 배포 완료

배포 후 확인사항:

- [ ] Container App Static IP 확인
- [ ] Cosmos DB 방화벽 규칙에 IP 추가 확인
- [ ] Container App에서 Cosmos DB 연결 테스트
- [ ] Application Insights에서 연결 오류 로그 없음 확인

---

## 🔐 보안 고려사항

### 최소 권한 원칙

1. **Service Principal 권한 제한**
   - Contributor 대신 최소 권한 사용
   - Cosmos DB에만 DocumentDB Account Contributor 역할 부여

2. **IP 범위 최소화**
   - Container App의 Static IP만 허용
   - 불필요한 IP 제거

3. **정기적인 감사**
   - 방화벽 규칙 정기 검토
   - 사용하지 않는 IP 제거

### Managed Identity 사용 권장

Key 기반 인증 대신 Managed Identity 사용:

```bash
# Container App에 System Assigned Identity 활성화
az containerapp identity assign \
  --name etf-agent-app \
  --resource-group rg-sk-appinsights \
  --system-assigned

# Cosmos DB 권한 부여
PRINCIPAL_ID=$(az containerapp show \
  --name etf-agent-app \
  --resource-group rg-sk-appinsights \
  --query "identity.principalId" -o tsv)

az cosmosdb sql role assignment create \
  --account-name cosmosskappinsights \
  --resource-group rg-sk-appinsights \
  --role-definition-id <built-in-data-contributor-id> \
  --principal-id $PRINCIPAL_ID \
  --scope "/"
```

자세한 내용은 `setup-cosmos-permissions.sh` 스크립트 참조.

---

완료! Cosmos DB 네트워크 접근이 자동으로 구성됩니다! 🎉
