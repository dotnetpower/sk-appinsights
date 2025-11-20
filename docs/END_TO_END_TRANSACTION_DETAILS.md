# End-to-End Transaction Details 가이드

## 개요

Application Insights의 **End-to-end transaction details**에서 함수 레벨까지 상세하게 추적되도록 구현했습니다.

각 HTTP 요청에 대해 다음 정보를 확인할 수 있습니다:
- 전체 트랜잭션 흐름 (Frontend → Backend → Database → External APIs)
- 각 함수의 실행 시간
- 함수 매개변수와 반환값
- 오류 발생 지점과 상세 정보

## 구현 방법

### 1. `@trace_span` 데코레이터

모든 주요 함수에 `@trace_span` 데코레이터를 적용하여 함수 레벨 추적을 활성화했습니다.

#### 코드 예시
```python
from src.observability.utils import trace_span

@trace_span(
    name="api.chat.chat",
    attributes={"endpoint": "/api/chat/", "method": "POST"}
)
async def chat(request: ChatRequest) -> ChatResponse:
    """AI 에이전트와 채팅"""
    agent = get_agent_service()
    response = await agent.chat(request.message)
    return ChatResponse(response=response)
```

#### 자동으로 기록되는 정보

1. **함수 메타데이터**
   - `code.function`: 함수명
   - `code.namespace`: 모듈 경로
   - `code.filepath`: 파일 경로
   - `code.class`: 클래스명 (메서드인 경우)

2. **함수 매개변수**
   - `function.arg0`, `function.arg1`, ... : 위치 인자
   - `function.param.{name}`: 키워드 인자
   - `function.param.{name}.type`: 복잡한 객체의 타입
   - `function.param.{name}.length`: 리스트/딕셔너리 길이

3. **실행 결과**
   - `function.duration_ms`: 실행 시간 (밀리초)
   - `function.result.type`: 반환값 타입
   - `function.result.length`: 리스트/딕셔너리 반환시 길이
   - `function.result.value`: 간단한 값의 경우 실제 반환값

4. **오류 정보** (예외 발생시)
   - `error.type`: 예외 타입
   - `error.message`: 오류 메시지
   - Exception stack trace (자동)

### 2. 적용된 주요 함수들

#### API 엔드포인트
```python
# /src/api/chat.py
@trace_span(name="api.chat.chat")
async def chat(request: ChatRequest)

@trace_span(name="api.chat.chat_stream")
async def chat_stream(request: ChatRequest)

# /src/api/etf.py
@trace_span(name="api.etf.list_etfs")
async def list_etfs(limit: int)

@trace_span(name="api.etf.get_etf_detail")
async def get_etf_detail(symbol: str)

# /src/api/stocks.py
@trace_span(name="api.stocks.search_stocks")
async def search_stocks(q: str)

@trace_span(name="api.stocks.get_stock_detail")
async def get_stock_detail(symbol: str)
```

#### 서비스 함수
```python
# /src/agent/agent_service.py
@trace_span()
async def chat(self, user_message: str)

@trace_span()
async def chat_stream(self, user_message: str)

# /src/services/yfinance_service.py
@trace_span(name="yfinance.get_etf_profile", attributes={"source": "yfinance"})
def get_etf_profile(self, symbol: str)

@trace_span(name="yfinance.get_quote", attributes={"source": "yfinance"})
def get_quote(self, symbol: str)

@trace_span(name="yfinance.get_company_profile", attributes={"source": "yfinance"})
def get_company_profile(self, symbol: str)
```

#### 데이터베이스 함수
Cosmos DB 함수들은 이미 OpenTelemetry span을 수동으로 생성하고 있습니다:
```python
# /src/services/cosmos_service.py
with tracer.start_as_current_span(
    "create_item",
    kind=trace.SpanKind.CLIENT,
    attributes={
        "db.system": "cosmosdb",
        "db.operation": "create_item",
        "peer.service": "COSMOS",
        # ... 기타 속성
    }
)
```

## End-to-End Transaction 확인 방법

