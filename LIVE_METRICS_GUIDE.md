# Live Metrics 가이드

## 개선 사항

### 1. **리소스 속성 추가**
```python
resource = Resource.create({
    "service.name": "etf-agent",
    "service.version": "0.1.0",
    "deployment.environment": os.getenv("ENVIRONMENT", "development"),
})
```
- Live Metrics에서 서비스 정보 표시
- 환경 구분 가능 (development, production 등)

### 2. **커스텀 메트릭 추가**
```python
# 요청 카운터
_request_counter = _meter.create_counter(
    name="app.requests.total",
    description="Total number of requests",
)

# 요청 처리 시간
_request_duration = _meter.create_histogram(
    name="app.requests.duration",
    description="Request duration in milliseconds",
)

# 에러 카운터
_error_counter = _meter.create_counter(
    name="app.errors.total",
    description="Total number of errors",
)
```

### 3. **향상된 트레이싱**
- 모든 HTTP 요청에 대한 상세 메타데이터 수집
- 요청 경로, 메서드, 상태 코드, 처리 시간
- 에러 발생 시 자동 기록
- 실시간 로깅

### 4. **에러 추적 강화**
- HTTP 에러 (4xx, 5xx) 자동 감지
- 예외 타입별 분류
- 엔드포인트별 에러 추적

## Live Metrics에서 확인 가능한 정보

### 📊 **Incoming Requests**
- 초당 요청 수
- 성공/실패 요청
- 평균 응답 시간

### 🏥 **Overall Health**
- 서버 상태 (healthy/unhealthy)
- CPU 사용률
- 메모리 사용률

### 🖥️ **Servers**
- 서비스 이름: etf-agent
- 버전: 0.1.0
- 환경: development/production

### 📈 **Custom Metrics**
- `app.requests.total` - 총 요청 수
  - endpoint별 분류
  - method별 분류
  - status_code별 분류
- `app.requests.duration` - 요청 처리 시간
  - 평균/최소/최대 값
  - 히스토그램 분포
- `app.errors.total` - 에러 수
  - error_type별 분류
  - endpoint별 분류

### 🔍 **Sample Telemetry**
- 실시간 요청 샘플
- 트레이스 상세 정보
- 의존성 호출 (yfinance API 등)

## 사용 방법

### 1. 서버 시작
```bash
# Backend 서버 실행
source .venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Live Metrics 테스트
```bash
# 별도 터미널에서 테스트 실행
source .venv/bin/activate
python test_live_metrics.py
```

### 3. Azure Portal에서 확인
1. https://portal.azure.com 접속
2. Application Insights 리소스 선택
3. 왼쪽 메뉴에서 **"Live Metrics"** 클릭
4. 실시간 데이터 확인

## 주요 기능

### ✅ 자동 수집 데이터
- HTTP 요청/응답
- 의존성 호출 (외부 API)
- 예외 및 에러
- 성능 카운터

### ✅ 커스텀 추적
- 엔드포인트별 요청 통계
- 메서드별 처리 시간
- 상태 코드별 분류
- 에러 타입별 집계

### ✅ 실시간 로깅
- 요청 처리 로그
- 에러 로그
- 성능 로그

## 환경 변수

```bash
# 필수
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;...

# 선택 (환경 구분용)
ENVIRONMENT=development  # 또는 production, staging 등
```

## 트러블슈팅

### Live Metrics가 보이지 않는 경우
1. `APPLICATIONINSIGHTS_CONNECTION_STRING` 환경변수 확인
2. 서버 로그에서 "Live Metrics enabled" 메시지 확인
3. 서버에 요청을 보내서 데이터 생성
4. Azure Portal에서 1-2분 대기

### 커스텀 메트릭이 보이지 않는 경우
1. `initialize_metrics()` 함수가 호출되었는지 확인
2. 요청이 실제로 처리되고 있는지 확인
3. `record_request()`, `record_error()` 함수가 호출되는지 로그 확인

## 참고 자료
- [Azure Monitor Live Metrics](https://docs.microsoft.com/azure/azure-monitor/app/live-stream)
- [OpenTelemetry Python](https://opentelemetry.io/docs/instrumentation/python/)
- [Application Insights SDK](https://docs.microsoft.com/azure/azure-monitor/app/api-custom-events-metrics)
