# GitHub Actions CI/CD 설정 가이드

이 문서는 GitHub Actions를 사용하여 Azure Container App으로 자동 배포하는 방법을 설명합니다.

## 📋 워크플로우 개요

### 1. **CI (Continuous Integration)** - `ci.yml`
- **트리거**: Pull Request, non-main 브랜치 push
- **작업**:
  - Python 코드 린트 (ruff)
  - 코드 포맷 검사 (black)
  - 테스트 실행 (pytest)
  - Docker 이미지 빌드 및 테스트

### 2. **CD (Continuous Deployment)** - `deploy-containerapp.yml`
- **트리거**: main 브랜치 push, 수동 실행
- **작업**:
  - Docker 이미지 빌드
  - Azure Container Registry에 푸시
  - Azure Container App 배포/업데이트
  - **🔒 Cosmos DB 네트워크 접근 자동 구성** (Container App IP를 방화벽 허용 목록에 추가)

---

## 🔧 GitHub Secrets 설정

### 필수 Secrets

Repository → Settings → Secrets and variables → Actions → New repository secret

#### 1. Azure 인증 정보

**방법 1: AZURE_CREDENTIALS (현재 사용 중)**

Service Principal의 전체 JSON을 저장합니다.

```bash
# 1. Azure CLI로 서비스 주체 생성
az ad sp create-for-rbac \
  --name "github-actions-etf-agent" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/rg-sk-appinsights \
  --sdk-auth

# 2. 출력된 JSON 전체를 GitHub Secret에 저장
# 출력 예시:
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  ...
}
```

**Secret 이름**: `AZURE_CREDENTIALS`  
**값**: 위 JSON 전체 내용

**방법 2: 개별 Secrets (대안)**

JSON 형식 대신 개별 값으로 저장할 수도 있습니다:

- `AZURE_CLIENT_ID`: Service Principal의 Client ID
- `AZURE_CLIENT_SECRET`: Service Principal의 Client Secret
- `AZURE_TENANT_ID`: Azure AD Tenant ID
- `AZURE_SUBSCRIPTION_ID`: Azure Subscription ID

**주의**: 현재 워크플로우는 `AZURE_CREDENTIALS` 방식을 사용합니다.

#### 2. Application Insights

**`APPLICATIONINSIGHTS_CONNECTION_STRING`**

```bash
# Azure Portal에서 확인
# Application Insights → Overview → Connection String

# 또는 Azure CLI
az monitor app-insights component show \
  --app {APP_INSIGHTS_NAME} \
  --resource-group rg-sk-appinsights \
  --query connectionString -o tsv
```

#### 3. Cosmos DB

**`COSMOS_ACCOUNT_NAME`** (필수)
```bash
# Cosmos DB 계정 이름
# GitHub Actions에서 Cosmos DB 네트워크 ACL 설정에 사용됩니다
# 예: cosmosskappinsights

# Azure Portal에서 확인:
# Cosmos DB 리소스 → Overview → 리소스 이름
# 또는 CLI로 확인:
az cosmosdb list --resource-group rg-sk-appinsights --query "[].name" -o tsv
```

**`COSMOS_ENDPOINT`**
```bash
# 예: https://your-cosmos-account.documents.azure.com:443/
```

**`COSMOS_KEY`** (선택사항 - Azure AD 인증 사용 시 불필요)
```bash
# Azure Portal → Cosmos DB → Keys → Primary Key
# Azure AD (RBAC) 인증을 사용하는 경우 생략 가능 (권장)
```

**`COSMOS_DATABASE_NAME`**
```bash
# 예: etf-agent
```

**`COSMOS_CONTAINER_NAME`**
```bash
# 예: etf-data
```

#### 4. AI 서비스

**옵션 1: Azure OpenAI (권장)**

**`AZURE_OPENAI_ENDPOINT`**
```bash
# 예: https://your-openai-resource.openai.azure.com/
```

**`AZURE_OPENAI_API_KEY`**
```bash
# Azure Portal → Azure OpenAI → Keys and Endpoint → KEY 1
```

**`AZURE_OPENAI_DEPLOYMENT_NAME`**
```bash
# 예: gpt-4o-mini
```

**`AZURE_OPENAI_API_VERSION`**
```bash
# 예: 2024-08-01-preview
```

**옵션 2: OpenAI (Azure OpenAI 사용 시 불필요)**

**`OPENAI_API_KEY`**
```bash
# OpenAI API 키
# Azure OpenAI를 사용하는 경우 생략 가능
```

#### 5. 외부 API (선택사항)

