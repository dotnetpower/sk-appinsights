# Azure Container App 배포 가이드

## 📋 사전 준비

### 환경변수 설정

`.env` 파일에 Container Registry 정보를 추가하세요:

```bash
# Azure Container Registry (배포용)
CONTAINER_REGISTRY_NAME=crskappinsights  # 실제 Registry 이름
RESOURCE_GROUP=rg-sk-appinsights         # 리소스 그룹 이름
LOCATION=koreacentral                    # Azure 리전

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=...
# ... 기타 환경변수
```

### 필수 도구 설치

1. **Docker**
   ```bash
   # Ubuntu
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # 사용자를 docker 그룹에 추가
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Azure CLI**
   ```bash
   # Ubuntu
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   
   # 버전 확인
   az --version
   ```

3. **Container App Extension**
   ```bash
   az extension add --name containerapp --upgrade
   ```

---

## 🚀 배포 방법

### Option 1: 자동 배포 스크립트 사용 (추천)

배포 스크립트는 `.env` 파일에서 환경변수를 자동으로 읽어옵니다.

```bash
# 1. .env 파일 확인 (Container Registry 정보 필수)
cat .env | grep -E "CONTAINER_REGISTRY_NAME|RESOURCE_GROUP|LOCATION"

# 예상 출력:
# CONTAINER_REGISTRY_NAME=crskappinsights
# RESOURCE_GROUP=rg-sk-appinsights
# LOCATION=koreacentral

# 2. 실행 권한 부여
chmod +x deploy-containerapp.sh

# 3. 배포 실행
./deploy-containerapp.sh

# 3. 시크릿 설정 (.env 파일 값 사용)
source .env
az containerapp secret set \
  --name etf-agent-app \
  --resource-group etf-agent-rg \
  --secrets \
    appinsights-connection-string="$APPLICATIONINSIGHTS_CONNECTION_STRING" \
    cosmos-endpoint="$COSMOS_ENDPOINT" \
    cosmos-key="$COSMOS_KEY" \
    cosmos-database-name="$COSMOS_DATABASE_NAME" \
    cosmos-container-name="$COSMOS_CONTAINER_NAME" \
    openai-api-key="$OPENAI_API_KEY" \
    alphavantage-api-key="$ALPHA_VANTAGE_API_KEY" \
    finnhub-api-key="$FINNHUB_API_KEY"
```

---

### Option 2: 수동 배포

#### 1. Azure 로그인

```bash
az login
az account set --subscription <YOUR_SUBSCRIPTION_ID>
```

#### 2. 리소스 그룹 생성

**이미 생성된 경우 건너뛰세요.**

```bash
# .env에서 환경변수 로드
source .env

# 리소스 그룹 확인
az group show --name $RESOURCE_GROUP

# 없으면 생성
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

#### 3. Container Registry 확인

**이미 생성되어 있는 경우:**

```bash
# Registry 정보 확인
az acr show \
  --name $CONTAINER_REGISTRY_NAME \
  --resource-group $RESOURCE_GROUP

# Admin 계정 활성화 확인 (비활성화된 경우 활성화)
az acr update \
  --name $CONTAINER_REGISTRY_NAME \
  --admin-enabled true
```

**새로 생성하는 경우:**

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_REGISTRY_NAME \
  --sku Basic \
  --admin-enabled true
```

#### 4. Docker 이미지 빌드 및 푸시

```bash
# .env에서 환경변수 로드
source .env

# Registry 로그인
az acr login --name $CONTAINER_REGISTRY_NAME

# 이미지 빌드
docker build -t $CONTAINER_REGISTRY_NAME.azurecr.io/etf-agent:latest .

# 이미지 푸시
docker push $CONTAINER_REGISTRY_NAME.azurecr.io/etf-agent:latest

# 푸시된 이미지 확인
az acr repository show \
  --name $CONTAINER_REGISTRY_NAME \
  --repository etf-agent
```

#### 5. Container App Environment 생성

```bash
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-etf-agent-env}"

az containerapp env create \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

#### 6. Container App 생성

```bash
CONTAINER_APP_NAME="etf-agent-app"

# ACR 자격증명 가져오기
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY_NAME --query passwords[0].value -o tsv)

# Container App 생성
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $CONTAINER_REGISTRY_NAME.azurecr.io/etf-agent:latest \
  --registry-server "$CONTAINER_REGISTRY_NAME.azurecr.io" \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi
```

#### 7. 환경 변수 시크릿 설정

```bash
# .env 파일 로드
source .env

az containerapp secret set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    appinsights-connection-string="$APPLICATIONINSIGHTS_CONNECTION_STRING" \
    cosmos-endpoint="$COSMOS_ENDPOINT" \
    cosmos-key="$COSMOS_KEY" \
    cosmos-database-name="$COSMOS_DATABASE_NAME" \
    cosmos-container-name="$COSMOS_CONTAINER_NAME" \
    openai-api-key="$OPENAI_API_KEY" \
    alphavantage-api-key="$ALPHA_VANTAGE_API_KEY" \
    finnhub-api-key="$FINNHUB_API_KEY"

# 환경 변수 업데이트
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
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
```