### 1. Azure Portal에서 확인

#### 단계 1: Transactions 검색
1. Azure Portal → Application Insights 리소스
2. 왼쪽 메뉴 → **Transaction search** 또는 **Investigate** → **Performance**
3. 특정 요청 선택 (예: `POST /api/chat/`)

#### 단계 2: End-to-end transaction 보기
클릭한 요청에서 **View all telemetry** 또는 **End-to-end transaction details** 버튼 클릭

#### 예상 결과 구조

```
┌─────────────────────────────────────────────────┐
│ POST /api/chat/                    Duration: 15s│
├─────────────────────────────────────────────────┤
│ ├─ api.chat.chat                   Duration: 14.9s
│ │  ├─ agent.chat                   Duration: 14.8s
│ │  │  ├─ openai.chat_completion    Duration: 10s
│ │  │  ├─ yfinance.get_quote         Duration: 2s
│ │  │  │  └─ HTTP GET yfinance.com  Duration: 1.9s
│ │  │  └─ cosmos.create_item         Duration: 0.5s
│ │  │     └─ COSMOS                  Duration: 0.4s
│ │  └─ ...
└─────────────────────────────────────────────────┘
```

### 2. KQL 쿼리로 확인

#### 전체 트랜잭션 흐름 분석
```kql
let operationId = "YOUR_OPERATION_ID";  // 특정 요청의 operation_Id
union requests, dependencies, traces
| where operation_Id == operationId
| project 
    timestamp,
    itemType,
    name,
    duration,
    success,
    customDimensions
| order by timestamp asc
```

#### 함수 레벨 상세 정보
```kql
dependencies
| where timestamp > ago(1h)
| where customDimensions.['code.function'] != ""
| project 
    timestamp,
    FunctionName = customDimensions.['code.function'],
    ClassName = customDimensions.['code.class'],
    Namespace = customDimensions.['code.namespace'],
    DurationMs = customDimensions.['function.duration_ms'],
    ResultType = customDimensions.['function.result.type'],
    Error = customDimensions.['error.type']
| order by timestamp desc
```

#### API 엔드포인트별 함수 실행 통계
```kql
requests
| where timestamp > ago(1h)
| extend endpoint = customDimensions.['endpoint']
| join kind=inner (
    dependencies
    | where customDimensions.['code.function'] != ""
    | extend 
        operation_Id,
        functionName = customDimensions.['code.function'],
        functionDuration = todouble(customDimensions.['function.duration_ms'])
) on operation_Id
| summarize 
    RequestCount = count(),
    AvgRequestDuration = avg(duration),
    AvgFunctionDuration = avg(functionDuration),
    FunctionCalls = count()
    by endpoint, functionName
| order by RequestCount desc
```

#### 가장 느린 함수 찾기
```kql
dependencies
| where timestamp > ago(1h)
| where customDimensions.['code.function'] != ""
| extend 
    functionName = strcat(
        customDimensions.['code.class'], 
        ".", 
        customDimensions.['code.function']
    ),
    durationMs = todouble(customDimensions.['function.duration_ms'])
| summarize 
    CallCount = count(),
    AvgDuration = avg(durationMs),
    MaxDuration = max(durationMs),
    P95Duration = percentile(durationMs, 95)
    by functionName
| where CallCount > 10  // 최소 10번 이상 호출된 함수만
| order by AvgDuration desc
| take 20
```

#### 오류가 발생한 함수 찾기
```kql
dependencies
| where timestamp > ago(24h)
| where customDimensions.['error.type'] != ""
| extend 
    functionName = customDimensions.['code.function'],
    errorType = customDimensions.['error.type'],
    errorMessage = customDimensions.['error.message']
| summarize 
    ErrorCount = count(),
    ErrorTypes = make_set(errorType),
    SampleErrorMessage = any(errorMessage)
    by functionName
| order by ErrorCount desc
```

### 3. Live Metrics에서 실시간 확인

