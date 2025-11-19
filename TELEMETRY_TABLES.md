# Application Insights 텔레메트리 테이블 가이드

Application Insights는 다양한 유형의 텔레메트리 데이터를 각기 다른 테이블에 저장합니다.

## 📊 테이블 구조 및 매핑

### 1. requests 테이블
**용도**: HTTP 요청 추적  
**데이터 소스**: FastAPI 자동 계측 (OpenTelemetry)  
**수집 방식**: 자동

**주요 필드**:
- `name`: HTTP 메서드 + URL (예: "GET /api/etf")
- `url`: 전체 URL
- `duration`: 요청 처리 시간 (밀리초)
- `resultCode`: HTTP 상태 코드
- `success`: 성공 여부 (true/false)
- `timestamp`: 요청 시간
- `customDimensions`: 커스텀 속성

**KQL 쿼리 예제**:
```kusto
// 최근 1시간 모든 요청
requests
| where timestamp > ago(1h)
| project timestamp, name, url, duration, resultCode, success

// 느린 요청 (500ms 이상)
requests
| where duration > 500
| order by duration desc
| take 10

// 에러 요청
requests
| where success == false
| summarize count() by resultCode, name
```

### 2. dependencies 테이블
**용도**: 외부 종속성 호출 추적  
**데이터 소스**: HTTPX, Cosmos DB, 외부 API 호출  
**수집 방식**: 자동 (OpenTelemetry 계측)

**주요 필드**:
- `name`: 호출 이름
- `type`: 종속성 유형 (HTTP, Azure Cosmos DB 등)
- `target`: 대상 서버/서비스
- `data`: 요청 데이터 (SQL 쿼리, URL 등)
- `duration`: 호출 시간 (밀리초)
- `success`: 성공 여부
- `resultCode`: 응답 코드
- `customDimensions`: 커스텀 속성

**KQL 쿼리 예제**:
```kusto
// Cosmos DB 쿼리 추적
dependencies
| where type == "Azure Cosmos DB"
| project timestamp, name, data, duration, success

// 외부 API 호출 (HTTPX)
dependencies
| where type == "HTTP"
| summarize count(), avg(duration) by target
| order by avg_duration desc

// 실패한 종속성 호출
dependencies
| where success == false
| project timestamp, name, type, target, resultCode
```

### 3. traces 테이블
**용도**: 로그 메시지 추적  
**데이터 소스**: Python logger (logger.info/warning/error)  
**수집 방식**: 자동

**주요 필드**:
- `message`: 로그 메시지
- `severityLevel`: 로그 레벨 (0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Critical)
- `timestamp`: 로그 시간
- `customDimensions`: 커스텀 속성

**KQL 쿼리 예제**:
```kusto
// 최근 에러 로그
traces
| where severityLevel >= 3  // Error 이상
| where timestamp > ago(1h)
| project timestamp, message, severityLevel

// 특정 키워드 검색
traces
| where message contains "Page view"
| project timestamp, message

// 로그 레벨별 집계
traces
| summarize count() by severityLevel
| render piechart
```

### 4. pageViews 테이블 ⭐
**용도**: 페이지 뷰 추적 (사용자 행동 분석)  
**데이터 소스**: `track_page_view()` 함수 호출  
**수집 방식**: 수동 (TelemetryClient)

**주요 필드**:
- `name`: 페이지 이름 (예: "Dashboard", "ETF List")
- `url`: 페이지 URL
- `duration`: 페이지 체류 시간 (밀리초)
- `timestamp`: 페이지 뷰 시간
- `customDimensions`: 커스텀 속성 (user_id, session_id 등)

**KQL 쿼리 예제**:
```kusto
// 페이지별 방문 횟수
pageViews
| summarize view_count = count() by name
| order by view_count desc

// 페이지별 평균 체류 시간
pageViews
| where duration > 0
| summarize avg_duration_ms = avg(duration) by name
| extend avg_duration_seconds = avg_duration_ms / 1000
| order by avg_duration_seconds desc

// 사용자별 페이지 뷰
pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where isnotnull(user_id)
| summarize 
    total_views = count(),
    unique_pages = dcount(name)
  by user_id
| order by total_views desc

// 시간대별 페이지 뷰
pageViews
| summarize view_count = count() by bin(timestamp, 1h)
| render timechart
```

### 5. customEvents 테이블 ⭐
**용도**: 사용자 이벤트 추적 (버튼 클릭, 검색 등)  
**데이터 소스**: `track_user_event()` 함수 호출  
**수집 방식**: 수동 (TelemetryClient)

**주요 필드**:
- `name`: 이벤트 이름 (예: "button_click", "search", "tab_changed")
- `timestamp`: 이벤트 발생 시간
- `customDimensions`: 이벤트 속성 (event_category, user_id 등)
- `customMeasurements`: 숫자 측정값

**KQL 쿼리 예제**:
```kusto
// 이벤트별 발생 횟수
customEvents
| summarize count() by name
| order by count_ desc

// 탭 전환 패턴
customEvents
| where name == "tab_changed"
| extend 
    from_tab = tostring(customDimensions["from_tab"]),
    to_tab = tostring(customDimensions["to_tab"])
| summarize transitions = count() by from_tab, to_tab
| order by transitions desc

// 검색 이벤트 분석
customEvents
| where name == "search"
| extend 
    query = tostring(customDimensions["query"]),
    user_id = tostring(customDimensions["user_id"])
| project timestamp, query, user_id

// 사용자별 이벤트 활동
customEvents
| extend user_id = tostring(customDimensions["user_id"])
| where isnotnull(user_id)
| summarize 
    total_events = count(),
    event_types = make_set(name)
  by user_id
| order by total_events desc
```

