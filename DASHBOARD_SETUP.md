# Application Insights 대시보드 설정 가이드

## 📊 대시보드 개요

ETF Agent 애플리케이션의 연결된 서비스를 모니터링하기 위한 대시보드를 제공합니다.

### 포함된 대시보드

1. **azure-dashboard.json** - Azure Portal 대시보드
2. **azure-workbook.json** - Application Insights Workbook (추천)

---

## 🚀 설정 방법

### Option 1: Workbook 사용 (추천)

Workbook은 더 강력하고 대화형 기능을 제공합니다.

#### 1. Azure Portal에서 Workbook 만들기

1. Azure Portal → Application Insights 리소스로 이동
2. 왼쪽 메뉴에서 **Workbooks** 클릭
3. **+ New** 또는 **Empty** 클릭
4. 우측 상단의 **Advanced Editor** (</> 아이콘) 클릭
5. `azure-workbook.json` 파일의 내용을 복사하여 붙여넣기
6. **Apply** 클릭

#### 2. 리소스 ID 업데이트

Workbook JSON의 맨 아래 `fallbackResourceIds`를 업데이트:

```json
"fallbackResourceIds": [
  "/subscriptions/{YOUR_SUBSCRIPTION_ID}/resourceGroups/{YOUR_RESOURCE_GROUP}/providers/microsoft.insights/components/{YOUR_APP_INSIGHTS_NAME}"
]
```

실제 값 확인 방법:
```bash
# Azure CLI로 리소스 ID 확인
az monitor app-insights component show \
  --app {YOUR_APP_INSIGHTS_NAME} \
  --resource-group {YOUR_RESOURCE_GROUP} \
  --query id -o tsv
```

#### 3. 저장 및 공유

- **Save** → Workbook 이름 입력 (예: "ETF Agent Services Dashboard")
- **Share** → 팀원들과 공유 가능

---

### Option 2: Portal Dashboard 사용

전통적인 Azure Portal 대시보드를 사용합니다.

#### 1. Dashboard 파일 업데이트

`azure-dashboard.json` 파일에서 다음을 업데이트:

```json
"SubscriptionId": "YOUR_SUBSCRIPTION_ID",
"ResourceGroup": "YOUR_RESOURCE_GROUP",
"Name": "YOUR_APP_INSIGHTS_NAME"
```

#### 2. Azure CLI로 배포

```bash
# 대시보드 생성
az portal dashboard create \
  --resource-group {YOUR_RESOURCE_GROUP} \
  --name "ETF-Agent-Services-Dashboard" \
  --input-path azure-dashboard.json \
  --location eastus
```

#### 3. Portal에서 확인

1. Azure Portal → Dashboard
2. "ETF Agent - Services Dashboard" 찾기
3. 즐겨찾기에 추가

---

## 📈 대시보드에 포함된 정보

### 1. 연결된 서비스 목록
- 모든 서비스의 상태 (API Server, Cosmos DB, 외부 API 등)
- 각 서비스의 호출 횟수, 성공률, 응답시간
- 실시간 상태 표시 (✅ 정상 / ⚠️ 주의 / ❌ 오류)

### 2. Cosmos DB 모니터링
- 작업별 통계 (쿼리, 생성, 업데이트 등)
- 시간별 호출 추이
- 성능 지표 (평균, P95, 최대 응답시간)

### 3. 외부 API 모니터링
- yfinance, Alpha Vantage 등 외부 API 호출 통계
- API별 성공률 및 응답시간
- 실패 건수 추적

### 4. API 엔드포인트 성능
- 엔드포인트별 호출 통계
- HTTP 상태 코드별 분류
- 응답시간 분포

### 5. 오류 및 예외
- 최근 발생한 오류 Top 20
- 오류 타입 및 메시지
- 발생 횟수 및 최근 발생 시간

---

## 🔍 주요 KQL 쿼리

### 연결된 모든 서비스 조회

```kql
union dependencies, requests
| where timestamp > ago(1h)
| extend ServiceName = coalesce(
    cloud_RoleName,
    iff(itemType == 'dependency', target, 'API Server')
)
| summarize 
    TotalCalls = count(),
    SuccessRate = 100.0 * countif(success == true) / count()
    by ServiceName
| order by TotalCalls desc
```