1. Azure Portal → Application Insights → **Live Metrics**
2. 실시간으로 다음 정보 확인:
   - Incoming Requests (초당 요청 수)
   - Overall Health (성공/실패율)
   - Sample Telemetry (함수 호출 포함)
   - Dependencies (Cosmos DB, External APIs)

3. 필터 적용:
   - `customDimensions.code.function` 으로 특정 함수만 필터링
   - `customDimensions.error.type` 으로 오류만 필터링

## 성능 최적화 팁

### 1. 함수 레벨 추적 범위 조정

너무 많은 함수를 추적하면 오버헤드가 발생할 수 있습니다. 다음 우선순위로 추적:

**높은 우선순위 (필수 추적)**
- API 엔드포인트
- 외부 API 호출 함수
- 데이터베이스 쿼리 함수
- 느린 작업 (AI 모델 호출 등)

**중간 우선순위**
- 비즈니스 로직 핵심 함수
- 복잡한 데이터 처리 함수

**낮은 우선순위 (선택적)**
- 단순 유틸리티 함수
- 빠른 getter/setter

### 2. Span 속성 크기 제한

```python
# 긴 문자열은 자동으로 200자로 제한됨
@trace_span()
async def process_data(large_text: str):
    # large_text가 1000자여도 속성에는 앞 200자만 저장됨
    pass
```

### 3. Sampling 설정

대량 트래픽 환경에서는 sampling 비율 조정:

```python
# /src/observability/telemetry.py
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

configure_azure_monitor(
    connection_string=connection_string,
    enable_live_metrics=True,
    resource=resource,
    # 50% 샘플링 (프로덕션 환경)
    sampler=TraceIdRatioBased(0.5)
)
```

## 문제 해결

### 함수 추적이 표시되지 않는 경우

1. **데코레이터 확인**
   ```python
   # ❌ 잘못된 사용
   @trace_span
   async def my_function():
       pass
   
   # ✅ 올바른 사용
   @trace_span()
   async def my_function():
       pass
   ```

2. **import 확인**
   ```python
   from src.observability.utils import trace_span
   ```

3. **텔레메트리 초기화 확인**
   ```python
   # main.py에서 setup_telemetry() 호출 확인
   setup_telemetry(app)
   ```

### 속성이 너무 많아서 보기 힘든 경우

KQL에서 필요한 속성만 선택:
```kql
dependencies
| where customDimensions.['code.function'] != ""
| project 
    timestamp,
    name,
    duration,
    Function = customDimensions.['code.function'],
    DurationMs = customDimensions.['function.duration_ms'],
    ResultType = customDimensions.['function.result.type']
```

## 베스트 프랙티스

### 1. 의미 있는 Span 이름 사용
```python
# ✅ 좋은 예
@trace_span(name="api.stocks.get_quote")
async def get_stock_quote(symbol: str):
    pass

# ❌ 나쁜 예
@trace_span(name="function1")
async def get_stock_quote(symbol: str):
    pass
```

### 2. 커스텀 속성 활용
```python
@trace_span(attributes={
    "data_source": "yfinance",
    "cache_enabled": "true"
})
async def fetch_stock_data(symbol: str):
    pass
```

### 3. SpanKind 명시
```python
from opentelemetry.trace import SpanKind

# 외부 API 호출
@trace_span(kind=SpanKind.CLIENT)
async def call_external_api():
    pass

# 내부 함수 (기본값)
@trace_span(kind=SpanKind.INTERNAL)
async def process_internal():
    pass
```

### 4. 오류 처리
```python
@trace_span()
async def risky_operation():
    try:
        # 작업 수행
        result = await external_api_call()
        return result
    except Exception as e:
        # trace_span이 자동으로 예외를 기록하지만
        # 추가 컨텍스트를 원한다면:
        logger.error(f"Operation failed: {e}", exc_info=True)
        raise
```

## 참고 자료

- [OpenTelemetry Python Tracing](https://opentelemetry.io/docs/instrumentation/python/manual/)
- [Azure Monitor OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)
- [Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [Application Insights Transaction Diagnostics](https://learn.microsoft.com/azure/azure-monitor/app/transaction-diagnostics)