### 6. customMetrics 테이블
**용도**: 커스텀 메트릭 추적  
**데이터 소스**: OpenTelemetry Metrics  
**수집 방식**: 자동

**주요 필드**:
- `name`: 메트릭 이름 (예: "app.requests.total", "app.page_views.duration")
- `value`: 메트릭 값
- `valueCount`: 측정 횟수
- `valueSum`: 합계
- `valueMin`: 최소값
- `valueMax`: 최대값
- `timestamp`: 측정 시간
- `customDimensions`: 메트릭 속성

**KQL 쿼리 예제**:
```kusto
// 요청 카운터 메트릭
customMetrics
| where name == "app.requests.total"
| summarize total_requests = sum(value) by bin(timestamp, 5m)
| render timechart

// 페이지 체류 시간 분포
customMetrics
| where name == "app.page_views.duration"
| extend page_name = tostring(customDimensions["page_name"])
| summarize 
    avg_duration = avg(value),
    p50 = percentile(value, 50),
    p90 = percentile(value, 90)
  by page_name

// 에러 카운터
customMetrics
| where name == "app.errors.total"
| summarize errors = sum(value) by bin(timestamp, 1h)
| render timechart
```

### 7. exceptions 테이블
**용도**: 예외 추적  
**데이터 소스**: 예외 발생 시 자동 기록  
**수집 방식**: 자동 + 수동 (`track_exception()`)

**주요 필드**:
- `type`: 예외 타입
- `outerMessage`: 예외 메시지
- `problemId`: 문제 ID (같은 예외 그룹화)
- `severityLevel`: 심각도
- `timestamp`: 발생 시간
- `customDimensions`: 예외 발생 컨텍스트

**KQL 쿼리 예제**:
```kusto
// 최근 예외
exceptions
| where timestamp > ago(1h)
| project timestamp, type, outerMessage, problemId

// 예외 타입별 집계
exceptions
| summarize count() by type
| order by count_ desc

// 특정 엔드포인트의 예외
exceptions
| extend endpoint = tostring(customDimensions["endpoint"])
| where isnotnull(endpoint)
| summarize exceptions = count() by endpoint, type
```

### 8. browserTimings 테이블
**용도**: 브라우저 성능 메트릭  
**데이터 소스**: 프론트엔드 JavaScript SDK  
**수집 방식**: 자동 (브라우저 SDK 필요)

**주요 필드**:
- `name`: 페이지 이름
- `url`: 페이지 URL
- `networkDuration`: 네트워크 시간
- `processingDuration`: 처리 시간
- `sendDuration`: 전송 시간
- `receiveDuration`: 수신 시간
- `totalDuration`: 총 시간

**참고**: React 앱에서 Application Insights Browser SDK를 추가로 설정해야 합니다.

## 🎯 사용 패턴

### 자동 수집 (코드 변경 불필요)
- ✅ **requests**: FastAPI 엔드포인트 호출
- ✅ **dependencies**: HTTPX API 호출, Cosmos DB 쿼리
- ✅ **traces**: `logger.info()`, `logger.error()` 등
- ✅ **customMetrics**: OpenTelemetry Metrics 사용
- ✅ **exceptions**: 처리되지 않은 예외

### 수동 추적 (함수 호출 필요)
- 📝 **pageViews**: `track_page_view(name, url, properties, duration_ms)`
- 📝 **customEvents**: `track_user_event(name, properties, measurements)`
- 📝 **exceptions**: `track_exception(exception, properties)`

## 📝 코드 예제

### 페이지 뷰 추적
```python
from src.observability.telemetry import track_page_view

track_page_view(
    name="Dashboard",
    url="/dashboard",
    properties={
        "user_id": "user_123",
        "session_id": "session_abc",
    },
    duration_ms=3500
)
```

### 사용자 이벤트 추적
```python
from src.observability.telemetry import track_user_event

track_user_event(
    name="button_click",
    properties={
        "button_id": "search_btn",
        "event_category": "interaction",
        "user_id": "user_123",
    },
    measurements={
        "click_count": 1,
    }
)
```

### 예외 추적
```python
from src.observability.telemetry import track_exception

try:
    # 작업 수행
    result = risky_operation()
except Exception as e:
    track_exception(e, {
        "operation": "risky_operation",
        "user_id": "user_123",
    })
    raise
```

## 🔍 통합 분석 쿼리

### 전체 사용자 여정 (모든 테이블 조인)
```kusto
// 사용자의 전체 활동 타임라인
let user_id = "user_123";
union
  (pageViews | extend type = "PageView", detail = name),
  (customEvents | extend type = "Event", detail = name),
  (requests | extend type = "Request", detail = name),
  (exceptions | extend type = "Exception", detail = type)
| extend user = coalesce(
    tostring(customDimensions["user_id"]),
    tostring(customDimensions["event.user_id"]),
    ""
  )
| where user == user_id
| order by timestamp asc
| project timestamp, type, detail, customDimensions
```

### 성능 대시보드
```kusto
// 요청 + 종속성 성능 분석
requests
| join kind=inner (
    dependencies
    | summarize dep_duration = avg(duration) by operation_Id
  ) on operation_Id
| extend total_time = duration + dep_duration
| summarize 
    avg_request = avg(duration),
    avg_dependency = avg(dep_duration),
    avg_total = avg(total_time)
  by name
| order by avg_total desc
```

## 📌 참고사항

1. **데이터 지연**: 텔레메트리 데이터가 Application Insights에 나타나기까지 1-2분 소요
2. **샘플링**: 대량 트래픽 시 자동 샘플링 적용 가능
3. **보존 기간**: 기본 90일 (설정 변경 가능)
4. **Live Metrics**: 실시간 모니터링 (1-2초 지연)
5. **비용**: 데이터 수집량에 따라 과금 (첫 5GB/월 무료)
