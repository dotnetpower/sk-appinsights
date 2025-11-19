# Live Metrics 가이드

Application Insights Live Metrics는 애플리케이션의 실시간 성능과 상태를 모니터링하는 강력한 도구입니다. 이 문서는 ETF Agent 프로젝트에서 Live Metrics를 설정하고 활용하는 방법을 설명합니다.

## 📊 Live Metrics란?

Live Metrics는 **1-2초 지연**으로 애플리케이션의 실시간 텔레메트리를 제공합니다:
- 실시간 요청 처리 현황
- 서버 성능 메트릭 (CPU, 메모리)
- 커스텀 메트릭 및 로그
- 의존성 호출 추적
- 예외 및 에러 실시간 감지

**일반 Application Insights Logs (1-2분 지연)** vs **Live Metrics (1-2초 지연)**

## 🎯 구현 개선 사항

### 1. **리소스 속성 설정**

서비스 정보를 Live Metrics에 표시하여 여러 환경을 구분할 수 있습니다.

```python
# src/observability/telemetry.py
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "etf-agent",
    "service.version": "0.1.0",
    "deployment.environment": os.getenv("ENVIRONMENT", "development"),
})

configure_azure_monitor(
    connection_string=connection_string,
    enable_live_metrics=True,  # Live Metrics 활성화
    resource=resource,
)
```

**효과**:
- Live Metrics "Servers" 섹션에 서비스 정보 표시
- 환경별 필터링 가능 (development, staging, production)
- 버전별 성능 비교

### 2. **커스텀 메트릭 추가**

OpenTelemetry Metrics API를 사용하여 비즈니스 메트릭을 실시간으로 추적합니다.

```python
# src/observability/telemetry.py
from opentelemetry import metrics

_meter = metrics.get_meter("etf-agent.metrics")

# 요청 카운터 → Live Metrics "Custom Metrics"
_request_counter = _meter.create_counter(
    name="app.requests.total",
    description="Total number of requests",
    unit="1",
)

# 요청 처리 시간 히스토그램
_request_duration = _meter.create_histogram(
    name="app.requests.duration",
    description="Request duration in milliseconds",
    unit="ms",
)

# 에러 카운터
_error_counter = _meter.create_counter(
    name="app.errors.total",
    description="Total number of errors",
    unit="1",
)

# 페이지 뷰 카운터 (사용자 행동 분석)
_page_view_counter = _meter.create_counter(
    name="app.page_views.total",
    description="Total number of page views",
    unit="1",
)

# 페이지 체류 시간
_page_duration_histogram = _meter.create_histogram(
    name="app.page_views.duration",
    description="Page view duration in seconds",
    unit="s",
)

# 사용자 이벤트 카운터
_user_event_counter = _meter.create_counter(
    name="app.user_events.total",
    description="Total number of user events",
    unit="1",
)
```

**메트릭 기록**:
```python
# 요청 처리 시
_request_counter.add(1, {
    "endpoint": "/api/etf",
    "method": "GET",
    "status_code": "200"
})
_request_duration.record(125.5, {
    "endpoint": "/api/etf"
})

# 에러 발생 시
_error_counter.add(1, {
    "error_type": "HTTPException",
    "endpoint": "/api/chat"
})
```

### 3. **향상된 HTTP 요청 추적**

미들웨어를 통해 모든 HTTP 요청의 상세 정보를 수집합니다.

```python
# src/observability/middleware.py
class TracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        with tracer.start_as_current_span(f"{request.method} {request.url.path}") as span:
            # 요청 메타데이터
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", str(request.url))
            span.set_attribute("http.path", request.url.path)
            span.set_attribute("http.query_string", str(request.query_params))
            
            # 클라이언트 정보
            if request.client:
                span.set_attribute("http.client.host", request.client.host)
            
            # 요청 처리
            start_time = time.time()
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000
            
            # 응답 정보
            span.set_attribute("http.status_code", response.status_code)
            span.set_attribute("http.duration_ms", duration_ms)
            
            # Live Metrics 로그
            logger.info(f"⚡ {request.method} {request.url.path} | "
                       f"Status: {response.status_code} | Duration: {duration_ms:.2f}ms")
            
            return response
```

### 4. **에러 추적 강화**

예외 발생 시 자동으로 exceptions 테이블과 Live Metrics에 기록됩니다.

