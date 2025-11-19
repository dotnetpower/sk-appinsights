---
published: false
type: workshop
title: Azure Application Insights 실전 워크숍 - AI 에이전트 모니터링
short_title: Application Insights 실전 워크숍
description: Azure Application Insights를 활용한 AI 에이전트 애플리케이션의 실시간 모니터링, 성능 분석, 사용자 행동 추적 심층 학습
level: intermediate
authors:
  - Moon Hyuk Choi, CSA
contacts:
  - moonchoi@microsoft.com
duration_minutes: 240
tags: azure, application-insights, monitoring, python, fastapi, opentelemetry
audience: pro devs, cloud engineers
navigation_levels: 3
navigation_numbering: true
lang: ko
#####
# moaw s . -p 8081
#####
---

# Azure Application Insights 실전 워크숍

*Version 2.0 - 2025년 11월*

## 📘 워크숍 개요

이 워크숍에서는 **Azure Application Insights**를 실제 AI 에이전트 애플리케이션(ETF Agent)에 통합하여 프로덕션급 모니터링 시스템을 구축하는 방법을 배웁니다.

### 🎯 학습 목표

- Application Insights의 핵심 개념과 아키텍처 이해
- OpenTelemetry를 활용한 자동 계측 구현
- 실시간 Live Metrics 설정 및 활용
- 커스텀 텔레메트리 데이터 수집 (페이지뷰, 이벤트, 메트릭)
- KQL을 활용한 고급 데이터 분석
- 사용자 행동 분석 및 코호트 분석
- 프로덕션 환경 배포 및 모니터링

### 🛠️ 실습 환경

**프로젝트**: ETF Agent (AI 기반 주식/ETF 정보 제공 애플리케이션)
- **Backend**: Python 3.13, FastAPI, Semantic Kernel
- **Frontend**: React 19, TypeScript, Material-UI
- **Database**: Azure Cosmos DB
- **Monitoring**: Azure Application Insights
- **Telemetry**: OpenTelemetry

### 📋 사전 준비사항

1. **Azure 구독** (무료 체험판 가능)
2. **개발 환경**: VS Code, Python 3.13+, Node.js 18+
3. **기본 지식**: Python, REST API, 기본적인 클라우드 개념

### 💡 Application Insights란?

Azure Application Insights는 Microsoft의 **APM(Application Performance Management)** 솔루션으로:

- ✅ **실시간 모니터링**: 1-2초 지연의 Live Metrics
- ✅ **분산 추적**: 마이크로서비스 간 요청 추적
- ✅ **자동 계측**: OpenTelemetry를 통한 자동 데이터 수집
- ✅ **사용자 분석**: 페이지뷰, 이벤트, 세션 추적
- ✅ **스마트 탐지**: AI 기반 이상 징후 탐지
- ✅ **통합 대시보드**: Azure Monitor와 완벽한 통합

### 📊 Azure Monitor 메트릭 유형 이해

Application Insights는 Azure Monitor의 일부로, 다양한 유형의 메트릭을 수집하고 분석합니다. 각 메트릭 유형은 수집 방법과 가용 시간이 다릅니다.

#### 1️⃣ **플랫폼 메트릭 (Platform Metrics)**

Azure 리소스에서 **자동으로 수집**되는 기본 메트릭입니다.

**특징**:
- 📊 **수집 대상**: CPU 사용률, 메모리, 네트워크, 디스크 I/O
- 🔄 **수집 주기**: **1분 간격** (일부 서비스는 더 짧을 수 있음)
- ⏱️ **데이터 가용 시간**: 수집 후 **60-90초** 이내
- 💾 **보존 기간**: **93일** (자동 집계)
- 🎯 **사용 목적**: 리소스 상태 모니터링, 자동 스케일링, 알림

**예시**:
```kusto
// Azure Container Apps CPU 사용률
AzureMetrics
| where ResourceProvider == "MICROSOFT.APP"
| where MetricName == "UsageNanoCores"
| where TimeGenerated > ago(1h)
| summarize avg(Average) by bin(TimeGenerated, 1m)
| render timechart
```

**주요 플랫폼 메트릭**:
- **Container Apps**: CPU, 메모리, 복제본 수, HTTP 요청 수
- **Cosmos DB**: RU 소비량, 스토리지, 요청 수
- **App Service**: CPU, 메모리, HTTP 상태 코드 분포

#### 2️⃣ **게스트 메트릭 (Guest Metrics)**

가상 머신 **내부의 게스트 OS**에서 수집되는 상세 메트릭입니다.

**특징**:
- 📊 **수집 대상**: 프로세스별 CPU/메모리, 디스크 상세 정보, 네트워크 상세 정보
- 🔄 **수집 주기**: **30-60초 간격** (설정 가능)
- ⏱️ **데이터 가용 시간**: 수집 후 **2-3분** 이내
- 💾 **보존 기간**: **93일**
- 🔧 **설정 필요**: Azure Diagnostics Extension 또는 Azure Monitor Agent 설치
- 🎯 **사용 목적**: 세밀한 리소스 모니터링, 성능 튜닝

**예시**:
```kusto
// 게스트 메트릭 조회 (프로세스별 메모리)
Perf
| where ObjectName == "Process"
| where CounterName == "Working Set"
| where TimeGenerated > ago(1h)
| summarize avg(CounterValue) by InstanceName, bin(TimeGenerated, 1m)
| render timechart
```

**게스트 vs 플랫폼 메트릭**:
| 항목 | 플랫폼 메트릭 | 게스트 메트릭 |
|------|-------------|--------------|
| 설정 | 자동 수집 | Agent 설치 필요 |
| 세밀도 | 리소스 레벨 | 프로세스 레벨 |
| 수집 간격 | 1분 | 30-60초 |
| 가용 시간 | 60-90초 | 2-3분 |

#### 3️⃣ **호스트 메트릭 (Host Metrics)**

**컨테이너 호스트** 또는 **클러스터 노드** 레벨에서 수집되는 메트릭입니다.

**특징**:
- 📊 **수집 대상**: 노드 CPU/메모리, 컨테이너 리소스 사용량, 네트워크 트래픽
- 🔄 **수집 주기**: **15-60초 간격** (Kubernetes 기준)
- ⏱️ **데이터 가용 시간**: 수집 후 **1-2분** 이내
- 💾 **보존 기간**: **93일**
- 🎯 **사용 목적**: 컨테이너 오케스트레이션, 클러스터 최적화