### Cosmos DB 호출 통계

```kql
dependencies
| where timestamp > ago(1h)
| where type contains 'Cosmos' or target contains 'cosmos'
| summarize 
    Calls = count(),
    AvgDuration = avg(duration),
    SuccessRate = 100.0 * countif(success == true) / count()
    by target
```

### 외부 API 호출 통계

```kql
dependencies
| where timestamp > ago(1h)
| where type contains 'HTTP'
| extend ApiHost = tostring(split(target, '/')[0])
| summarize 
    Calls = count(),
    AvgDuration = avg(duration)
    by ApiHost
| order by Calls desc
```

---

## 🎯 사용 팁

### 1. 시간 범위 조정
- Workbook 상단의 시간 선택기로 조회 기간 변경
- 기본값: 1시간 (실시간 모니터링에 적합)
- 트러블슈팅: 24시간 또는 7일로 확대

### 2. 알림 설정
특정 서비스의 성공률이 낮을 때 알림 받기:

```kql
dependencies
| where timestamp > ago(5m)
| where type contains 'Cosmos'
| summarize SuccessRate = 100.0 * countif(success == true) / count()
| where SuccessRate < 95
```

### 3. 대시보드 새로고침
- Workbook: 자동 새로고침 설정 가능 (우측 상단)
- Portal Dashboard: 수동 새로고침 또는 자동 새로고침 설정

### 4. 커스터마이징
- 쿼리 수정하여 원하는 메트릭 추가
- 차트 타입 변경 (테이블, 차트, 그래프 등)
- 색상 및 임계값 조정

---

## 🔧 트러블슈팅

### 데이터가 표시되지 않을 때

1. **Application Insights 연결 확인**
   ```bash
   curl http://localhost:8000/health
   # 서버 로그에서 "Application Insights telemetry configured" 확인
   ```

2. **텔레메트리 데이터 전송 확인**
   - API 호출 몇 번 실행
   - 2-3분 후 Portal에서 Live Metrics 확인

3. **권한 확인**
   - Application Insights Reader 권한 이상 필요
   - Workbook을 저장하려면 Contributor 권한 필요

### Cosmos DB가 표시되지 않을 때

1. Azure SDK tracing이 활성화되었는지 확인:
   ```
   로그에서 "Azure SDK tracing enabled for Cosmos DB" 확인
   ```

2. Cosmos DB 호출 실행:
   ```bash
   curl http://localhost:8000/api/etf/list
   ```

3. 2-3분 후 대시보드 새로고침

---

## 📚 추가 리소스

- [Application Insights Workbooks 문서](https://learn.microsoft.com/azure/azure-monitor/visualize/workbooks-overview)
- [KQL 쿼리 참조](https://learn.microsoft.com/azure/data-explorer/kusto/query/)
- [Azure Dashboard 문서](https://learn.microsoft.com/azure/azure-portal/azure-portal-dashboards)

---

## 🎨 대시보드 스크린샷 예시

대시보드에서 확인할 수 있는 정보:

```
┌─────────────────────────────────────────────────────┐
│ ETF Agent - 연결된 서비스 모니터링                      │
├─────────────────────────────────────────────────────┤
│ 서비스별 호출 통계                                      │
│ ✅ ⚙️ API Server      | 1,250 calls | 99.5% success │
│ ✅ 🗄️ Cosmos DB       |   450 calls | 99.8% success │
│ ✅ 🌐 yfinance API    |   230 calls | 98.2% success │
│ ⚠️ 🌐 alphavantage    |    15 calls | 92.0% success │
├─────────────────────────────────────────────────────┤
│ Cosmos DB 작업별 통계                                  │
│ query_items    | 320 calls | 45ms avg | 99.9% OK   │
│ create_item    |  85 calls | 62ms avg | 100% OK    │
│ read_item      |  45 calls | 28ms avg | 100% OK    │
└─────────────────────────────────────────────────────┘
```

---

완료! 대시보드를 사용하여 ETF Agent의 모든 연결된 서비스를 실시간으로 모니터링할 수 있습니다.