---

## 🔍 배포 확인

### App URL 확인

```bash
APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "App URL: https://$APP_URL"
```

### Health Check

```bash
curl https://$APP_URL/health
```

**예상 응답**:
```json
{
  "status": "healthy",
  "service": "etf-agent",
  "version": "0.1.0"
}
```

### API 문서 확인

브라우저에서 접속:
- Swagger UI: `https://$APP_URL/docs`
- ReDoc: `https://$APP_URL/redoc`

---

## 🔄 업데이트 배포

### 이미지 업데이트

```bash
# 1. 코드 변경 후 이미지 재빌드
docker build -t $CONTAINER_REGISTRY_NAME.azurecr.io/etf-agent:latest .

# 2. 푸시
docker push $CONTAINER_REGISTRY_NAME.azurecr.io/etf-agent:latest

# 3. Container App 업데이트 (자동으로 새 이미지 가져옴)
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $CONTAINER_REGISTRY_NAME.azurecr.io/etf-agent:latest
```

### 환경 변수만 업데이트

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "LOG_LEVEL=DEBUG"
```

---

## 📊 모니터링

### 로그 확인

```bash
# 실시간 로그 스트리밍
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow

# 최근 100줄
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 100
```

### 리소스 사용량

```bash
# Replica 정보
az containerapp replica list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table

# 메트릭
az monitor metrics list \
  --resource $(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query id -o tsv) \
  --metric-names "Requests" \
  --output table
```

### Application Insights

Azure Portal에서 확인:
1. Application Insights 리소스 이동
2. Live Metrics - 실시간 모니터링
3. Failures - 오류 및 예외
4. Performance - 응답 시간 및 성능
5. Logs - KQL 쿼리

---

## 🛠️ 스케일링 설정

### 수동 스케일링

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 2 \
  --max-replicas 5
```

### 자동 스케일링 규칙

```bash
# HTTP 요청 기반 스케일링
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

---

## 🔒 보안 설정

### IP 제한 (선택사항)

```bash
az containerapp ingress access-restriction set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --rule-name "office-ip" \
  --ip-address "203.0.113.0/24" \
  --action Allow
```

### HTTPS 강제

Container App은 기본적으로 HTTPS를 강제합니다. HTTP 요청은 자동으로 HTTPS로 리디렉션됩니다.

---

## 🧹 리소스 정리

```bash
# Container App만 삭제
az containerapp delete \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --yes

# 전체 리소스 그룹 삭제 (모든 리소스 제거)
az group delete \
  --name $RESOURCE_GROUP \
  --yes --no-wait
```

---

## 🐛 트러블슈팅

### 앱이 시작되지 않을 때

```bash
# 1. 컨테이너 로그 확인
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 200

# 2. Revision 상태 확인
az containerapp revision list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table

# 3. 환경 변수 확인
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.template.containers[0].env"
```

### Health Check 실패

```bash
# Health check 엔드포인트 직접 테스트
APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

curl -v https://$APP_URL/health
```

### 이미지 Pull 실패

```bash
# ACR 자격증명 재설정
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY_NAME --query passwords[0].value -o tsv)

az containerapp registry set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --server "$CONTAINER_REGISTRY_NAME.azurecr.io" \
  --username $ACR_USERNAME \
  --password $ACR_PASSWORD
```

---

## 📚 추가 리소스

- [Azure Container Apps 공식 문서](https://learn.microsoft.com/azure/container-apps/)
- [Docker 모범 사례](https://docs.docker.com/develop/dev-best-practices/)
- [Azure CLI 참조](https://learn.microsoft.com/cli/azure/containerapp)

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] `.env` 파일에 모든 환경 변수 설정
- [ ] `.env`에 Container Registry 정보 확인 (`CONTAINER_REGISTRY_NAME`, `RESOURCE_GROUP`, `LOCATION`)
- [ ] Docker 설치 및 실행 중
- [ ] Azure CLI 설치 및 로그인
- [ ] Container App Extension 설치
- [ ] Azure 구독 활성화
- [ ] Container Registry 생성됨 (또는 기존 Registry 이름 확인)
- [ ] Application Insights 리소스 생성됨
- [ ] Cosmos DB 리소스 생성됨
- [ ] OpenAI API 키 확보

배포 후 확인사항:

- [ ] Health check 응답 정상
- [ ] API 문서 접근 가능
- [ ] Application Insights에서 텔레메트리 수신 확인
- [ ] Cosmos DB 연결 확인
- [ ] 프론트엔드 정상 로드

---

완료! Container App으로 배포 준비 완료! 🎉
