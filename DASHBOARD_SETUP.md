# Application Insights 대시보드 설정 가이드

이 문서는 ETF Agent 애플리케이션의 모든 연결된 서비스를 모니터링하기 위한 Azure Portal 대시보드 및 Workbook 설정 방법을 설명합니다.

## 📊 대시보드 개요

Application Insights는 두 가지 유형의 대시보드를 제공합니다:

### 1. **Workbook** (추천 ⭐)
- 대화형 리포트 및 분석
- 매개변수화된 쿼리 지원
- 다양한 시각화 옵션
- 팀 공유 및 협업 기능
- 실시간 데이터 필터링

### 2. **Portal Dashboard**
- 전통적인 타일 기반 대시보드
- 고정된 쿼리 및 차트
- 간단한 설정
- Azure Portal 홈에 고정 가능

### 프로젝트에 포함된 파일

```
├── azure-dashboard.json          # Portal Dashboard 템플릿
├── azure-dashboard.example.json  # 설정 예시
├── azure-workbook.json           # Workbook 템플릿 (추천)
└── azure-workbook.example.json   # 설정 예시
```

## 🚀 설정 방법

### Option 1: Workbook 사용 (추천)

Workbook은 더 강력한 분석 기능과 대화형 쿼리를 제공합니다.

#### 1. Azure Portal에서 Workbook 생성

```bash
# 1. Azure Portal 접속
# https://portal.azure.com

# 2. 네비게이션
Application Insights 리소스 선택
→ 왼쪽 메뉴 "Monitoring" 섹션
→ "Workbooks" 클릭
→ "+ New" 또는 "Empty Workbook" 클릭
```

#### 2. Workbook JSON 가져오기

```bash
# 1. Workbook 편집 모드에서
우측 상단 "Advanced Editor" 버튼 (</> 아이콘) 클릭

# 2. 템플릿 내용 복사
cat azure-workbook.json | pbcopy  # Mac
cat azure-workbook.json | xclip   # Linux

# 3. JSON 붙여넣기
전체 내용 선택 → 삭제 → 복사한 내용 붙여넣기

# 4. Apply 클릭
```

#### 3. 리소스 ID 업데이트

Workbook JSON의 `fallbackResourceIds` 섹션을 실제 Application Insights 리소스 ID로 업데이트:

```json
{
  "fallbackResourceIds": [
    "/subscriptions/{YOUR_SUBSCRIPTION_ID}/resourceGroups/{YOUR_RESOURCE_GROUP}/providers/microsoft.insights/components/{YOUR_APP_INSIGHTS_NAME}"
  ]
}
```

**리소스 ID 확인 방법**:

```bash
# 방법 1: Azure CLI
az monitor app-insights component show \
  --app {YOUR_APP_INSIGHTS_NAME} \
  --resource-group {YOUR_RESOURCE_GROUP} \
  --query id -o tsv

# 방법 2: Azure Portal
Application Insights 리소스 → "Properties" → "Resource ID" 복사

# 출력 예시:
# /subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/etf-agent-rg/providers/microsoft.insights/components/etf-agent-ai
```

#### 4. Workbook 저장 및 공유

```bash
# 1. 저장
"Done Editing" → "Save" 클릭
→ Title: "ETF Agent - Services Dashboard"
→ Subscription, Resource Group 선택
→ "Apply" 클릭

# 2. 공유 (선택)
"Share" 버튼 → 팀원들에게 링크 공유
또는 "Pin to dashboard" → Azure Portal 홈에 고정
```

---

### Option 2: Portal Dashboard 사용

전통적인 Azure Portal 대시보드를 사용하는 방법입니다.

#### 1. Dashboard JSON 파일 준비

`azure-dashboard.json` 파일에서 다음 값을 실제 값으로 업데이트:

```json
{
  "properties": {
    "lenses": {
      "0": {
        "parts": {
          "0": {
            "metadata": {
              "inputs": [{
                "name": "ComponentId",
                "value": {
                  "SubscriptionId": "YOUR_SUBSCRIPTION_ID",
                  "ResourceGroup": "YOUR_RESOURCE_GROUP",
                  "Name": "YOUR_APP_INSIGHTS_NAME"
                }
              }]
            }
          }
        }
      }
    }
  }
}
```

**모든 항목 업데이트**:
- `YOUR_SUBSCRIPTION_ID`: Azure 구독 ID
- `YOUR_RESOURCE_GROUP`: 리소스 그룹 이름
- `YOUR_APP_INSIGHTS_NAME`: Application Insights 리소스 이름

#### 2. Azure CLI로 배포

```bash
# Dashboard 생성
az portal dashboard create \
  --resource-group {YOUR_RESOURCE_GROUP} \
  --name "ETF-Agent-Services-Dashboard" \
  --input-path azure-dashboard.json \
  --location eastus

# 성공 메시지 확인
# Dashboard 'ETF-Agent-Services-Dashboard' created successfully
```