**Container Apps 호스트 메트릭 예시**:
```kusto
// Container Apps 복제본 메트릭
AzureMetrics
| where ResourceProvider == "MICROSOFT.APP"
| where MetricName == "Replicas"
| where TimeGenerated > ago(1h)
| summarize replica_count = avg(Average) by bin(TimeGenerated, 1m)
| render timechart
```

#### 4️⃣ **Application Insights 메트릭 (커스텀 메트릭)**

애플리케이션 **코드에서 직접 전송**하는 비즈니스 및 성능 메트릭입니다.

**특징**:
- 📊 **수집 대상**: 요청 수, 응답 시간, 사용자 이벤트, 커스텀 비즈니스 메트릭
- 🔄 **수집 주기**: **실시간** (코드에서 전송 시점)
- ⏱️ **데이터 가용 시간**: 
  - **Live Metrics**: **1-2초** (실시간 스트림)
  - **Logs/Metrics**: **1-2분** (Log Analytics 저장 후)
- 💾 **보존 기간**: **90일** (기본값, 최대 730일)
- 🎯 **사용 목적**: 애플리케이션 성능 모니터링, 사용자 행동 분석

**메트릭 유형별 가용 시간 요약**:

| 메트릭 유형 | 수집 간격 | 가용 시간 | 보존 기간 | 용도 |
|-----------|---------|---------|---------|------|
| **Live Metrics** | 실시간 | **1-2초** | 스트림만 | 실시간 모니터링 |
| **Application Insights Logs** | 실시간 | **1-2분** | 90일 | 성능 분석 |
| **플랫폼 메트릭** | 1분 | **60-90초** | 93일 | 리소스 모니터링 |
| **게스트 메트릭** | 30-60초 | **2-3분** | 93일 | OS 레벨 모니터링 |
| **호스트 메트릭** | 15-60초 | **1-2분** | 93일 | 컨테이너 모니터링 |

<div class="tip" data-title="💡 실시간 모니터링 팁">

> **Live Metrics**는 1-2초 지연으로 실시간 모니터링이 가능하지만, 쿼리 가능한 로그는 1-2분 후에 사용할 수 있습니다. 
> 
> 긴급 상황 대응 시에는 Live Metrics를, 상세 분석이나 알림 설정에는 Log Analytics 쿼리를 사용하세요.

</div>

### 🗺️ 워크숍 구성

1. **기본 설정 및 자동 계측** (60분)
2. **Live Metrics 및 실시간 모니터링** (45분)
3. **커스텀 텔레메트리 및 사용자 추적** (60분)
4. **KQL 쿼리 및 데이터 분석** (45분)
5. **프로덕션 배포 및 모니터링** (30분)

<div class="info" data-title="참고">