```python
# 자동 예외 추적
try:
    response = await call_next(request)
except Exception as e:
    # OpenTelemetry span에 예외 기록 → exceptions 테이블
    span.record_exception(e)
    
    # TelemetryClient로 예외 추적 → Live Metrics
    track_exception(e, {
        "endpoint": request.url.path,
        "method": request.method,
    })
    raise
```

## 🖥️ Live Metrics에서 확인 가능한 정보

### 📊 **Incoming Requests** (실시간 요청)
- **Request Rate**: 초당 요청 수 (req/sec)
- **Request Duration**: 평균/최소/최대 응답 시간
- **Success Rate**: 성공 요청 비율 (2xx, 3xx)
- **Failed Requests**: 실패 요청 수 (4xx, 5xx)

**확인 예시**:
```
15 requests/sec
Average duration: 250ms
Success: 93%
Failed: 1 request (404 Not Found)
```

### 🏥 **Overall Health** (서버 상태)
- **CPU Usage**: CPU 사용률 (%)
- **Memory Usage**: 메모리 사용량 (MB)
- **Process CPU**: 프로세스별 CPU 사용률
- **Committed Memory**: 커밋된 메모리

**확인 예시**:
```
CPU: 12%
Memory: 245 MB
```

### 🖥️ **Servers** (서버 정보)
- **Service Name**: etf-agent
- **Version**: 0.1.0
- **Environment**: development / production
- **Instance Count**: 활성 인스턴스 수

### 📈 **Custom Metrics** (커스텀 메트릭)

실시간으로 수집되는 비즈니스 메트릭:

1. **app.requests.total**
   - 총 요청 수
   - 차원: endpoint, method, status_code
   - 예: `GET /api/etf` → 50 requests

2. **app.requests.duration**
   - 요청 처리 시간 분포
   - 차원: endpoint
   - 예: `/api/etf` → avg 150ms, p90 300ms

3. **app.errors.total**
   - 에러 발생 횟수
   - 차원: error_type, endpoint
   - 예: `HTTPException` → 3 errors

4. **app.page_views.total**
   - 페이지 뷰 수
   - 차원: page_name, user_id
   - 예: `Dashboard` → 25 views

5. **app.page_views.duration**
   - 페이지 체류 시간
   - 차원: page_name
   - 예: `Dashboard` → avg 45s

6. **app.user_events.total**
   - 사용자 이벤트 수
   - 차원: event_name, event_category
   - 예: `search` → 12 events

### 🔍 **Sample Telemetry** (샘플 텔레메트리)

실시간 요청 샘플 (최근 100개):
- **Request**: `GET /api/etf?limit=10`
- **Duration**: 125ms
- **Result**: 200 OK
- **Dependencies**: yfinance API (80ms)
- **Custom Dimensions**: endpoint, query params 등

### 📝 **Logs** (실시간 로그)

Live Metrics 하단에 실시간 로그 스트림:
```
⚡ GET /api/etf | Status: 200 | Duration: 125.50ms
📄 Page view: Dashboard (3500ms) | user: user_abc...
🎯 User event: search | category: interaction | user: user_abc...
❌ Error: HTTPException | endpoint: /api/chat
```

## 🚀 사용 방법

### 1. 서버 시작

```bash
# Backend 서버 실행 (Live Metrics 자동 활성화)
source .venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# 서버 시작 로그 확인
# ✅ Application Insights telemetry configured with Live Metrics enabled
# 📊 Connection String: InstrumentationKey=e01bf28e...
# 📈 Custom metrics initialized → customMetrics 테이블
```

### 2. 트래픽 생성

```bash
# 방법 1: Live Metrics 테스트 스크립트
python test_live_metrics.py

# 방법 2: 수동 API 호출
curl http://localhost:8000/api/etf
curl http://localhost:8000/api/news
curl http://localhost:8000/api/stocks/AAPL

# 방법 3: Frontend 사용
# http://localhost:3000 에서 페이지 탐색 및 상호작용
```

### 3. Azure Portal에서 Live Metrics 확인

1. **Azure Portal 접속**: https://portal.azure.com
2. **Application Insights 리소스 선택**
3. **왼쪽 메뉴**: "Investigate" → **"Live Metrics"** 클릭
4. **실시간 데이터 확인**:
   - 요청이 들어올 때마다 실시간으로 차트 업데이트
   - 1-2초 지연으로 메트릭 표시
   - 하단에 요청 샘플 스트림