#### 3. Portal에서 확인

```bash
# Azure Portal → "Dashboard" (왼쪽 메뉴)
# → "Browse all dashboards"
# → "ETF Agent - Services Dashboard" 선택
# → ⭐ 즐겨찾기에 추가
```

---

## 📈 대시보드에 포함된 정보

### 1. 📊 연결된 서비스 목록

**표시 정보**:
- 모든 종속성 서비스 (Cosmos DB, 외부 API 등)
- 각 서비스의 호출 횟수
- 성공률 (Success Rate)
- 평균 응답 시간
- 실시간 상태 표시

**예시 출력**:
```
Service Name       | Calls  | Success Rate | Avg Duration
-------------------|--------|--------------|-------------
API Server         | 1,250  | 99.5%        | 125ms
Cosmos DB          |   450  | 99.8%        | 45ms
yfinance API       |   230  | 98.2%        | 850ms
alphavantage API   |    15  | 92.0%        | 1,200ms
```

**KQL 쿼리**:
```kusto
union dependencies, requests
| where timestamp > ago(1h)
| extend ServiceName = coalesce(
    cloud_RoleName,
    iff(itemType == 'dependency', target, 'API Server')
  )
| summarize 
    TotalCalls = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2)
  by ServiceName
| order by TotalCalls desc
```

### 2. 🗄️ Cosmos DB 모니터링

**표시 정보**:
- 작업별 통계 (query_items, create_item, read_item, upsert_item)
- 시간별 호출 추이 차트
- 성능 지표 (평균, P50, P90, P95, 최대)
- 에러율 및 실패 건수

**KQL 쿼리**:
```kusto
dependencies
| where timestamp > ago(1h)
| where type == "Azure Cosmos DB" or target contains "cosmos"
| extend Operation = tostring(customDimensions["db.operation"])
| summarize 
    Calls = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2),
    P50Duration = round(percentile(duration, 50), 2),
    P95Duration = round(percentile(duration, 95), 2),
    MaxDuration = round(max(duration), 2)
  by Operation, target
| order by Calls desc
```

### 3. 🌐 외부 API 모니터링

**추적 대상**:
- yfinance (Yahoo Finance)
- Alpha Vantage
- TotalRealReturns
- 기타 HTTP 호출

**표시 정보**:
- API 호스트별 통계
- 호출 빈도 및 성공률
- 응답 시간 분포
- 타임아웃 및 에러 추적

**KQL 쿼리**:
```kusto
dependencies
| where timestamp > ago(1h)
| where type == "HTTP"
| extend ApiHost = tostring(split(target, '/')[0])
| summarize 
    Calls = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2),
    FailedCalls = countif(success == false)
  by ApiHost
| order by Calls desc
```

### 4. 🚀 API 엔드포인트 성능

**표시 정보**:
- FastAPI 엔드포인트별 통계 (/api/etf, /api/chat, /api/news 등)
- HTTP 메서드별 분류 (GET, POST)
- 상태 코드별 집계 (200, 404, 500)
- 응답 시간 P50, P90, P95

**KQL 쿼리**:
```kusto
requests
| where timestamp > ago(1h)
| summarize 
    RequestCount = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2),
    P90Duration = round(percentile(duration, 90), 2)
  by name, resultCode
| order by RequestCount desc
| take 20
```

### 5. ❌ 오류 및 예외 추적

**표시 정보**:
- 최근 발생한 예외 Top 20
- 예외 타입 및 메시지
- 발생 횟수 (Count)
- 최근 발생 시간 (Last Occurrence)
- 영향받은 엔드포인트

**KQL 쿼리**:
```kusto
exceptions
| where timestamp > ago(24h)
| extend endpoint = tostring(customDimensions["endpoint"])
| summarize 
    Count = count(),
    LastOccurrence = max(timestamp),
    SampleMessage = any(outerMessage)
  by type, endpoint
| order by Count desc
| take 20
```

### 6. 📄 사용자 행동 분석

**표시 정보**:
- 페이지별 방문 통계
- 사용자별 활동 패턴
- 이벤트별 집계 (검색, 클릭 등)
- 세션 분석

**KQL 쿼리**:
```kusto
// 페이지별 방문 횟수
pageViews
| where timestamp > ago(24h)
| summarize 
    ViewCount = count(),
    UniqueUsers = dcount(tostring(customDimensions["user_id"]))
  by name
| order by ViewCount desc

// 사용자 이벤트 Top 10
customEvents
| where timestamp > ago(24h)
| summarize EventCount = count() by name
| order by EventCount desc
| take 10
```

---

## 🔍 주요 KQL 쿼리 모음

### 시간대별 트래픽 분석