**`ALPHA_VANTAGE_KEY`**
```bash
# Alpha Vantage API 키
# yfinance fallback용, 선택적
```

---

## 🚀 사용 방법

### 자동 배포 (main 브랜치 push)

```bash
# 1. 코드 변경
git add .
git commit -m "feat: 새로운 기능 추가"

# 2. main 브랜치에 push
git push origin main

# 3. GitHub Actions 자동 실행
# https://github.com/dotnetpower/sk-appinsights/actions
```

### 수동 배포

1. GitHub Repository → Actions
2. "Deploy to Azure Container App" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 (기본: main)
5. "Run workflow" 확인

### Pull Request CI 확인

```bash
# 1. 새 브랜치 생성
git checkout -b feature/new-feature

# 2. 코드 변경 및 커밋
git add .
git commit -m "feat: 새로운 기능"

# 3. Push
git push origin feature/new-feature

# 4. GitHub에서 Pull Request 생성
# CI 워크플로우 자동 실행 (린트, 테스트, Docker 빌드)
```

---

## 📊 워크플로우 상태 확인

### GitHub Actions UI

```
https://github.com/dotnetpower/sk-appinsights/actions
```

### 배포 결과 확인

워크플로우 실행 후 Summary 섹션에서 다음 정보 확인:

- 🌐 App URL
- 💚 Health Check URL
- 📚 API Docs URL
- 🏷️ Image Tag (commit SHA)

### 로그 확인

```bash
# Azure Container App 로그
az containerapp logs show \
  --name etf-agent-app \
  --resource-group rg-sk-appinsights \
  --follow
```

---

## 🔍 워크플로우 파일 설명

### deploy-containerapp.yml

```yaml
# 환경변수 설정
env:
  CONTAINER_REGISTRY_NAME: crskappinsights
  RESOURCE_GROUP: rg-sk-appinsights
  CONTAINER_APP_NAME: etf-agent-app
  IMAGE_NAME: etf-agent

# 주요 단계:
# 1. 코드 체크아웃
# 2. Azure 로그인 (Service Principal)
# 3. Container Registry 로그인
# 4. Docker 이미지 빌드 (commit SHA + latest 태그)
# 5. Docker 이미지 푸시
# 6. Container App 배포/업데이트
# 7. 배포 결과 출력
```

### ci.yml

```yaml
# Pull Request 및 non-main 브랜치에서 실행

# 테스트 job:
# - Python 설정
# - uv로 의존성 설치
# - 린트 검사 (ruff)
# - 포맷 검사 (black)
# - 테스트 실행 (pytest)

# 빌드 job:
# - Docker 이미지 빌드
# - 컨테이너 실행 테스트
# - Health check 검증
```

---

## 🛠️ 고급 설정

### 환경별 배포 (Development, Staging, Production)

#### 1. 환경 생성

Repository → Settings → Environments → New environment

- `development`
- `staging`
- `production`

#### 2. 환경별 Secrets 설정

각 환경에 별도의 Secrets 설정 가능

#### 3. Workflow 수정

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # 환경 지정
    
    steps:
    # ... (기존 단계)
```

### 승인 프로세스 추가

Environment → Protection rules → Required reviewers

Production 환경에 배포 전 승인 요구 가능

### 배포 스케줄링

```yaml
on:
  push:
    branches:
      - main
  schedule:
    - cron: '0 0 * * 0'  # 매주 일요일 00:00 UTC
  workflow_dispatch:
```

### Blue-Green 배포

```yaml
- name: Deploy to Container App (Blue-Green)
  run: |
    # 새 revision 배포
    az containerapp update \
      --name ${{ env.CONTAINER_APP_NAME }} \
      --resource-group ${{ env.RESOURCE_GROUP }} \
      --image ${{ env.CONTAINER_REGISTRY_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}
    
    # Traffic splitting (선택사항)
    az containerapp ingress traffic set \
      --name ${{ env.CONTAINER_APP_NAME }} \
      --resource-group ${{ env.RESOURCE_GROUP }} \
      --revision-weight latest=100
```

---

## 🐛 트러블슈팅

### 워크플로우 실패 원인

#### 1. Azure 인증 실패

**에러**:
```
Error: Using auth-type: SERVICE_PRINCIPAL. Not all values are present. 
Ensure 'client-id' and 'tenant-id' are supplied.
```

**원인**: `AZURE_CREDENTIALS` Secret의 JSON 형식이 올바르지 않거나 누락됨

**해결**:

1. Service Principal 재생성:
```bash
az ad sp create-for-rbac \
  --name "github-actions-etf-agent" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/rg-sk-appinsights \
  --sdk-auth
```

2. **출력된 JSON 전체**를 복사하여 GitHub Secret에 저장:
   - Repository → Settings → Secrets and variables → Actions
   - "New repository secret" 클릭
   - Name: `AZURE_CREDENTIALS`
   - Value: JSON 전체 내용 (아래 예시 형식)
   
```json
{
  "clientId": "12345678-1234-1234-1234-123456789abc",
  "clientSecret": "your-secret-value",
  "subscriptionId": "87654321-4321-4321-4321-cba987654321",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

3. JSON 형식 확인:
   - 유효한 JSON인지 확인 ([JSONLint](https://jsonlint.com/) 사용)
   - 중괄호 `{}`로 시작하고 끝나는지 확인
   - 모든 필드가 포함되어 있는지 확인

**에러**:
- `AZURE_CREDENTIALS` Secret 확인
- Service Principal 권한 확인 (Contributor 역할)
- Service Principal 만료 확인

```bash
# Service Principal 재생성
az ad sp create-for-rbac \
  --name "github-actions-etf-agent" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/rg-sk-appinsights \
  --sdk-auth
```

#### 2. Container Registry 접근 실패

```
Error: unauthorized: authentication required
```

**해결**:
- Container Registry Admin 계정 활성화 확인
- Service Principal에 ACR Pull/Push 권한 부여

```bash
# ACR Admin 활성화
az acr update --name crskappinsights --admin-enabled true

# Service Principal에 ACR Push 권한 부여
az role assignment create \
  --assignee {SERVICE_PRINCIPAL_CLIENT_ID} \
  --role AcrPush \
  --scope /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/rg-sk-appinsights/providers/Microsoft.ContainerRegistry/registries/crskappinsights
```

#### 3. Docker 빌드 실패

```
Error: failed to solve: process "/bin/sh -c npm run build" did not complete successfully
```

**해결**:
- Dockerfile 구문 확인
- 로컬에서 빌드 테스트

```bash
docker build -t test .
```

#### 4. Container App 배포 실패

```
Error: The subscription is not registered to use namespace 'Microsoft.App'
```

**해결**:
```bash
# Container App provider 등록
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

#### 5. Health Check 실패

**CI 워크플로우에서 Health Check 타임아웃**

**해결**:
- 컨테이너 로그 확인 (워크플로우 로그에 출력됨)
- 환경변수 누락 확인
- `/health` 엔드포인트 구현 확인

#### 6. Cosmos DB 연결 실패

**증상**:
```
azure.cosmos.exceptions.CosmosHttpResponseError: Status code: 403
Request originated from client IP through public internet.
This is blocked by your Cosmos DB account firewall settings.
```

**원인**: Cosmos DB 방화벽이 Container App의 IP를 차단하고 있습니다.

**해결**:

워크플로우는 자동으로 Container App IP를 Cosmos DB 방화벽에 추가합니다. 
만약 자동 추가가 실패한 경우:

1. **Service Principal 권한 확인**
   ```bash
   # Service Principal에 Cosmos DB 수정 권한 부여
   CLIENT_ID=$(echo '${{ secrets.AZURE_CREDENTIALS }}' | jq -r '.clientId')
   
   az role assignment create \
     --assignee $CLIENT_ID \
     --role "DocumentDB Account Contributor" \
     --scope /subscriptions/<subscription-id>/resourceGroups/rg-sk-appinsights/providers/Microsoft.DocumentDB/databaseAccounts/cosmosskappinsights
   ```

2. **수동으로 IP 추가**
   ```bash
   # Container App Static IP 확인
   ENV_NAME=$(az containerapp show \
     --name etf-agent-app \
     --resource-group rg-sk-appinsights \
     --query "properties.environmentId" -o tsv | xargs basename)
   
   STATIC_IP=$(az containerapp env show \
     --name $ENV_NAME \
     --resource-group rg-sk-appinsights \
     --query "properties.staticIp" -o tsv)
   
   # Cosmos DB 방화벽에 추가
   az cosmosdb update \
     --name cosmosskappinsights \
     --resource-group rg-sk-appinsights \
     --ip-range-filter "$STATIC_IP"
   ```

자세한 내용은 [COSMOS_DB_NETWORK_SETUP.md](./COSMOS_DB_NETWORK_SETUP.md) 참조.

---

## 📚 추가 리소스

### GitHub Actions 공식 문서
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

### Azure 관련
- [Azure Login Action](https://github.com/Azure/login)
- [Azure Container Apps with GitHub Actions](https://learn.microsoft.com/azure/container-apps/github-actions)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/containerapp)

### Best Practices
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

## ✅ 체크리스트

설정 완료 확인:

- [ ] Azure 서비스 주체 생성 및 `AZURE_CREDENTIALS` Secret 설정
- [ ] Application Insights Connection String Secret 설정
- [ ] Cosmos DB Endpoint 및 Key Secret 설정
- [ ] OpenAI API Key Secret 설정
- [ ] 외부 API Key Secret 설정 (선택)
- [ ] Container Registry Admin 계정 활성화
- [ ] Service Principal ACR 권한 부여
- [ ] Workflow 파일 main 브랜치에 커밋
- [ ] 첫 번째 워크플로우 실행 성공 확인
- [ ] 배포된 앱 Health Check 성공

---

완료! GitHub Actions를 통한 자동 배포 준비 완료! 🎉

## 🚀 빠른 시작

### 단계별 설정 가이드

#### Step 1: Service Principal 생성

```bash
# Azure 구독 ID 확인
az account show --query id -o tsv

# Service Principal 생성 (출력을 복사하세요!)
az ad sp create-for-rbac \
  --name "github-actions-etf-agent" \
  --role contributor \
  --scopes /subscriptions/b052302c-4c8d-49a4-aa2f-9d60a7301a80/resourceGroups/rg-sk-appinsights \
  --sdk-auth

# ⚠️ 출력된 JSON 전체를 복사하여 저장하세요!
```

#### Step 2: GitHub Secrets 설정

1. GitHub Repository 이동: https://github.com/dotnetpower/sk-appinsights
2. Settings → Secrets and variables → Actions
3. "New repository secret" 클릭하여 다음 Secrets 추가:

**필수 Secrets**:

| Secret 이름 | 값 | 확인 방법 |
|------------|-----|----------|
| `AZURE_CREDENTIALS` | Service Principal JSON 전체 | Step 1에서 복사한 JSON |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | InstrumentationKey=... | Azure Portal → App Insights → Overview |
| `COSMOS_ENDPOINT` | https://xxx.documents.azure.com:443/ | Azure Portal → Cosmos DB → Keys |
| `COSMOS_KEY` | Primary Key | Azure Portal → Cosmos DB → Keys |
| `COSMOS_DATABASE_NAME` | etf-agent | 데이터베이스 이름 |
| `COSMOS_CONTAINER_NAME` | etf-data | 컨테이너 이름 |
| `OPENAI_API_KEY` | sk-... | OpenAI Platform |

**선택 Secrets**:

| Secret 이름 | 값 |
|------------|-----|
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API Key |
| `FINNHUB_API_KEY` | Finnhub API Key |

#### Step 3: Secrets 검증

설정한 Secrets 확인:
```bash
# GitHub CLI 사용
gh secret list

# 예상 출력:
# ALPHA_VANTAGE_API_KEY          Updated 2024-01-01
# APPLICATIONINSIGHTS_CONNECTION_STRING  Updated 2024-01-01
# AZURE_CREDENTIALS               Updated 2024-01-01
# COSMOS_CONTAINER_NAME           Updated 2024-01-01
# COSMOS_DATABASE_NAME            Updated 2024-01-01
# COSMOS_ENDPOINT                 Updated 2024-01-01
# COSMOS_KEY                      Updated 2024-01-01
# FINNHUB_API_KEY                 Updated 2024-01-01
# OPENAI_API_KEY                  Updated 2024-01-01
```

#### Step 4: 워크플로우 커밋 및 푸시

```bash
# 1. 워크플로우 파일 커밋
git add .github/workflows/
git commit -m "ci: Add GitHub Actions CI/CD workflows"
git push origin main

# 2. GitHub Actions 실행 확인
# https://github.com/dotnetpower/sk-appinsights/actions
```

#### Step 5: 배포 확인

워크플로우 완료 후:
1. Actions 탭에서 워크플로우 클릭
2. Summary 섹션에서 App URL 확인
3. 브라우저에서 App URL 접속하여 Health Check 확인

---

## 🚀 빠른 시작 (이전 버전)

```bash
# 1. Secrets 설정 (GitHub Repository Settings)

# 2. 코드 푸시
git add .
git commit -m "ci: Add GitHub Actions workflows"
git push origin main

# 3. Actions 탭에서 배포 진행 확인
# https://github.com/dotnetpower/sk-appinsights/actions

# 4. 배포 완료 후 앱 URL 확인
```