**팁**: Live Metrics는 최소 1개의 서버가 연결되어야 데이터가 표시됩니다.

## 📋 주요 기능

### ✅ 자동 수집 데이터

**OpenTelemetry 자동 계측**:
- **HTTP 요청/응답**: FastAPI 엔드포인트 모든 호출
- **의존성 호출**: HTTPX (yfinance, Alpha Vantage API 등)
- **데이터베이스**: Cosmos DB 쿼리
- **예외 및 에러**: 처리되지 않은 예외 자동 기록
- **성능 카운터**: CPU, 메모리 사용률

### ✅ 커스텀 추적

**수동으로 기록하는 메트릭**:
- **엔드포인트별 요청 통계**: `/api/etf`, `/api/chat` 등
- **메서드별 처리 시간**: GET, POST 평균 응답 시간
- **상태 코드별 분류**: 200, 404, 500 등
- **에러 타입별 집계**: HTTPException, ValueError 등
- **사용자 행동**: 페이지 뷰, 이벤트 추적

### ✅ 실시간 로깅

**traces 테이블 + Live Metrics 로그 스트림**:
- 요청 처리 로그 (⚡)
- 페이지 뷰 로그 (📄)
- 사용자 이벤트 로그 (🎯)
- 에러 로그 (❌)
- 성능 경고

## 🔧 환경 변수

```bash
# 필수: Application Insights 연결 문자열
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxx;IngestionEndpoint=https://xxx.in.applicationinsights.azure.com/;LiveEndpoint=https://xxx.livediagnostics.monitor.azure.com/"

# 선택: 환경 구분 (Live Metrics "Servers"에 표시)
ENVIRONMENT=development  # development, staging, production

# 선택: 로그 레벨
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
```

## 🐛 트러블슈팅

### Live Metrics가 보이지 않는 경우

**증상**: Azure Portal Live Metrics에서 "Waiting for data..." 표시

**해결 방법**:
1. **환경변수 확인**:
   ```bash
   echo $APPLICATIONINSIGHTS_CONNECTION_STRING
   # LiveEndpoint가 포함되어 있는지 확인
   ```

2. **서버 로그 확인**:
   ```
   ✅ Application Insights telemetry configured with Live Metrics enabled
   ```
   이 메시지가 있어야 함

3. **트래픽 생성**:
   ```bash
   # 요청을 보내야 Live Metrics 활성화됨
   curl http://localhost:8000/api/etf
   ```

4. **방화벽 확인**: LiveEndpoint로 outbound 연결 가능한지 확인

5. **대기 시간**: 서버 시작 후 30초 정도 대기

### 커스텀 메트릭이 보이지 않는 경우

**증상**: Live Metrics에 "Custom Metrics" 섹션이 비어있음

**해결 방법**:
1. **initialize_metrics() 호출 확인**:
   ```python
   # src/main.py
   @app.on_event("startup")
   async def startup_event():
       initialize_metrics()  # 이 함수가 호출되어야 함
   ```

2. **메트릭 기록 확인**:
   ```python
   # record_request()가 호출되는지 로그 확인
   logger.info("Recording metric...")
   ```

3. **서버 재시작**: 메트릭 설정 변경 후 서버 재시작 필요

### Live Metrics 연결 끊김

**증상**: "Connection lost" 표시

**해결 방법**:
1. **서버 상태 확인**: 서버가 실행 중인지 확인
2. **네트워크 확인**: Azure LiveEndpoint 연결 가능한지 확인
3. **페이지 새로고침**: Azure Portal Live Metrics 페이지 새로고침

## 📚 참고 자료

- [Application Insights Live Metrics 공식 문서](https://docs.microsoft.com/azure/azure-monitor/app/live-stream)
- [OpenTelemetry Python 가이드](https://opentelemetry.io/docs/instrumentation/python/)
- [Azure Monitor OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)
- [Application Insights SDK for Python](https://docs.microsoft.com/azure/azure-monitor/app/api-custom-events-metrics)
- [프로젝트 텔레메트리 테이블 가이드](./TELEMETRY_TABLES.md)
- [사용자 행동 분석 가이드](./USER_BEHAVIOR_ANALYTICS.md)