```kusto
requests
| where timestamp > ago(24h)
| summarize RequestCount = count() by bin(timestamp, 1h)
| render timechart
```

### 느린 요청 Top 10

```kusto
requests
| where timestamp > ago(1h)
| where duration > 1000  // 1초 이상
| order by duration desc
| take 10
| project timestamp, name, duration, resultCode, url
```

### 에러율 추이

```kusto
requests
| where timestamp > ago(24h)
| summarize 
    TotalRequests = count(),
    FailedRequests = countif(success == false)
  by bin(timestamp, 30m)
| extend ErrorRate = round(100.0 * FailedRequests / TotalRequests, 2)
| render timechart
```

### 의존성 성공률 모니터링

```kusto
dependencies
| where timestamp > ago(1h)
| summarize 
    TotalCalls = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2)
  by target, type
| where SuccessRate < 95  // 95% 미만 경고
| order by TotalCalls desc
```

---

## 🎯 사용 팁

### 1. 시간 범위 조정

**Workbook**:
- 상단 Time Range 선택기 사용
- Custom 범위 설정 가능
- 자동 새로고침 설정 (5초 ~ 1일)

**Portal Dashboard**:
- 각 타일별로 시간 범위 조정
- 전역 시간 범위 필터 사용

**권장 설정**:
- 실시간 모니터링: 1시간
- 일일 리뷰: 24시간
- 주간 분석: 7일
- 트러블슈팅: 사용자 정의

### 2. 알림 설정

특정 조건에서 알림을 받도록 설정:

```kusto
// Cosmos DB 성공률 95% 미만
dependencies
| where timestamp > ago(5m)
| where type == "Azure Cosmos DB"
| summarize SuccessRate = 100.0 * countif(success == true) / count()
| where SuccessRate < 95

// API 응답시간 1초 초과
requests
| where timestamp > ago(5m)
| where duration > 1000
| summarize SlowRequests = count()
| where SlowRequests > 10
```

**Alert Rule 생성**:
```bash
# Azure Portal
Application Insights → Alerts → + New alert rule
→ Condition: Custom log search
→ Query: 위 KQL 쿼리 입력
→ Threshold: 임계값 설정
→ Action: Email, SMS, Webhook 등
```

### 3. 대시보드 커스터마이징

**Workbook 편집**:
- "Edit" 버튼 → 쿼리 수정
- "+ Add" → 새로운 섹션 추가
- 차트 타입 변경 (Table, Bar, Line, Pie 등)
- 색상 임계값 설정 (녹색/노란색/빨간색)

**Portal Dashboard 편집**:
- "Edit" 버튼 → 타일 추가/제거
- 타일 크기 조정 (드래그)
- 새로운 쿼리 차트 고정

### 4. 성능 최적화

**쿼리 최적화**:
```kusto
// ❌ 느림 - 전체 스캔
dependencies
| where target contains "cosmos"

// ✅ 빠름 - 인덱싱된 필드 사용
dependencies
| where type == "Azure Cosmos DB"
```

**캐싱 활용**:
- Workbook에서 쿼리 결과 캐싱 설정
- 자주 사용하는 쿼리는 함수로 저장

---

## 🔧 트러블슈팅

### 데이터가 표시되지 않을 때

**1. Application Insights 연결 확인**:
```bash
# 서버 로그 확인
tail -f /var/log/etf-agent.log | grep "Application Insights"

# 예상 출력:
# ✅ Application Insights telemetry configured with Live Metrics enabled
# 📊 Connection String: InstrumentationKey=e01bf28e...
```

**2. 텔레메트리 데이터 전송 확인**:
```bash
# API 호출하여 데이터 생성
curl http://localhost:8000/api/etf
curl http://localhost:8000/api/news
curl http://localhost:8000/api/stocks/AAPL

# 2-3분 대기 후 Live Metrics에서 확인
# Azure Portal → Application Insights → Live Metrics
```

**3. 권한 확인**:
- **최소 권한**: Application Insights Reader
- **Workbook 저장**: Application Insights Contributor
- **Alert 생성**: Monitoring Contributor

### Cosmos DB가 표시되지 않을 때

**1. Azure SDK Tracing 활성화 확인**:
```python
# src/observability/telemetry.py
# 다음 로그 메시지가 있어야 함:
# ✅ Azure SDK tracing enabled → dependencies 테이블 (Cosmos DB)
```

**2. Cosmos DB 호출 생성**:
```bash
# Cosmos DB를 사용하는 API 호출
curl http://localhost:8000/api/etf/list
curl http://localhost:8000/api/stocks/cache

# 2-3분 후 다음 쿼리 실행:
dependencies
| where type == "Azure Cosmos DB"
| take 10
```

**3. Connection String 확인**:
```bash
# .env 파일
COSMOS_ENDPOINT="https://xxx.documents.azure.com:443/"
COSMOS_KEY="your-key"
```

