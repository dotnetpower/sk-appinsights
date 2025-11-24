# Application Insights KQL 쿼리 설정 가이드

## 개요
이 문서는 App Insights 메뉴에서 KQL 쿼리를 실행하기 위한 설정 방법을 설명합니다.

## 필수 환경 변수

Application Insights에서 KQL 쿼리를 실행하려면 다음 환경 변수가 필요합니다:

```bash
# Application Insights 연결 문자열 (기존)
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxx;IngestionEndpoint=xxx;LiveEndpoint=xxx"

# Application Insights Workspace ID (신규 추가)
APPLICATIONINSIGHTS_WORKSPACE_ID="your-workspace-id-here"
```

## Workspace ID 찾기

### Azure Portal에서 찾기

1. Azure Portal (https://portal.azure.com) 접속
2. Application Insights 리소스로 이동
3. 왼쪽 메뉴에서 **"속성"** 또는 **"Properties"** 클릭
4. **"Workspace ID"** 또는 **"작업 영역 리소스 ID"** 복사

   형식: `/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.OperationalInsights/workspaces/{workspace-name}`

### Azure CLI로 찾기

```bash
# Application Insights 리소스 정보 조회
az monitor app-insights component show \
  --app <your-app-insights-name> \
  --resource-group <your-resource-group> \
  --query workspaceResourceId -o tsv
```

또는 Log Analytics Workspace ID만 필요한 경우:

```bash
# Log Analytics Workspace ID 조회
az monitor log-analytics workspace show \
  --resource-group <your-resource-group> \
  --workspace-name <your-workspace-name> \
  --query customerId -o tsv
```

## 인증 설정

### 개발 환경 (로컬)

Azure CLI로 로그인:

```bash
az login
```

로그인 후 자동으로 `DefaultAzureCredential`이 Azure CLI 인증을 사용합니다.

### 프로덕션 환경 (Azure)

#### Managed Identity 사용 (권장)

1. **App Service / Container App에 Managed Identity 활성화**
   
   ```bash
   # System-assigned Managed Identity 활성화
   az webapp identity assign \
     --name <your-app-name> \
     --resource-group <your-resource-group>
   ```

2. **Log Analytics Workspace에 권한 부여**

   ```bash
   # Managed Identity의 Principal ID 확인
   PRINCIPAL_ID=$(az webapp identity show \
     --name <your-app-name> \
     --resource-group <your-resource-group> \
     --query principalId -o tsv)
   
   # Log Analytics Reader 역할 부여
   az role assignment create \
     --assignee $PRINCIPAL_ID \
     --role "Log Analytics Reader" \
     --scope "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.OperationalInsights/workspaces/{workspace-name}"
   ```

3. **Application Insights에도 권한 부여 (선택사항)**

   ```bash
   az role assignment create \
     --assignee $PRINCIPAL_ID \
     --role "Monitoring Reader" \
     --scope "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Insights/components/{app-insights-name}"
   ```

## 환경 변수 설정

### 로컬 개발 (.env 파일)

```bash
# .env 파일에 추가
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=...;LiveEndpoint=..."
APPLICATIONINSIGHTS_WORKSPACE_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Azure App Service

```bash
az webapp config appsettings set \
  --name <your-app-name> \
  --resource-group <your-resource-group> \
  --settings \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=...;LiveEndpoint=..." \
    APPLICATIONINSIGHTS_WORKSPACE_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Azure Container Apps

```bash
az containerapp update \
  --name <your-app-name> \
  --resource-group <your-resource-group> \
  --set-env-vars \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=...;LiveEndpoint=..." \
    APPLICATIONINSIGHTS_WORKSPACE_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### GitHub Actions (Secrets)

GitHub 저장소 설정:

1. Settings → Secrets and variables → Actions
2. New repository secret 클릭
3. 다음 시크릿 추가:
   - `APPLICATIONINSIGHTS_WORKSPACE_ID`

## 테스트

### API 헬스체크

```bash
curl http://localhost:8000/api/insights/health
```

예상 응답:
```json
{
  "status": "healthy",
  "workspace_configured": true
}
```

### KQL 쿼리 테스트

```bash
curl -X POST http://localhost:8000/api/insights/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "requests | where timestamp > ago(1h) | summarize count()"
  }'
```

## 사전 정의된 인사이트

App Insights 메뉴의 "사전 정의 인사이트" 탭에서 다음 분석을 즉시 실행할 수 있습니다:

### 성능
- 최근 1시간 요청 수
- 가장 느린 API 엔드포인트
- 성능 추이 (시간대별)

### 오류
- 에러율 분석 (HTTP 상태 코드)
- 종속성 실패

### 사용자
- 사용자 활동 분석 (페이지별)
- AI 채팅 사용량
- 마우스 클릭 히트맵
- 세션 지속 시간

### 비즈니스
- 가장 인기있는 ETF

## 보안 고려사항

### 쿼리 제한

백엔드에서는 다음 키워드를 포함한 쿼리를 차단합니다:
- `drop`
- `delete`
- `truncate`
- `create`
- `alter`

### 권한 최소화

프로덕션에서는 읽기 전용 권한만 부여:
- `Log Analytics Reader`
- `Monitoring Reader`

쓰기 권한은 부여하지 마세요.

## 문제 해결

### "Azure 인증에 실패했습니다"

**원인**: Azure CLI 로그인이 안 되었거나 Managed Identity가 설정되지 않음

**해결**:
```bash
# 로컬: Azure CLI 로그인
az login

# Azure: Managed Identity 확인
az webapp identity show --name <app-name> --resource-group <rg>
```

### "APPLICATIONINSIGHTS_WORKSPACE_ID 환경 변수를 설정하세요"

**원인**: 환경 변수가 설정되지 않음

**해결**:
- `.env` 파일 확인
- Azure 환경 변수 설정 확인

### "쿼리 실행 실패: Unauthorized"

**원인**: Managed Identity에 권한이 없음

**해결**:
```bash
# Log Analytics Reader 역할 부여
az role assignment create \
  --assignee <managed-identity-principal-id> \
  --role "Log Analytics Reader" \
  --scope <workspace-resource-id>
```

## 참고 자료

- [Azure Monitor Query Python SDK](https://learn.microsoft.com/python/api/overview/azure/monitor-query-readme)
- [KQL Quick Reference](https://learn.microsoft.com/azure/data-explorer/kql-quick-reference)
- [Application Insights Query Examples](https://learn.microsoft.com/azure/azure-monitor/logs/queries)
