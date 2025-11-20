# Application Map 설정 가이드

## 개요

Application Insights의 Application Map에 Frontend, Backend, Cosmos DB가 연결되어 표시되도록 설정하는 방법입니다.

## Architecture

```
┌──────────────────────┐
│  Browser (Frontend)  │
│   React App          │
└──────────┬───────────┘
           │ HTTP + 추적 헤더
           ▼
┌──────────────────────┐
│     etf-agent        │
│   (Backend API)      │
│   FastAPI            │
└──────────┬───────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│     COSMOS       │  │  External APIs   │
│  (Cosmos DB)     │  │  (yfinance 등)   │
└──────────────────┘  └──────────────────┘
```

## 1. Frontend 설정 (React)

### `/frontend/src/services/api.ts`

```typescript
// Request Interceptor: 추적 헤더 추가
api.interceptors.request.use((config) => {
  // Operation ID 생성
  const operationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // W3C Trace Context 표준 헤더
  config.headers['traceparent'] = `00-${operationId.padEnd(32, '0')}-${operationId.substr(0, 16).padEnd(16, '0')}-01`;
  
  // Application Insights 호환 헤더
  config.headers['Request-Id'] = `|${operationId}.`;
  config.headers['Request-Context'] = 'appId=cid-v1:etf-agent-frontend';
  
  return config;
});
```

### 주요 헤더

1. **traceparent**: W3C Trace Context 표준 (OpenTelemetry)
   - 형식: `00-<trace-id>-<span-id>-<flags>`

2. **Request-Id**: Application Insights 레거시 헤더
   - 형식: `|<operation-id>.`

3. **Request-Context**: 클라이언트 식별
   - 형식: `appId=cid-v1:<app-name>`

## 2. Backend 설정 (FastAPI)

### `/src/observability/middleware.py`

```python
async def dispatch(self, request: Request, call_next: Callable) -> Response:
    # 추적 헤더 추출
    traceparent = request.headers.get("traceparent")
    request_id = request.headers.get("request-id")
    request_context = request.headers.get("request-context")
    
    # Span에 추가
    with tracer.start_as_current_span(
        span_name,
        kind=trace.SpanKind.SERVER
    ) as span:
        if traceparent:
            span.set_attribute("http.traceparent", traceparent)
        
        if request_context and "frontend" in request_context.lower():
            span.set_attribute("client.type", "etf-agent-frontend")
```

### 주요 속성

- **kind=SpanKind.SERVER**: 서버 요청임을 명시
- **client.type**: 클라이언트 타입 식별
- **http.traceparent**: 분산 추적 ID

## 3. Cosmos DB 설정

### `/src/services/cosmos_service.py`

```python
with tracer.start_as_current_span(
    "create_item",
    kind=trace.SpanKind.CLIENT,
    attributes={
        "db.system": "cosmosdb",
        "db.operation": "create_item",
        "peer.service": "COSMOS",  # ← Application Map에 표시될 이름
        "component": "cosmosdb",
        "az.namespace": "Microsoft.DocumentDB",
    }
) as span:
    # Cosmos DB 작업
```

### 주요 속성

- **peer.service**: Application Map에서 dependency 이름
- **db.system**: 데이터베이스 시스템 타입
- **az.namespace**: Azure 서비스 네임스페이스

## 4. 테스트 방법

### Backend 서버 시작
```bash
cd /home/dotnetpower/dev/sk-appinsights
source .venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend 개발 서버 시작
```bash
cd frontend
npm start
```

### 테스트 스크립트 실행
```bash
python test_frontend_backend_map.py
```

## 5. Application Insights 확인

### Application Map 보기

1. Azure Portal → Application Insights 리소스
2. 왼쪽 메뉴 → **Application map**
3. 다음 노드와 연결 확인:
   - Browser/Frontend
   - etf-agent (Backend)
   - COSMOS (Cosmos DB)
   - External APIs

### KQL 쿼리로 확인

#### Frontend → Backend 요청 확인
```kql
requests
| where timestamp > ago(1h)
| where customDimensions.['http.request_context'] contains 'frontend'
| project 
    timestamp, 
    name, 
    url, 
    duration, 
    success,
    request_id = customDimensions.['http.request_id'],
    client_type = customDimensions.['client.type']
| order by timestamp desc
```

#### End-to-End 트랜잭션 추적
```kql
requests
| where timestamp > ago(1h)
| extend operation_Id
| join kind=inner (
    dependencies
    | extend operation_Id
) on operation_Id
| project 
    timestamp,
    RequestName = name,
    DependencyName = name1,
    DependencyTarget = target,
    RequestDuration = duration,
    DependencyDuration = duration1,
    Success = success and success1
| order by timestamp desc
```

#### Cosmos DB 호출 확인
```kql
dependencies
| where timestamp > ago(1h)
| where target == 'COSMOS'
| summarize 
    Count = count(),
    AvgDuration = avg(duration),
    SuccessRate = round(100.0 * countif(success) / count(), 2)
    by name, operation_Name
| order by Count desc
```

## 6. 문제 해결

### Application Map에 Frontend가 표시되지 않는 경우

1. **헤더 확인**
   - 브라우저 개발자 도구 → Network 탭
   - API 요청의 Headers 확인
   - `traceparent`, `Request-Id`, `Request-Context` 존재 확인

2. **Backend 로그 확인**
   ```bash
   # Backend 서버 로그에서 헤더 수신 확인
   📡 Received traceparent: ...
   📡 Received Request-Id: ...
   📡 Received Request-Context: ...
   ```

3. **CORS 설정 확인**
   - `/src/main.py`의 CORS 설정 확인
   - `allow_headers=["*"]` 포함 확인

### Application Map에 COSMOS가 표시되지 않는 경우

1. **Span 속성 확인**
   ```python
   # peer.service가 설정되어 있는지 확인
   span.set_attribute("peer.service", "COSMOS")
   ```

2. **Dependencies 테이블 확인**
   ```kql
   dependencies
   | where timestamp > ago(1h)
   | where target == 'COSMOS'
   | take 10
   ```

3. **Azure SDK Tracing 확인**
   - Backend 시작 로그에서 다음 메시지 확인:
   ```
   ✅ Azure SDK tracing enabled → dependencies 테이블 (Cosmos DB → COSMOS)
   ```

## 7. 베스트 프랙티스

### 1. Operation ID 생성
- 각 요청마다 고유한 ID 생성
- 타임스탬프 + 랜덤 값 조합 사용
- 32자리 이상 유지 (trace-id 표준)

### 2. 헤더 전파
- 모든 외부 API 호출에 헤더 전파
- Axios interceptor 사용 (Frontend)
- HTTPX client 사용 (Backend)

### 3. Span 계층 구조
```
Request (Server Span)
├── Database Query (Client Span) → COSMOS
├── External API Call (Client Span) → yfinance
└── Internal Processing (Internal Span)
```

### 4. 속성 일관성
- 동일한 서비스는 동일한 `peer.service` 사용
- 표준 semantic conventions 준수
- 민감한 정보는 속성에 포함하지 않음

## 8. 참고 문서

- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Application Insights Distributed Tracing](https://learn.microsoft.com/azure/azure-monitor/app/distributed-tracing)
- [Azure Monitor OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)

## 9. 환경변수

필수 환경변수:
```bash
# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=..."

# Cosmos DB
COSMOS_ENDPOINT="https://your-cosmos.documents.azure.com:443/"
COSMOS_DATABASE_NAME="etf-agent"
COSMOS_CONTAINER_NAME="etf-data"
```