### 외부 API 호출이 표시되지 않을 때

**1. HTTPX Instrumentation 확인**:
```python
# 서버 로그에서 확인:
# ✅ HTTPX instrumented → dependencies 테이블
```

**2. 외부 API 호출 테스트**:
```bash
# yfinance API를 사용하는 엔드포인트 호출
curl http://localhost:8000/api/stocks/AAPL

# dependencies 테이블 확인:
dependencies
| where type == "HTTP"
| where target contains "yahoo" or target contains "alphavantage"
```

### Workbook이 저장되지 않을 때

**오류 메시지**: "You don't have permission to save this workbook"

**해결 방법**:
1. Azure Portal → Subscriptions → Access Control (IAM)
2. "+ Add role assignment"
3. Role: "Application Insights Component Contributor"
4. Member: 본인 계정
5. "Review + assign"

---

## 📚 추가 리소스

### 공식 문서
- [Application Insights Workbooks](https://learn.microsoft.com/azure/azure-monitor/visualize/workbooks-overview)
- [KQL (Kusto Query Language)](https://learn.microsoft.com/azure/data-explorer/kusto/query/)
- [Azure Portal Dashboards](https://learn.microsoft.com/azure/azure-portal/azure-portal-dashboards)
- [Application Insights Alerts](https://learn.microsoft.com/azure/azure-monitor/alerts/alerts-overview)

### 프로젝트 문서
- [텔레메트리 테이블 가이드](./TELEMETRY_TABLES.md) - 각 테이블 스키마 및 쿼리
- [Live Metrics 가이드](./LIVE_METRICS_GUIDE.md) - 실시간 모니터링
- [사용자 행동 분석 가이드](./USER_BEHAVIOR_ANALYTICS.md) - 코호트 분석 및 전환 깔때기

### 외부 리소스
- [KQL Cheat Sheet](https://github.com/marcusbakker/KQL)
- [Application Insights Best Practices](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview)

---

## 🎨 대시보드 예시 화면

### Workbook 예시

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 ETF Agent - 연결된 서비스 모니터링                              │
│                                                                 │
│ ⏰ Time Range: Last 1 hour    🔄 Auto-refresh: 30 seconds      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📊 서비스별 호출 통계                                             │
│ ┌───────────────┬────────┬──────────┬──────────┬────────────┐  │
│ │ Service       │ Calls  │ Success  │ Avg Time │ Status     │  │
│ ├───────────────┼────────┼──────────┼──────────┼────────────┤  │
│ │ ⚙️  API Server │ 1,250  │  99.5%   │  125ms   │ ✅ Healthy │  │
│ │ 🗄️  Cosmos DB  │   450  │  99.8%   │   45ms   │ ✅ Healthy │  │
│ │ 🌐 yfinance    │   230  │  98.2%   │  850ms   │ ✅ Healthy │  │
│ │ 🌐 alphavant   │    15  │  92.0%   │ 1,200ms  │ ⚠️  Warning│  │
│ └───────────────┴────────┴──────────┴──────────┴────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🗄️ Cosmos DB 작업별 통계                                         │
│ ┌─────────────┬───────┬──────────┬─────────┬─────────┬───────┐ │
│ │ Operation   │ Calls │ Success  │ Avg     │ P95     │ Max   │ │
│ ├─────────────┼───────┼──────────┼─────────┼─────────┼───────┤ │
│ │ query_items │  320  │  99.9%   │  45ms   │  80ms   │ 120ms │ │
│ │ create_item │   85  │ 100.0%   │  62ms   │  95ms   │ 150ms │ │
│ │ read_item   │   45  │ 100.0%   │  28ms   │  45ms   │  60ms │ │
│ └─────────────┴───────┴──────────┴─────────┴─────────┴───────┘ │
│                                                                 │
│ 📈 [시간별 호출 추이 차트]                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ❌ 최근 오류 (Last 24h)                                          │
│ • HTTPException: /api/chat (Count: 5, Last: 2m ago)           │
│ • ValueError: /api/stocks (Count: 2, Last: 15m ago)           │
│ • TimeoutError: yfinance API (Count: 1, Last: 45m ago)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ 체크리스트

대시보드 설정 완료 확인:

- [ ] Workbook 또는 Portal Dashboard 생성
- [ ] 리소스 ID 업데이트
- [ ] 모든 서비스 데이터 표시 확인
- [ ] Cosmos DB 호출 추적 확인
- [ ] 외부 API 호출 추적 확인
- [ ] 시간 범위 및 새로고침 설정
- [ ] Alert Rule 설정 (선택사항)
- [ ] 팀원들과 공유 (선택사항)

---

완료! 이제 ETF Agent의 모든 연결된 서비스를 실시간으로 모니터링할 수 있습니다. 🎉