> 이 워크숍은 실제 운영 중인 ETF Agent 프로젝트를 기반으로 하며, 모든 코드는 [GitHub 저장소](https://github.com/dotnetpower/sk-appinsights)에서 확인할 수 있습니다.

</div>

---

# 실습 1: Application Insights 기본 설정 및 자동 계측

## 📝 학습 목표
- Azure에서 Application Insights 리소스 생성
- OpenTelemetry를 활용한 자동 계측 구현
- FastAPI 애플리케이션에 텔레메트리 통합
- 기본 테이블 구조 이해 (requests, dependencies, traces, exceptions)

## 🎯 Application Insights 데이터 모델

Application Insights는 다음 표준 테이블에 데이터를 저장합니다:

| 테이블 | 설명 | 수집 방법 |
|--------|------|-----------|
| **requests** | HTTP 요청/응답 | FastAPI 자동 계측 |
| **dependencies** | 외부 API, DB 호출 | HTTPX, Cosmos DB 자동 계측 |
| **traces** | 로그 메시지 | Python logger 출력 |
| **exceptions** | 예외 및 에러 | 자동 예외 캡처 |
| **pageViews** | 페이지 뷰 | 수동 추적 (실습 3) |
| **customEvents** | 사용자 이벤트 | 수동 추적 (실습 3) |
| **customMetrics** | 커스텀 메트릭 | OpenTelemetry Metrics |

## 🛠️ 실습 1-1: Azure 리소스 생성

### Azure Portal에서 Application Insights 생성

1. **Azure Portal 접속**: https://portal.azure.com

2. **리소스 생성**:
   ```
   검색: "Application Insights"
   → Create → Application Insights
   ```

3. **기본 설정**:
   - **Subscription**: 본인의 구독 선택
   - **Resource Group**: `rg-sk-appinsights` (신규 생성)
   - **Name**: `appi-etf-agent-dev`
   - **Region**: `Korea Central`
   - **Resource Mode**: `Workspace-based`

4. **Log Analytics Workspace**:
   - **Create new**: `log-etf-agent-dev`
   - **Region**: `Korea Central`

5. **Review + Create** → **Create**

### 연결 문자열 확인

리소스 생성 후:
1. Application Insights 리소스로 이동
2. 왼쪽 메뉴: **"Properties"** 또는 **"Overview"**
3. **"Connection String"** 복사

```
InstrumentationKey=xxx;IngestionEndpoint=https://xxx.in.applicationinsights.azure.com/;LiveEndpoint=https://xxx.livediagnostics.monitor.azure.com/
```

<div class="tip" data-title="💡 팁">

> **LiveEndpoint**가 포함되어 있어야 Live Metrics를 사용할 수 있습니다.

</div>

## 🛠️ 실습 1-2: 프로젝트 환경 설정

### 환경변수 설정

`.env` 파일 생성:

```bash
# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxx;IngestionEndpoint=xxx;LiveEndpoint=xxx"

# 환경 구분 (선택)
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### 필수 패키지 설치

`pyproject.toml` 확인:

```toml
[project.dependencies]
# OpenTelemetry
opentelemetry-api = "^1.21.0"
opentelemetry-sdk = "^1.21.0"
azure-monitor-opentelemetry = "^1.2.0"
azure-monitor-opentelemetry-exporter = "^1.0.0b"

# Instrumentation
opentelemetry-instrumentation-fastapi = "^0.42b0"
opentelemetry-instrumentation-httpx = "^0.42b0"

# Application Insights SDK
applicationinsights = "^0.11.10"

# Azure SDK Tracing
azure-core-tracing-opentelemetry = "^1.0.0"
```

패키지 설치:

```bash
source .venv/bin/activate
uv sync --prerelease=allow
```

## 🛠️ 실습 1-3: 텔레메트리 설정 구현

### `src/observability/telemetry.py` 생성

```python
"""
Application Insights 텔레메트리 설정
"""
import logging
import os

from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import metrics, trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.resources import Resource

logger = logging.getLogger(__name__)


def setup_telemetry(app=None):
    """
    Application Insights 텔레메트리 설정
    
    자동 수집 데이터:
    - requests: FastAPI HTTP 요청
    - dependencies: HTTPX API 호출, Cosmos DB 쿼리
    - traces: Python logger 로그
    - exceptions: 예외 발생 시 자동 기록
    """
    connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
    
    if not connection_string:
        logger.warning("⚠️ APPLICATIONINSIGHTS_CONNECTION_STRING not set")
        return
    
    try:
        # 리소스 속성 정의
        resource = Resource.create({
            "service.name": "etf-agent",
            "service.version": "0.1.0",
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        })
        
        # Azure Monitor 설정
        configure_azure_monitor(
            connection_string=connection_string,
            enable_live_metrics=True,
            resource=resource,
        )
        
        # FastAPI 자동 계측 → requests 테이블
        if app:
            FastAPIInstrumentor.instrument_app(app)
            logger.info("✅ FastAPI instrumented → requests 테이블")
        
        # HTTPX 자동 계측 → dependencies 테이블
        HTTPXClientInstrumentor().instrument()
        logger.info("✅ HTTPX instrumented → dependencies 테이블")
        
        # Azure SDK tracing → dependencies 테이블
        try:
            from azure.core.settings import settings
            from azure.core.tracing.ext.opentelemetry_span import OpenTelemetrySpan
            settings.tracing_implementation = OpenTelemetrySpan
            logger.info("✅ Azure SDK tracing → Cosmos DB 추적")
        except ImportError:
            logger.warning("Azure Core tracing not available")
        
        logger.info("=" * 60)
        logger.info("📊 Application Insights 텔레메트리 활성화")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Telemetry setup failed: {e}")


def get_tracer(name: str):
    """트레이서 가져오기"""
    return trace.get_tracer(name)


def get_meter(name: str):
    """미터 가져오기"""
    return metrics.get_meter(name)
```

### `src/main.py` 통합

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .observability.telemetry import setup_telemetry

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="ETF Agent API",
    version="0.1.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Application Insights 설정
setup_telemetry(app)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 ETF Agent API starting...")

@app.get("/health")
async def health():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}

@app.get("/api/test")
async def test():
    """테스트 엔드포인트"""
    logger.info("📊 Test endpoint called")
    return {"message": "Application Insights 테스트"}
```

## 🛠️ 실습 1-4: 애플리케이션 실행 및 데이터 수집

### 서버 시작

```bash
source .venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

서버 로그 확인:

```
✅ FastAPI instrumented → requests 테이블
✅ HTTPX instrumented → dependencies 테이블
✅ Azure SDK tracing → Cosmos DB 추적
============================================================
📊 Application Insights 텔레메트리 활성화
============================================================
🚀 ETF Agent API starting...
```

### 트래픽 생성

터미널에서 요청 전송:

```bash
# 헬스 체크
curl http://localhost:8000/health

# 테스트 엔드포인트
curl http://localhost:8000/api/test

# 반복 요청 (10회)
for i in {1..10}; do curl http://localhost:8000/api/test; sleep 1; done
```

## 🛠️ 실습 1-5: Azure Portal에서 데이터 확인

### 1. requests 테이블 조회

Azure Portal → Application Insights → **Logs**

```kusto
requests
| where timestamp > ago(10m)
| project 
    timestamp,
    name,
    url,
    resultCode,
    duration,
    success
| order by timestamp desc
| take 20
```

**확인 사항**:
- `/health`, `/api/test` 요청이 기록되었는가?
- `resultCode`가 200인가?
- `duration`(밀리초)이 얼마인가?

### 2. traces 테이블 조회 (로그)

```kusto
traces
| where timestamp > ago(10m)
| project 
    timestamp,
    message,
    severityLevel
| order by timestamp desc
| take 20
```

**확인 사항**:
- Python logger 출력이 기록되었는가?
- `"📊 Test endpoint called"` 메시지가 보이는가?

### 3. 성능 분석

```kusto
requests
| where timestamp > ago(1h)
| summarize 
    request_count = count(),
    avg_duration = avg(duration),
    p90_duration = percentile(duration, 90),
    p95_duration = percentile(duration, 95)
  by name
| order by request_count desc
```

## ✅ 실습 과제

1. **새로운 엔드포인트 추가**:
   ```python
   @app.get("/api/hello/{name}")
   async def hello(name: str):
       logger.info(f"👋 Hello endpoint: {name}")
       return {"message": f"Hello, {name}!"}
   ```
   
   요청 후 `requests` 테이블에서 확인

2. **에러 발생 시키기**:
   ```python
   @app.get("/api/error")
   async def error_test():
       raise ValueError("Intentional error for testing")
   ```
   
   `exceptions` 테이블에서 확인:
   ```kusto
   exceptions
   | where timestamp > ago(10m)
   | project timestamp, type, outerMessage, innermostMessage
   ```

3. **외부 API 호출 추적**:
   ```python
   import httpx
   
   @app.get("/api/external")
   async def external_api():
       async with httpx.AsyncClient() as client:
           response = await client.get("https://api.github.com")
       return {"status": response.status_code}
   ```
   
   `dependencies` 테이블에서 확인:
   ```kusto
   dependencies
   | where timestamp > ago(10m)
   | project timestamp, name, target, duration, success
   ```

## 📚 핵심 정리

✅ **자동 계측의 장점**:
- 코드 수정 최소화
- 표준화된 데이터 수집
- 마이크로서비스 추적

✅ **수집되는 데이터**:
- HTTP 요청/응답
- 외부 API 호출
- 로그 메시지
- 예외 및 에러

✅ **다음 단계**:
- Live Metrics로 실시간 모니터링
- 커스텀 메트릭 추가
- 사용자 행동 추적

---

# 실습 2: Live Metrics 실시간 모니터링

## 📝 학습 목표
- Live Metrics의 개념과 활용법 이해
- 실시간 성능 모니터링 구현
- 커스텀 메트릭 추가 및 활용
- Live Metrics 대시보드 분석

## 💡 Live Metrics란?

Live Metrics는 **1-2초 지연**으로 애플리케이션의 실시간 상태를 모니터링하는 기능입니다.

**일반 Logs (1-2분 지연)** vs **Live Metrics (1-2초 지연)**

### 주요 기능:
- ⚡ 실시간 요청 처리 현황
- 📊 서버 성능 메트릭 (CPU, 메모리)
- 📈 커스텀 메트릭 및 로그
- 🔗 의존성 호출 추적
- ❌ 예외 및 에러 실시간 감지

## 🛠️ 실습 2-1: 커스텀 메트릭 구현

### 메트릭 초기화 (`telemetry.py`에 추가)

```python
# OpenTelemetry Metrics
_meter = None
_request_counter = None
_request_duration = None
_error_counter = None

def initialize_metrics():
    """
    커스텀 메트릭 초기화 → customMetrics 테이블
    """
    global _meter, _request_counter, _request_duration, _error_counter
    
    _meter = metrics.get_meter("etf-agent.metrics")
    
    # 요청 카운터
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
    
    logger.info("📈 Custom metrics initialized")

def record_request(endpoint: str, method: str, status_code: int, duration_ms: float):
    """요청 메트릭 기록"""
    if _request_counter and _request_duration:
        attributes = {
            "endpoint": endpoint,
            "method": method,
            "status_code": str(status_code),
        }
        _request_counter.add(1, attributes)
        _request_duration.record(duration_ms, attributes)

def record_error(error_type: str, endpoint: str = None):
    """에러 메트릭 기록"""
    if _error_counter:
        attributes = {"error_type": error_type}
        if endpoint:
            attributes["endpoint"] = endpoint
        _error_counter.add(1, attributes)
```

### `main.py`에서 초기화

```python
from .observability.telemetry import setup_telemetry, initialize_metrics

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 ETF Agent API starting...")
    initialize_metrics()  # 메트릭 초기화
```

## 🛠️ 실습 2-2: 트레이싱 미들웨어 구현

### `src/observability/middleware.py` 생성

```python
import logging
import time
from typing import Callable

from fastapi import Request, Response
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from starlette.middleware.base import BaseHTTPMiddleware

from .telemetry import record_request, record_error

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

class TracingMiddleware(BaseHTTPMiddleware):
    """HTTP 요청 추적 미들웨어"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        span_name = f"{request.method} {request.url.path}"
        
        with tracer.start_as_current_span(span_name) as span:
            # 요청 정보 추가
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", str(request.url))
            span.set_attribute("http.path", request.url.path)
            
            # 시작 시간
            start_time = time.time()
            
            try:
                # 요청 처리
                response = await call_next(request)
                
                # 응답 정보
                span.set_attribute("http.status_code", response.status_code)
                
                # 성공/실패 상태
                if 200 <= response.status_code < 400:
                    span.set_status(Status(StatusCode.OK))
                else:
                    span.set_status(Status(StatusCode.ERROR))
                
                return response
                
            except Exception as e:
                # 에러 기록
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                record_error(type(e).__name__, request.url.path)
                raise
                
            finally:
                # 처리 시간 기록
                duration_ms = (time.time() - start_time) * 1000
                span.set_attribute("http.duration_ms", duration_ms)
                
                status = response.status_code if 'response' in locals() else 500
                
                # 메트릭 기록
                record_request(
                    request.url.path,
                    request.method,
                    status,
                    duration_ms
                )
                
                # 로그
                logger.info(
                    f"⚡ {request.method} {request.url.path} | "
                    f"Status: {status} | Duration: {duration_ms:.2f}ms"
                )
```

### 미들웨어 등록 (`main.py`)

```python
from .observability.middleware import TracingMiddleware

# 미들웨어 추가
app.add_middleware(TracingMiddleware)
```

## 🛠️ 실습 2-3: Live Metrics 확인

### 1. 서버 재시작

```bash
source .venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 트래픽 생성

```bash
# 연속 요청 생성
while true; do
  curl http://localhost:8000/health
  curl http://localhost:8000/api/test
  sleep 1
done
```

### 3. Azure Portal에서 Live Metrics 확인

1. Azure Portal → Application Insights
2. 왼쪽 메뉴: **"Investigate"** → **"Live Metrics"**
3. 실시간 데이터 확인:

**확인 항목**:
- 📊 **Incoming Requests**: 초당 요청 수, 평균 응답 시간
- 🖥️ **Overall Health**: CPU, 메모리 사용률
- 📈 **Custom Metrics**: `app.requests.total`, `app.requests.duration`
- 📝 **Sample Telemetry**: 최근 요청 샘플
- 🔍 **Logs**: 실시간 로그 스트림

## 🛠️ 실습 2-4: 성능 테스트

### 부하 테스트 스크립트 작성

```python
# test_load.py
import asyncio
import httpx
import time

async def send_request(client, url):
    """단일 요청 전송"""
    try:
        response = await client.get(url)
        return response.status_code
    except Exception as e:
        return None

async def load_test(url, num_requests=100, concurrent=10):
    """부하 테스트"""
    start_time = time.time()
    
    async with httpx.AsyncClient() as client:
        tasks = []
        for _ in range(num_requests):
            task = send_request(client, url)
            tasks.append(task)
            
            # 동시 실행 제한
            if len(tasks) >= concurrent:
                await asyncio.gather(*tasks)
                tasks = []
        
        # 남은 요청 처리
        if tasks:
            await asyncio.gather(*tasks)
    
    duration = time.time() - start_time
    print(f"✅ {num_requests} requests in {duration:.2f}s")
    print(f"📊 {num_requests/duration:.2f} req/sec")

if __name__ == "__main__":
    asyncio.run(load_test("http://localhost:8000/health", 1000, 50))
```

### 실행 및 Live Metrics 관찰

```bash
python test_load.py
```

Live Metrics에서 확인:
- 요청 처리율 급증
- CPU/메모리 사용량 변화
- 평균 응답 시간 추이

## ✅ 실습 과제

1. **에러율 모니터링**:
   - 의도적으로 에러를 발생시키는 엔드포인트 추가
   - Live Metrics에서 에러 카운터 증가 확인

2. **느린 엔드포인트 추적**:
   ```python
   @app.get("/api/slow")
   async def slow_endpoint():
       await asyncio.sleep(3)  # 3초 지연
       return {"message": "slow response"}
   ```
   Live Metrics에서 응답 시간 증가 관찰

3. **커스텀 메트릭 추가**:
   - 비즈니스 메트릭 추가 (예: 검색 횟수, 캐시 히트율)
   - Live Metrics Custom Metrics 섹션에서 확인

## 📚 핵심 정리

✅ **Live Metrics 장점**:
- 즉각적인 문제 감지
- 실시간 성능 모니터링
- 배포 후 즉시 검증 가능

✅ **커스텀 메트릭**:
- 비즈니스 KPI 추적
- 세분화된 성능 분석
- 알림 규칙 설정 가능

---

# 실습 3: 사용자 행동 추적 및 커스텀 이벤트

## 📝 학습 목표
- pageViews 테이블을 활용한 페이지 추적
- customEvents 테이블을 활용한 사용자 이벤트 수집
- 프론트엔드에서 텔레메트리 통합
- 사용자 ID 및 세션 관리

## 💡 사용자 행동 분석의 중요성

사용자가 애플리케이션을 어떻게 사용하는지 이해하면:
- 🎯 인기 기능 파악
- 📊 사용자 여정 최적화
- 🔍 문제점 조기 발견
- 💡 데이터 기반 의사결정

## 🛠️ 실습 3-1: TelemetryClient 설정

### `telemetry.py`에 TelemetryClient 추가

```python
from applicationinsights import TelemetryClient

# TelemetryClient 전역 변수
_telemetry_client: TelemetryClient | None = None

def setup_telemetry(app=None):
    """텔레메트리 설정"""
    global _telemetry_client
    
    connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
    
    # ... (기존 코드)
    
    # TelemetryClient 초기화
    instrumentation_key = None
    for part in connection_string.split(';'):
        if part.startswith('InstrumentationKey='):
            instrumentation_key = part.split('=')[1]
            break
    
    if instrumentation_key:
        _telemetry_client = TelemetryClient(instrumentation_key)
        logger.info("✅ TelemetryClient initialized")
```

### 페이지 뷰 추적 함수

```python
def track_page_view(
    name: str,
    url: str = "",
    properties: dict | None = None,
    duration_ms: int | None = None
):
    """
    페이지 뷰 추적 → pageViews 테이블
    
    Args:
        name: 페이지 이름
        url: 페이지 URL
        properties: 커스텀 속성 (user_id, session_id 등)
        duration_ms: 페이지 체류 시간 (밀리초)
    """
    if not _telemetry_client:
        return
    
    try:
        props = properties.copy() if properties else {}
        if duration_ms:
            props["duration_ms"] = str(duration_ms)
        
        _telemetry_client.track_pageview(
            name=name,
            url=url or f"/{name.lower().replace(' ', '-')}",
            duration=0,
            properties=props,
        )
        _telemetry_client.flush()
        
        logger.info(f"📄 Page view: {name}")
        
    except Exception as e:
        logger.error(f"Failed to track page view: {e}")
```

### 사용자 이벤트 추적 함수

```python
def track_user_event(
    name: str,
    properties: dict | None = None,
    measurements: dict | None = None
):
    """
    사용자 이벤트 추적 → customEvents 테이블
    
    Args:
        name: 이벤트 이름
        properties: 문자열 속성
        measurements: 숫자 측정값
    """
    if not _telemetry_client:
        return
    
    try:
        _telemetry_client.track_event(
            name=name,
            properties=properties or {},
            measurements=measurements or {},
        )
        _telemetry_client.flush()
        
        logger.info(f"🎯 User event: {name}")
        
    except Exception as e:
        logger.error(f"Failed to track event: {e}")
```

## 🛠️ 실습 3-2: 백엔드 API 엔드포인트

### `src/api/analytics.py` 생성

```python
from fastapi import APIRouter
from pydantic import BaseModel
import logging

from ..observability.telemetry import track_page_view, track_user_event

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

class PageViewRequest(BaseModel):
    page_name: str
    duration_ms: int | None = None
    user_id: str | None = None
    session_id: str | None = None
    metadata: dict | None = None

class EventRequest(BaseModel):
    event_name: str
    event_category: str
    user_id: str | None = None
    session_id: str | None = None
    properties: dict | None = None

@router.post("/page-view")
async def log_page_view(data: PageViewRequest):
    """페이지 뷰 로깅"""
    properties = {
        "user_id": data.user_id or "N/A",
        "session_id": data.session_id or "N/A",
    }
    if data.metadata:
        properties.update(data.metadata)
    
    track_page_view(
        name=data.page_name,
        properties=properties,
        duration_ms=data.duration_ms,
    )
    
    return {"status": "success"}

@router.post("/event")
async def log_event(data: EventRequest):
    """사용자 이벤트 로깅"""
    properties = {
        "event_category": data.event_category,
        "user_id": data.user_id or "N/A",
        "session_id": data.session_id or "N/A",
    }
    if data.properties:
        properties.update(data.properties)
    
    track_user_event(
        name=data.event_name,
        properties=properties,
    )
    
    return {"status": "success"}
```

### `main.py`에 라우터 등록

```python
from .api import analytics

app.include_router(analytics.router)
```

## 🛠️ 실습 3-3: 프론트엔드 통합

### `frontend/src/services/analytics.ts`

```typescript
import api from './api';

// 페이지 뷰 추적
export const trackPageView = async (data: {
  page_name: string;
  duration_ms?: number;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    await api.post('/api/analytics/page-view', data);
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

// 사용자 이벤트 추적
export const trackEvent = async (data: {
  event_name: string;
  event_category: string;
  user_id?: string;
  session_id?: string;
  properties?: Record<string, any>;
}) => {
  try {
    await api.post('/api/analytics/event', data);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};
```

### `frontend/src/hooks/usePageTracking.ts`

```typescript
import { useEffect, useRef } from 'react';
import { trackPageView } from '../services/analytics';

// 사용자 ID 생성/가져오기
export const getUserId = (): string => {
  let userId = localStorage.getItem('etf_agent_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('etf_agent_user_id', userId);
  }
  return userId;
};

// 세션 ID 생성/가져오기
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('etf_agent_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('etf_agent_session_id', sessionId);
  }
  return sessionId;
};

// 페이지 추적 훅
export const usePageTracking = (pageName: string) => {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();

    return () => {
      const duration = Date.now() - startTimeRef.current;
      
      trackPageView({
        page_name: pageName,
        duration_ms: duration,
        user_id: getUserId(),
        session_id: getSessionId(),
      });
    };
  }, [pageName]);
};
```

### 컴포넌트에서 사용

```typescript
// frontend/src/components/Dashboard.tsx
import React from 'react';
import { usePageTracking } from '../hooks/usePageTracking';
import { trackEvent, getUserId } from '../services/analytics';

const Dashboard: React.FC = () => {
  // 페이지 추적
  usePageTracking('Dashboard');

  const handleButtonClick = (buttonName: string) => {
    // 버튼 클릭 이벤트 추적
    trackEvent({
      event_name: 'button_click',
      event_category: 'interaction',
      user_id: getUserId(),
      properties: {
        button_name: buttonName,
        page: 'Dashboard',
      },
    });
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => handleButtonClick('refresh')}>
        Refresh
      </button>
    </div>
  );
};
```

## 🛠️ 실습 3-4: 데이터 확인

### pageViews 테이블 조회

```kusto
pageViews
| where timestamp > ago(1h)
| extend 
    user_id = tostring(customDimensions["user_id"]),
    session_id = tostring(customDimensions["session_id"]),
    duration_ms = toint(customDimensions["duration_ms"])
| project 
    timestamp,
    name,
    user_id,
    session_id,
    duration_ms
| order by timestamp desc
```

### customEvents 테이블 조회

```kusto
customEvents
| where timestamp > ago(1h)
| extend 
    event_category = tostring(customDimensions["event_category"]),
    user_id = tostring(customDimensions["user_id"])
| project 
    timestamp,
    name,
    event_category,
    user_id,
    customDimensions
| order by timestamp desc
```

## ✅ 실습 과제

1. **탭 전환 추적**:
   ```typescript
   trackEvent({
     event_name: 'tab_changed',
     event_category: 'navigation',
     properties: {
       from_tab: 'Dashboard',
       to_tab: 'ETF List',
     },
   });
   ```

2. **검색 이벤트 추적**:
   ```typescript
   trackEvent({
     event_name: 'search',
     event_category: 'interaction',
     properties: {
       query: searchQuery,
       results_count: results.length,
     },
   });
   ```

3. **페이지별 평균 체류 시간 분석**:
   ```kusto
   pageViews
   | extend duration_ms = toint(customDimensions["duration_ms"])
   | where duration_ms > 0
   | summarize avg_duration_seconds = avg(duration_ms) / 1000 by name
   | order by avg_duration_seconds desc
   ```

## 📚 핵심 정리

✅ **수집 데이터**:
- pageViews: 페이지 방문 및 체류 시간
- customEvents: 사용자 상호작용
- 사용자 ID: 개별 사용자 추적
- 세션 ID: 세션별 활동 그룹화

---

# 실습 4: KQL 쿼리 및 고급 데이터 분석

## 📝 학습 목표
- KQL(Kusto Query Language) 기본 문법 학습
- Application Insights 데이터 분석 쿼리 작성
- 사용자 코호트 분석 구현
- 커스텀 대시보드 및 알림 설정

## 💡 KQL이란?

**Kusto Query Language**는 Azure Monitor, Application Insights, Log Analytics에서 사용하는 강력한 쿼리 언어입니다.

### 기본 문법

```kusto
// 테이블 선택 및 필터링
requests
| where timestamp > ago(1h)
| where resultCode == 200
| project timestamp, name, duration

// 집계
requests
| summarize count() by name

// 정렬
requests
| order by timestamp desc

// 시간 범위 그룹화
requests
| summarize avg(duration) by bin(timestamp, 5m)
```

## 🛠️ 실습 4-1: 성능 분석 쿼리

### 엔드포인트별 평균 응답 시간

```kusto
requests
| where timestamp > ago(24h)
| summarize 
    request_count = count(),
    avg_duration = avg(duration),
    p50 = percentile(duration, 50),
    p90 = percentile(duration, 90),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
  by name
| extend avg_duration_ms = round(avg_duration, 2)
| order by request_count desc
```

**분석 포인트**:
- p90, p95가 SLA 목표 내에 있는가?
- 특정 엔드포인트가 다른 것보다 현저히 느린가?

### 느린 요청 TOP 10

```kusto
requests
| where timestamp > ago(24h)
| where duration > 1000  // 1초 이상
| project 
    timestamp,
    name,
    duration,
    resultCode,
    url
| order by duration desc
| take 10
```

### 시간대별 요청 트렌드

```kusto
requests
| where timestamp > ago(7d)
| summarize 
    request_count = count(),
    avg_duration = avg(duration),
    error_count = countif(success == false)
  by bin(timestamp, 1h)
| extend error_rate = round(100.0 * error_count / request_count, 2)
| render timechart
```

## 🛠️ 실습 4-2: 에러 및 예외 분석

### 에러율 모니터링

```kusto
requests
| where timestamp > ago(24h)
| summarize 
    total = count(),
    errors = countif(success == false),
    error_5xx = countif(resultCode >= 500),
    error_4xx = countif(resultCode >= 400 and resultCode < 500)
| extend 
    error_rate = round(100.0 * errors / total, 2),
    error_5xx_rate = round(100.0 * error_5xx / total, 2),
    error_4xx_rate = round(100.0 * error_4xx / total, 2)
```

### 예외 분석

```kusto
exceptions
| where timestamp > ago(24h)
| summarize 
    exception_count = count(),
    affected_users = dcount(user_Id)
  by type, outerMessage
| order by exception_count desc
| take 20
```

### 에러 상세 분석

```kusto
exceptions
| where timestamp > ago(1h)
| extend 
    method = tostring(customDimensions["http.method"]),
    endpoint = tostring(customDimensions["http.path"])
| project 
    timestamp,
    type,
    outerMessage,
    method,
    endpoint,
    severityLevel
| order by timestamp desc
```

## 🛠️ 실습 4-3: 사용자 행동 분석

### 페이지별 사용자 참여도

```kusto
pageViews
| where timestamp > ago(7d)
| extend duration_ms = toint(customDimensions["duration_ms"])
| where duration_ms > 0
| summarize 
    view_count = count(),
    unique_users = dcount(user_Id),
    avg_duration_sec = avg(duration_ms) / 1000,
    median_duration_sec = percentile(duration_ms, 50) / 1000
  by name
| extend engagement_score = round(view_count * avg_duration_sec, 2)
| order by engagement_score desc
```

### 사용자 여정 분석

```kusto
union
  (pageViews 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]),
        event_type = "PageView",
        detail = name),
  (customEvents 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]),
        event_type = "Event",
        detail = name)
| where session_id != "N/A"
| where timestamp > ago(24h)
| order by session_id, timestamp asc
| project timestamp, session_id, user_id, event_type, detail
| take 1000
```

### 전환 퍼널 분석

```kusto
let all_users = pageViews
| where timestamp > ago(7d)
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| distinct user_id;

let step1_users = pageViews
| where timestamp > ago(7d)
| where name == "Dashboard"
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| distinct user_id;

let step2_users = pageViews
| where timestamp > ago(7d)
| where name == "ETF List"
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| distinct user_id;

let step3_users = customEvents
| where timestamp > ago(7d)
| where name == "chat_message_sent"
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| distinct user_id;

union 
  (all_users | summarize step = "All Users", user_count = count()),
  (step1_users | summarize step = "Dashboard", user_count = count()),
  (step2_users | summarize step = "ETF List", user_count = count()),
  (step3_users | summarize step = "AI Chat", user_count = count())
| order by user_count desc
| extend conversion_rate = round(100.0 * user_count / prev(user_count, 1), 2)
```

## 🛠️ 실습 4-4: 코호트 분석

### 주간 사용자 코호트

```kusto
let cohort_data = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| summarize 
    first_seen = min(timestamp),
    last_seen = max(timestamp)
  by user_id
| extend cohort_week = startofweek(first_seen)
| extend weeks_active = datetime_diff('week', last_seen, first_seen);

cohort_data
| summarize user_count = dcount(user_id) by cohort_week, weeks_active
| order by cohort_week asc, weeks_active asc
```

### 유지율 분석 (Retention)

```kusto
let users_by_day = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| extend day = startofday(timestamp)
| summarize by user_id, day;

let first_day = users_by_day
| summarize first_day = min(day) by user_id;

users_by_day
| join kind=inner first_day on user_id
| extend days_since_first = datetime_diff('day', day, first_day)
| summarize user_count = dcount(user_id) by days_since_first
| order by days_since_first asc
| extend 
    retention_rate = round(100.0 * user_count / prev(user_count, 1), 2),
    cumulative_retention = round(100.0 * user_count / first(user_count), 2)
```

## 🛠️ 실습 4-5: 의존성 및 성능 분석

### 외부 API 호출 분석

```kusto
dependencies
| where timestamp > ago(24h)
| summarize 
    call_count = count(),
    avg_duration = avg(duration),
    p90_duration = percentile(duration, 90),
    success_rate = round(100.0 * countif(success == true) / count(), 2)
  by target, type
| order by call_count desc
```

### Cosmos DB 쿼리 성능

```kusto
dependencies
| where timestamp > ago(24h)
| where type == "Azure DocumentDB" or type contains "Cosmos"
| extend 
    operation = tostring(customDimensions["db.operation"]),
    collection = tostring(customDimensions["db.collection"])
| summarize 
    query_count = count(),
    avg_duration = avg(duration),
    p90_duration = percentile(duration, 90)
  by operation, collection
| order by avg_duration desc
```

### 분산 추적 (End-to-End)

```kusto
// 특정 요청의 전체 흐름 추적
let operationId = "특정_operation_id";
union requests, dependencies
| where operation_Id == operationId
| project 
    timestamp,
    itemType,
    name,
    duration,
    success,
    resultCode
| order by timestamp asc
```

## 🛠️ 실습 4-6: 알림 및 대시보드 설정

### 알림 규칙 생성

Azure Portal → Application Insights → Alerts → New alert rule

**예시 1: 에러율 알림**
```kusto
requests
| where timestamp > ago(5m)
| summarize 
    total = count(),
    errors = countif(success == false)
| extend error_rate = 100.0 * errors / total
| where error_rate > 5  // 5% 이상
```

**예시 2: 응답 시간 알림**
```kusto
requests
| where timestamp > ago(5m)
| summarize p95_duration = percentile(duration, 95)
| where p95_duration > 2000  // 2초 이상
```

### Workbook 생성

Azure Portal → Application Insights → Workbooks → New

**대시보드 구성**:
1. **개요 섹션**: 전체 요청 수, 에러율, 평균 응답 시간
2. **성능 섹션**: 시간대별 트렌드, 엔드포인트별 성능
3. **사용자 섹션**: 페이지 뷰, 이벤트, 코호트 분석
4. **에러 섹션**: 예외 트렌드, TOP 에러 목록

## ✅ 실습 과제

1. **커스텀 대시보드 생성**:
   - 비즈니스 KPI 표시
   - 실시간 성능 모니터링
   - 사용자 행동 인사이트

2. **알림 규칙 설정**:
   - 에러율 5% 초과 시
   - p95 응답 시간 2초 초과 시
   - 의존성 실패율 10% 초과 시

3. **주간 리포트 쿼리 작성**:
   - 전주 대비 트래픽 변화
   - 신규 사용자 vs 재방문 사용자
   - 가장 많이 발생한 에러

## 📚 핵심 정리

✅ **KQL 활용**:
- 강력한 데이터 분석 도구
- 실시간 인사이트 도출
- 자동화된 알림 설정

✅ **분석 영역**:
- 성능 모니터링
- 에러 추적
- 사용자 행동 분석
- 코호트 및 유지율

---

# 실습 5: 프로덕션 배포 및 모니터링

## 📝 학습 목표
- Azure Container Apps에 배포
- 프로덕션 환경 모니터링 설정
- CI/CD 파이프라인 구성
- 운영 베스트 프랙티스 적용

## 🛠️ 실습 5-1: Docker 이미지 빌드

### Dockerfile 확인

```dockerfile
# Multi-stage build
FROM node:22-bookworm-slim AS frontend-builder
ARG REACT_APP_API_URL=""
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM python:3.13-slim-bookworm
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen
COPY src/ ./src/
COPY --from=frontend-builder /app/frontend/build ./frontend/build
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 로컬 테스트

```bash
# 이미지 빌드
docker build -t etf-agent:latest \
  --build-arg REACT_APP_API_URL="" \
  .

# 컨테이너 실행
docker run -p 8000:8000 \
  -e APPLICATIONINSIGHTS_CONNECTION_STRING="your_connection_string" \
  etf-agent:latest

# 테스트
curl http://localhost:8000/health
```

## 🛠️ 실습 5-2: Azure Container Apps 배포

### GitHub Actions Workflow

`.github/workflows/deploy-containerapp.yml`:

```yaml
name: Deploy to Azure Container App

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  CONTAINER_REGISTRY_NAME: crskappinsights
  RESOURCE_GROUP: rg-sk-appinsights
  CONTAINER_APP_NAME: etf-agent-app

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
    
    - name: Build and Push Docker Image
      run: |
        az acr build \
          --registry ${{ env.CONTAINER_REGISTRY_NAME }} \
          --image etf-agent:${{ github.sha }} \
          --image etf-agent:latest \
          --build-arg REACT_APP_API_URL="" \
          .
    
    - name: Deploy to Container Apps
      run: |
        az containerapp update \
          --name ${{ env.CONTAINER_APP_NAME }} \
          --resource-group ${{ env.RESOURCE_GROUP }} \
          --image ${{ env.CONTAINER_REGISTRY_NAME }}.azurecr.io/etf-agent:${{ github.sha }} \
          --set-env-vars \
            APPLICATIONINSIGHTS_CONNECTION_STRING=secretref:appinsights-connection-string \
            ENVIRONMENT=production
```

### Secrets 설정

GitHub Repository → Settings → Secrets:

```bash
# AZURE_CREDENTIALS
{
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx",
  "tenantId": "xxx"
}

# APPLICATIONINSIGHTS_CONNECTION_STRING
InstrumentationKey=xxx;IngestionEndpoint=xxx;LiveEndpoint=xxx
```

## 🛠️ 실습 5-3: 프로덕션 모니터링

### 핵심 메트릭 모니터링

```kusto
// 실시간 상태 확인
requests
| where timestamp > ago(5m)
| where cloud_RoleName == "etf-agent"
| summarize 
    requests_per_min = count() / 5,
    avg_duration = avg(duration),
    error_rate = 100.0 * countif(success == false) / count()
| extend health_status = case(
    error_rate > 5 or avg_duration > 2000, "Critical",
    error_rate > 2 or avg_duration > 1000, "Warning",
    "Healthy"
)
```

### 알림 설정

1. **고가용성 알림**:
   - 에러율 > 5%
   - 평균 응답 시간 > 2초
   - 가용성 < 99.9%

2. **리소스 알림**:
   - CPU > 80%
   - 메모리 > 90%
   - 의존성 실패율 > 10%

### 대시보드 예시

```kusto
// 프로덕션 개요 대시보드
let timeRange = ago(24h);
let healthCheck = requests
| where timestamp > timeRange
| summarize 
    total_requests = count(),
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    error_count = countif(success == false),
    availability = 100.0 * countif(success == true) / count();

let topErrors = exceptions
| where timestamp > timeRange
| summarize count() by type
| order by count_ desc
| take 5;

let userMetrics = pageViews
| where timestamp > timeRange
| summarize 
    total_page_views = count(),
    unique_users = dcount(user_Id);

union healthCheck, topErrors, userMetrics
```

## ✅ 실습 과제

1. **Blue-Green 배포**:
   - 스테이징 슬롯 생성
   - 트래픽 분산 테스트
   - 롤백 프로세스 수립

2. **성능 최적화**:
   - 느린 쿼리 식별 및 개선
   - 캐싱 전략 구현
   - 리소스 스케일링 테스트

3. **운영 플레이북 작성**:
   - 장애 대응 절차
   - 모니터링 체크리스트
   - 에스컬레이션 프로세스

## 📚 핵심 정리

✅ **배포 전략**:
- 컨테이너 기반 배포
- CI/CD 자동화
- 환경별 설정 분리

✅ **모니터링**:
- 실시간 상태 확인
- 알림 설정
- 대시보드 운영

✅ **운영**:
- 로그 분석
- 성능 최적화
- 장애 대응

---

# 🎓 워크숍 마무리

## 학습 내용 요약

이 워크숍에서 다룬 핵심 내용:

### 1️⃣ **Application Insights 기초**
- Azure 리소스 생성 및 설정
- OpenTelemetry 자동 계측
- 기본 텔레메트리 수집 (requests, dependencies, traces, exceptions)

### 2️⃣ **Live Metrics 실시간 모니터링**
- 커스텀 메트릭 구현
- 트레이싱 미들웨어
- 실시간 성능 모니터링

### 3️⃣ **사용자 행동 추적**
- pageViews 및 customEvents
- 프론트엔드 통합
- 사용자 ID 및 세션 관리

### 4️⃣ **KQL 데이터 분석**
- 성능 및 에러 분석
- 사용자 코호트 분석
- 알림 및 대시보드

### 5️⃣ **프로덕션 운영**
- Docker 컨테이너 배포
- CI/CD 파이프라인
- 운영 모니터링

## 🎯 주요 성과

✅ **완전한 모니터링 시스템 구축**
- 자동 계측으로 최소한의 코드 수정
- 실시간 성능 추적
- 사용자 행동 분석

✅ **데이터 기반 의사결정**
- KQL을 활용한 고급 분석
- 코호트 분석 및 유지율 추적
- 전환 퍼널 분석

✅ **프로덕션 준비 완료**
- CI/CD 자동화
- 알림 및 대시보드
- 운영 베스트 프랙티스

## 📚 추가 학습 리소스

### Microsoft 공식 문서
- [Application Insights 개요](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview)
- [OpenTelemetry Python](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable?tabs=python)
- [KQL 쿼리 언어](https://learn.microsoft.com/azure/data-explorer/kusto/query/)

### 실습 프로젝트
- [ETF Agent GitHub Repository](https://github.com/dotnetpower/sk-appinsights)
- [Live Metrics 가이드](../LIVE_METRICS_GUIDE.md)
- [사용자 행동 분석 가이드](../USER_BEHAVIOR_ANALYTICS.md)

### 커뮤니티
- [Azure Monitor Community](https://techcommunity.microsoft.com/t5/azure-monitor/ct-p/AzureMonitor)
- [Microsoft Q&A](https://learn.microsoft.com/answers/tags/azure-monitor)

## 🚀 다음 단계

1. **실제 프로젝트 적용**:
   - 본인의 프로젝트에 Application Insights 통합
   - 비즈니스 KPI 추적 구현
   - 커스텀 대시보드 구축

2. **고급 기능 탐색**:
   - Application Map (분산 추적 시각화)
   - Smart Detection (AI 기반 이상 탐지)
   - Profiler (코드 레벨 성능 분석)

3. **모니터링 문화 구축**:
   - 팀과 인사이트 공유
   - 정기적인 성능 리뷰
   - 데이터 기반 개선

## 💬 피드백

워크숍에 대한 피드백은 [GitHub Issues](https://github.com/dotnetpower/sk-appinsights/issues)로 남겨주세요.

**감사합니다! 🙏**

Application Insights로 더 나은 애플리케이션을 만드세요!



