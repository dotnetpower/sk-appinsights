---
published: false
type: workshop
title: Azure Application Insights 실전 워크숍 - AI 에이전트 모니터링
short_title: Application Insights 실전 워크숍
description: Azure Application Insights를 활용한 AI 에이전트 애플리케이션의 실시간 모니터링, 성능 분석, 사용자 행동 추적 심층 학습
level: intermediate
authors:
  - Moon Hyuk Choi, AI Apps CSA
contacts:
  - moonchoi@microsoft.com
duration_minutes: 240
tags: azure, application-insights, monitoring, python, fastapi, opentelemetry
audience: pro devs, cloud engineers
navigation_levels: 3
navigation_numbering: false
lang: ko
#####
# moaw s . -p 8081
#####
---

# Azure Application Insights 실전 워크숍

*Version 1.0 - 2025년 11월*

## 📘 워크숍 개요

이 워크숍에서는 **Azure Application Insights**를 실제 AI 에이전트 애플리케이션(ETF Agent)에 통합하여 프로덕션급 모니터링 시스템을 구축하는 방법을 배웁니다.

<div class="warning" data-title="AI 생성 컨텐츠">

> 본 내용은 AI 도구(Claude, GitHub Copilot 등)를 활용하여 작성되었으며, 일부 내용은 사실과 다를 수 있습니다. 큰 틀에서 이해를 돕기 위한 참고 자료로 활용해 주세요.

</div>

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

![Image description](assets/app-insights-overview-screenshot.png)

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

1. **Azure Portal 접속**: [Azure Portal](https://portal.azure.com)

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
        
        # Azure Monitor 설정 (Live Metrics 활성화)
        configure_azure_monitor(
            connection_string=connection_string,
            enable_live_metrics=True,  # 🔴 Live Metrics 활성화 (필수)
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
        logger.info("🔴 Live Metrics 활성화됨 (실시간 모니터링 가능)")
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
![Image description](assets/live-metric.png)

<div class="important" data-title="⚠️ Live Metrics 활성화 필수 설정">

> Live Metrics를 사용하려면 Python 코드에서 **반드시** `enable_live_metrics=True` 설정이 필요합니다:
> 
> ```python
> configure_azure_monitor(
>     connection_string=connection_string,
>     enable_live_metrics=True,  # 🔴 필수!
>     resource=resource,
> )
> ```
> 
> 또한 Connection String에 **LiveEndpoint**가 포함되어 있어야 합니다:
> ```
> InstrumentationKey=xxx;IngestionEndpoint=xxx;LiveEndpoint=https://xxx.livediagnostics.monitor.azure.com/
> ```

</div>

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


def track_ai_token_usage(
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    operation: str = "chat"
):
    """
    AI Token 사용량 추적 → customMetrics 테이블
    
    Args:
        model: AI 모델 이름 (gpt-4, gpt-3.5-turbo 등)
        prompt_tokens: 프롬프트 토큰 수
        completion_tokens: 완료 토큰 수
        total_tokens: 총 토큰 수
        operation: 작업 유형 (chat, completion, embedding 등)
    """
    if not _telemetry_client:
        return
    
    try:
        # 비용 계산 (예시: GPT-4 가격)
        cost_per_1k_prompt = 0.03  # $0.03 per 1K prompt tokens
        cost_per_1k_completion = 0.06  # $0.06 per 1K completion tokens
        
        estimated_cost = (
            (prompt_tokens / 1000 * cost_per_1k_prompt) +
            (completion_tokens / 1000 * cost_per_1k_completion)
        )
        
        # customMetrics에 기록
        _telemetry_client.track_metric(
            name="ai.tokens.total",
            value=total_tokens,
            properties={
                "model": model,
                "operation": operation,
            }
        )
        
        _telemetry_client.track_metric(
            name="ai.tokens.prompt",
            value=prompt_tokens,
            properties={"model": model}
        )
        
        _telemetry_client.track_metric(
            name="ai.tokens.completion",
            value=completion_tokens,
            properties={"model": model}
        )
        
        _telemetry_client.track_metric(
            name="ai.cost.estimated_usd",
            value=estimated_cost,
            properties={"model": model}
        )
        
        _telemetry_client.flush()
        
        logger.info(
            f"💰 AI Token usage: {total_tokens} tokens "
            f"(prompt: {prompt_tokens}, completion: {completion_tokens}) "
            f"| Estimated cost: ${estimated_cost:.4f}"
        )
        
    except Exception as e:
        logger.error(f"Failed to track AI token usage: {e}")
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

class AITokenUsageRequest(BaseModel):
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    operation: str = "chat"

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

@router.post("/ai-token-usage")
async def log_ai_token_usage(data: AITokenUsageRequest):
    """AI Token 사용량 로깅"""
    track_ai_token_usage(
        model=data.model,
        prompt_tokens=data.prompt_tokens,
        completion_tokens=data.completion_tokens,
        total_tokens=data.total_tokens,
        operation=data.operation,
    )
    
    return {"status": "success"}
```

### AI 에이전트에서 Token 추적 예시

`src/agent/agent_service.py`:

```python
from opentelemetry import trace
from ..observability.telemetry import track_ai_token_usage

tracer = trace.get_tracer(__name__)

async def chat_with_agent(user_message: str, user_id: str):
    """AI 에이전트와 대화"""
    with tracer.start_as_current_span("agent.chat") as span:
        span.set_attribute("user_id", user_id)
        span.set_attribute("message_length", len(user_message))
        
        try:
            # Semantic Kernel 또는 OpenAI API 호출
            response = await kernel.invoke(
                function_name="chat",
                input=user_message
            )
            
            # Token 사용량 추출 (OpenAI API 응답에서)
            if hasattr(response, 'usage'):
                usage = response.usage
                
                # Application Insights에 기록
                track_ai_token_usage(
                    model="gpt-4",
                    prompt_tokens=usage.prompt_tokens,
                    completion_tokens=usage.completion_tokens,
                    total_tokens=usage.total_tokens,
                    operation="chat"
                )
                
                # Span에도 추가
                span.set_attribute("ai.tokens.prompt", usage.prompt_tokens)
                span.set_attribute("ai.tokens.completion", usage.completion_tokens)
                span.set_attribute("ai.tokens.total", usage.total_tokens)
            
            return response.choices[0].message.content
            
        except Exception as e:
            span.record_exception(e)
            raise
```

### Token 사용량 조회 쿼리

```kusto
// 모델별 Token 사용량 및 비용
customMetrics
| where name == "ai.tokens.total"
| where timestamp > ago(24h)
| extend model = tostring(customDimensions["model"])
| summarize 
    total_tokens = sum(value),
    request_count = count(),
    avg_tokens_per_request = avg(value)
  by model
| join kind=inner (
    customMetrics
    | where name == "ai.cost.estimated_usd"
    | where timestamp > ago(24h)
    | extend model = tostring(customDimensions["model"])
    | summarize estimated_cost = sum(value) by model
) on model
| project 
    model,
    total_tokens,
    request_count,
    avg_tokens_per_request = round(avg_tokens_per_request, 0),
    estimated_cost_usd = round(estimated_cost, 2)
| order by total_tokens desc
```

**예상 출력**:
```
model           | total_tokens | request_count | avg_tokens | estimated_cost_usd
----------------|--------------|---------------|------------|-------------------
gpt-4           | 1,250,000    | 2,500         | 500        | $62.50
gpt-3.5-turbo   | 850,000      | 3,400         | 250        | $1.70
```
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

### 💡 코호트 분석이란?

코호트 분석은 특정 기간에 가입하거나 활동을 시작한 사용자 그룹(코호트)의 행동을 시간 경과에 따라 추적하는 분석 방법입니다.

**주요 활용**:
- 📊 사용자 유지율(Retention) 측정
- 📈 제품 개선 효과 분석
- 🎯 마케팅 캠페인 효과 측정
- 🔍 사용자 생애주기(Lifecycle) 이해

### 주간 사용자 코호트

```kusto
let cohort_data = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| where timestamp > ago(90d)
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

**해석 방법**:
- `cohort_week`: 사용자가 처음 방문한 주
- `weeks_active`: 처음 방문 이후 몇 주 뒤에 활동했는지
- `user_count`: 해당 주차에 활동한 사용자 수

### 유지율 분석 (Retention)

```kusto
let users_by_day = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| where timestamp > ago(30d)
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

**핵심 메트릭**:
- **Day 0 Retention**: 첫 방문 사용자 수 (기준점)
- **Day 1 Retention**: 다음 날 재방문율
- **Day 7 Retention**: 7일 후 유지율
- **Day 30 Retention**: 30일 후 유지율

### 코호트 매트릭스 시각화

```kusto
// 주간 코호트 매트릭스 (Retention Table)
let cohort_users = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| where timestamp > ago(90d)
| extend week = startofweek(timestamp)
| summarize first_week = min(week) by user_id;

let activity_data = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| where timestamp > ago(90d)
| extend week = startofweek(timestamp)
| distinct user_id, week;

cohort_users
| join kind=inner activity_data on user_id
| extend weeks_since_first = datetime_diff('week', week, first_week)
| summarize active_users = dcount(user_id) by first_week, weeks_since_first
| join kind=inner (
    cohort_users
    | summarize cohort_size = dcount(user_id) by first_week
) on first_week
| extend retention_pct = round(100.0 * active_users / cohort_size, 1)
| project first_week, weeks_since_first, cohort_size, active_users, retention_pct
| order by first_week asc, weeks_since_first asc
```

**읽는 방법**:
```
Cohort Week  | Week 0 | Week 1 | Week 2 | Week 3
-------------|--------|--------|--------|--------
2024-10-01   | 100%   | 45%    | 32%    | 28%
2024-10-08   | 100%   | 52%    | 38%    | -
2024-10-15   | 100%   | 48%    | -      | -
```

### RFM 분석 (Recency, Frequency, Monetary)

```kusto
// 사용자별 RFM 스코어 계산
let analysis_period = 30d;
let current_date = now();

let user_activity = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| where timestamp > ago(analysis_period);

user_activity
| summarize 
    last_activity = max(timestamp),
    first_activity = min(timestamp),
    total_events = count(),
    distinct_days = dcount(startofday(timestamp)),
    page_views = countif(itemType == "pageView"),
    custom_events = countif(itemType == "customEvent")
  by user_id
| extend 
    recency_days = datetime_diff('day', current_date, last_activity),
    frequency_score = total_events,
    engagement_days = distinct_days
| extend 
    recency_score = case(
        recency_days <= 1, 5,
        recency_days <= 3, 4,
        recency_days <= 7, 3,
        recency_days <= 14, 2,
        1
    ),
    frequency_tier = case(
        total_events >= 100, 5,
        total_events >= 50, 4,
        total_events >= 20, 3,
        total_events >= 10, 2,
        1
    ),
    engagement_tier = case(
        engagement_days >= 20, 5,
        engagement_days >= 10, 4,
        engagement_days >= 5, 3,
        engagement_days >= 2, 2,
        1
    )
| extend rfm_score = recency_score + frequency_tier + engagement_tier
| extend user_segment = case(
    rfm_score >= 13, "Champions",        // 최고 등급
    rfm_score >= 11, "Loyal Customers",  // 충성 고객
    rfm_score >= 9, "Potential Loyalists", // 잠재 충성 고객
    rfm_score >= 7, "Recent Users",      // 신규 사용자
    rfm_score >= 5, "At Risk",           // 이탈 위험
    "Lost"                                // 이탈 사용자
)
| project 
    user_id,
    last_activity,
    recency_days,
    total_events,
    engagement_days,
    recency_score,
    frequency_tier,
    engagement_tier,
    rfm_score,
    user_segment
| order by rfm_score desc
```

**사용자 세그먼트 정의**:
- **Champions** (13-15점): 최근 활동, 높은 빈도, 높은 참여 → VIP 대우
- **Loyal Customers** (11-12점): 정기적 사용자 → 보상 프로그램
- **Potential Loyalists** (9-10점): 성장 가능성 → 육성 필요
- **Recent Users** (7-8점): 신규 사용자 → 온보딩 강화
- **At Risk** (5-6점): 이탈 위험 → 재참여 캠페인
- **Lost** (3-4점): 이탈 사용자 → 재활성화 전략

### 세그먼트별 집계

```kusto
// RFM 세그먼트별 통계
let analysis_period = 30d;
let current_date = now();

let user_activity = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| where timestamp > ago(analysis_period);

let rfm_data = user_activity
| summarize 
    last_activity = max(timestamp),
    total_events = count(),
    distinct_days = dcount(startofday(timestamp))
  by user_id
| extend 
    recency_days = datetime_diff('day', current_date, last_activity),
    recency_score = case(recency_days <= 1, 5, recency_days <= 3, 4, recency_days <= 7, 3, recency_days <= 14, 2, 1),
    frequency_tier = case(total_events >= 100, 5, total_events >= 50, 4, total_events >= 20, 3, total_events >= 10, 2, 1),
    engagement_tier = case(distinct_days >= 20, 5, distinct_days >= 10, 4, distinct_days >= 5, 3, distinct_days >= 2, 2, 1)
| extend rfm_score = recency_score + frequency_tier + engagement_tier
| extend user_segment = case(
    rfm_score >= 13, "Champions",
    rfm_score >= 11, "Loyal Customers",
    rfm_score >= 9, "Potential Loyalists",
    rfm_score >= 7, "Recent Users",
    rfm_score >= 5, "At Risk",
    "Lost"
);

rfm_data
| summarize 
    user_count = count(),
    avg_events = avg(total_events),
    avg_engagement_days = avg(distinct_days),
    avg_recency_days = avg(recency_days)
  by user_segment
| extend user_percentage = round(100.0 * user_count / toscalar(rfm_data | count()), 1)
| order by 
    case(
        user_segment == "Champions", 1,
        user_segment == "Loyal Customers", 2,
        user_segment == "Potential Loyalists", 3,
        user_segment == "Recent Users", 4,
        user_segment == "At Risk", 5,
        6
    )
```

### 사용자 여정 상세 추적

```kusto
// 특정 사용자의 전체 여정 시각화
let target_user = "user_xxx"; // 분석할 사용자 ID

union
  (pageViews 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]),
        duration_ms = toint(customDimensions["duration_ms"]),
        event_type = "PageView",
        event_name = name),
  (customEvents 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]),
        event_type = "CustomEvent",
        event_name = name,
        event_category = tostring(customDimensions["event_category"]))
| where user_id == target_user
| where timestamp > ago(30d)
| order by timestamp asc
| extend 
    time_diff_seconds = datetime_diff('second', timestamp, prev(timestamp)),
    sequence_number = row_number()
| project 
    sequence = sequence_number,
    timestamp,
    session_id,
    event_type,
    event_name,
    duration_ms,
    time_since_last = time_diff_seconds,
    customDimensions
```

**분석 포인트**:
- 사용자가 어떤 순서로 페이지를 방문하는가?
- 각 페이지/기능에 얼마나 머무르는가?
- 어떤 지점에서 이탈하는가?
- 세션 간 간격은 얼마나 되는가?

## 🛠️ 실습 4-5: 고급 사용자 행동 분석

### 세션 분석

```kusto
// 세션별 활동 통계
let session_data = union
  (pageViews 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]),
        duration_ms = toint(customDimensions["duration_ms"])),
  (customEvents 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]))
| where session_id != "N/A"
| where timestamp > ago(7d);

session_data
| summarize 
    session_start = min(timestamp),
    session_end = max(timestamp),
    page_views = countif(itemType == "pageView"),
    events = countif(itemType == "customEvent"),
    total_actions = count()
  by session_id, user_id
| extend session_duration_minutes = datetime_diff('minute', session_end, session_start)
| summarize 
    avg_session_duration = avg(session_duration_minutes),
    median_session_duration = percentile(session_duration_minutes, 50),
    avg_page_views = avg(page_views),
    avg_events = avg(events),
    total_sessions = count(),
    bounce_sessions = countif(total_actions == 1)
| extend bounce_rate = round(100.0 * bounce_sessions / total_sessions, 2)
```

**핵심 지표**:
- **평균 세션 시간**: 사용자가 한 번의 방문에서 머무는 시간
- **페이지 뷰/세션**: 세션당 평균 페이지 조회수
- **바운스율**: 한 페이지만 보고 나간 비율

### 기능별 사용 패턴 분석

```kusto
// 기능 사용 순서 및 빈도 분석
customEvents
| where timestamp > ago(7d)
| extend 
    event_category = tostring(customDimensions["event_category"]),
    user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| summarize 
    event_count = count(),
    unique_users = dcount(user_id),
    first_occurrence = min(timestamp),
    last_occurrence = max(timestamp)
  by name, event_category
| extend 
    events_per_user = round(1.0 * event_count / unique_users, 2),
    adoption_rate = round(100.0 * unique_users / toscalar(
        customEvents 
        | where timestamp > ago(7d)
        | extend user_id = tostring(customDimensions["user_id"])
        | where user_id != "N/A"
        | dcount(user_id)
    ), 2)
| order by event_count desc
```

### A/B 테스트 분석 템플릿

```kusto
// 두 그룹 간 성능 비교
let variant_a_users = customEvents
| where timestamp > ago(7d)
| where name == "feature_variant_assigned"
| extend 
    user_id = tostring(customDimensions["user_id"]),
    variant = tostring(customDimensions["variant"])
| where variant == "A"
| distinct user_id;

let variant_b_users = customEvents
| where timestamp > ago(7d)
| where name == "feature_variant_assigned"
| extend 
    user_id = tostring(customDimensions["user_id"]),
    variant = tostring(customDimensions["variant"])
| where variant == "B"
| distinct user_id;

let target_conversion = "chat_message_sent";

union
  (customEvents
    | extend user_id = tostring(customDimensions["user_id"])
    | where user_id in (variant_a_users)
    | where name == target_conversion
    | summarize conversions = dcount(user_id)
    | extend variant = "A", total_users = toscalar(variant_a_users | count())),
  (customEvents
    | extend user_id = tostring(customDimensions["user_id"])
    | where user_id in (variant_b_users)
    | where name == target_conversion
    | summarize conversions = dcount(user_id)
    | extend variant = "B", total_users = toscalar(variant_b_users | count()))
| extend conversion_rate = round(100.0 * conversions / total_users, 2)
| project variant, total_users, conversions, conversion_rate
```

### 사용자 이탈 예측 분석

```kusto
// 이탈 위험이 높은 사용자 식별
let current_date = now();
let activity_threshold_days = 7;  // 7일 이상 미활동시 위험
let low_engagement_threshold = 5; // 총 이벤트 5회 미만

let user_activity = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| where timestamp > ago(30d);

user_activity
| summarize 
    last_activity = max(timestamp),
    first_activity = min(timestamp),
    total_events = count(),
    active_days = dcount(startofday(timestamp)),
    page_views = countif(itemType == "pageView"),
    custom_events = countif(itemType == "customEvent")
  by user_id
| extend 
    days_since_last = datetime_diff('day', current_date, last_activity),
    lifetime_days = datetime_diff('day', current_date, first_activity),
    engagement_rate = round(100.0 * active_days / lifetime_days, 1)
| extend churn_risk = case(
    days_since_last >= 14 and total_events < 10, "High",
    days_since_last >= 7 and engagement_rate < 20, "Medium",
    days_since_last >= activity_threshold_days, "Low",
    "Active"
)
| where churn_risk in ("High", "Medium")
| project 
    user_id,
    last_activity,
    days_since_last,
    total_events,
    active_days,
    engagement_rate,
    churn_risk
| order by days_since_last desc
```

**활용 방법**:
- **High Risk**: 즉시 재참여 캠페인 (이메일, 푸시 알림)
- **Medium Risk**: 맞춤형 컨텐츠 추천
- **Low Risk**: 정기적인 뉴스레터

## 🛠️ 실습 4-6: 의존성 및 성능 분석

### 외부 API 호출 분석

```kusto
dependencies
| where timestamp > ago(24h)
| summarize 
    call_count = count(),
    avg_duration = avg(duration),
    p50_duration = percentile(duration, 50),
    p90_duration = percentile(duration, 90),
    p99_duration = percentile(duration, 99),
    success_rate = round(100.0 * countif(success == true) / count(), 2),
    error_count = countif(success == false)
  by target, type
| extend avg_duration_ms = round(avg_duration, 2)
| order by call_count desc
```

**성능 기준**:
- p50 < 200ms: 우수
- p90 < 500ms: 양호
- p99 < 1000ms: 허용 가능
- 그 이상: 최적화 필요

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
    p90_duration = percentile(duration, 90),
    max_duration = max(duration)
  by operation, collection
| extend efficiency_score = case(
    avg_duration < 50, "Excellent",
    avg_duration < 100, "Good",
    avg_duration < 200, "Fair",
    "Needs Optimization"
)
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
    resultCode,
    target = iif(itemType == "dependency", target, ""),
    type = iif(itemType == "dependency", type, "")
| extend sequence = row_number()
| order by timestamp asc
```

### API 엔드포인트별 의존성 매핑

```kusto
// 엔드포인트가 호출하는 외부 서비스 분석
requests
| where timestamp > ago(24h)
| join kind=inner (
    dependencies
    | where timestamp > ago(24h)
) on operation_Id
| summarize 
    request_count = dcount(operation_Id),
    avg_total_duration = avg(duration),
    dependency_calls = count(),
    unique_targets = make_set(target)
  by request_name = name
| extend deps_per_request = round(1.0 * dependency_calls / request_count, 2)
| order by request_count desc
```

## 🛠️ 실습 4-7: 알림 규칙 생성 및 관리

### 💡 알림(Alert)이란?

Azure Monitor 알림은 메트릭, 로그, 활동 로그에서 중요한 조건을 감지하고 자동으로 알림을 전송하는 기능입니다.

**알림 구성 요소**:
- 🎯 **Alert Rule**: 조건 및 임계값 정의
- 📊 **Signal**: 모니터링할 데이터 소스 (메트릭, 로그 쿼리)
- 🔔 **Action Group**: 알림 전송 방법 (이메일, SMS, 웹훅 등)
- ⏱️ **Evaluation Frequency**: 조건 확인 주기

---

### 📋 알림 규칙 생성 단계별 가이드

#### 1단계: Alert Rule 생성

1. **Azure Portal** → **Application Insights** 리소스 선택
2. 왼쪽 메뉴: **"Alerts"** 클릭
3. 상단: **"+ Create"** → **"Alert rule"** 선택

#### 2단계: Scope (범위) 설정

- **Resource**: 현재 Application Insights 리소스 자동 선택
- **Resource type**: `Application Insights`

#### 3단계: Condition (조건) 설정

**Signal 선택**:
- **Logs**: KQL 쿼리 기반 알림 (권장)
- **Metrics**: 메트릭 기반 알림 (간단한 조건)

**Logs 쿼리 예시**:

##### 예시 1: 에러율 알림 (5% 초과)

```kusto
requests
| where timestamp > ago(5m)
| summarize 
    total = count(),
    errors = countif(success == false)
| extend error_rate = 100.0 * errors / total
| where error_rate > 5
| project error_rate, total, errors
```

**조건 설정**:
- **Measure**: `error_rate`
- **Aggregation type**: `Maximum`
- **Operator**: `Greater than`
- **Threshold value**: `5`
- **Frequency**: `5 minutes`
- **Time range**: `5 minutes`

##### 예시 2: 응답 시간 알림 (p95 > 2초)

```kusto
requests
| where timestamp > ago(5m)
| summarize p95_duration = percentile(duration, 95)
| where p95_duration > 2000
| project p95_duration
```

**조건 설정**:
- **Threshold value**: `2000` (밀리초)
- **Frequency**: `5 minutes`

##### 예시 3: 의존성 실패율 알림 (10% 초과)

```kusto
dependencies
| where timestamp > ago(5m)
| summarize 
    total = count(),
    failures = countif(success == false)
| extend failure_rate = 100.0 * failures / total
| where failure_rate > 10
| project failure_rate, total, failures
```

##### 예시 4: 사용자 급감 알림 (전일 대비 20% 감소)

```kusto
let today = pageViews
| where timestamp > ago(1d)
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| dcount(user_id);

let yesterday = pageViews
| where timestamp between (ago(2d) .. ago(1d))
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| dcount(user_id);

print 
    today_users = today,
    yesterday_users = yesterday,
    change_pct = round(100.0 * (today - yesterday) / yesterday, 1)
| where change_pct < -20
```

##### 예시 5: AI Token 사용량 초과 알림

```kusto
// AI 모델 Token 사용량 모니터링
traces
| where timestamp > ago(5m)
| where message contains "Token usage"
| extend token_usage = extract(@"Token usage: (\d+)", 1, message)
| extend tokens = toint(token_usage)
| summarize total_tokens = sum(tokens)
| where total_tokens > 100000  // 5분간 10만 토큰 초과
| project total_tokens
```

**사용 사례**: OpenAI API 호출 시 비용 관리

##### 예시 6: 예외 급증 알림

```kusto
exceptions
| where timestamp > ago(5m)
| summarize exception_count = count()
| where exception_count > 50
| project exception_count
```

#### 4단계: Action Group (액션 그룹) 설정

**액션 그룹 생성**:

1. **"+ Create action group"** 클릭
2. **기본 정보**:
   - **Subscription**: 본인 구독
   - **Resource group**: `rg-sk-appinsights`
   - **Action group name**: `ag-critical-alerts`
   - **Display name**: `Critical Alerts`

3. **Notifications (알림 설정)**:

   | Type | Name | Details |
   |------|------|---------|
   | Email/SMS/Push/Voice | Email Admin | admin@example.com |
   | Email/SMS/Push/Voice | SMS OnCall | +82-10-1234-5678 |

4. **Actions (추가 액션)**:

   | Action Type | Name | Configuration |
   |-------------|------|---------------|
   | Webhook | Slack Webhook | https://hooks.slack.com/services/... |
   | Azure Function | Alert Processor | Function App URL |
   | Logic App | Create Incident | Logic App 선택 |
   | ITSM | ServiceNow Ticket | ITSM 연결 |

**Slack 웹훅 예시**:
```json
{
  "text": "🚨 Application Insights Alert",
  "attachments": [
    {
      "color": "danger",
      "fields": [
        {
          "title": "Alert Name",
          "value": "#alertrulename",
          "short": true
        },
        {
          "title": "Severity",
          "value": "#severity",
          "short": true
        },
        {
          "title": "Threshold",
          "value": "#threshold",
          "short": true
        }
      ]
    }
  ]
}
```

#### 5단계: Alert Rule Details (세부 정보)

- **Alert rule name**: `High Error Rate - Production`
- **Description**: `에러율이 5%를 초과했을 때 알림`
- **Severity**: 
  - `Sev 0 - Critical`: 서비스 중단
  - `Sev 1 - Error`: 주요 기능 장애
  - `Sev 2 - Warning`: 성능 저하
  - `Sev 3 - Informational`: 정보성 알림
- **Enable upon creation**: ✅ 체크
- **Automatically resolve alerts**: ✅ 체크 (조건 해소 시 자동 해결)

#### 6단계: Review + Create

- 설정 검토 후 **"Create"** 클릭

---

### 📊 알림 규칙 모범 사례

#### ✅ DO (권장)

1. **적절한 임계값 설정**:
   - 과거 데이터 분석 후 결정
   - 너무 민감하면 알림 피로도 증가

2. **평가 주기 최적화**:
   - Critical: 1-5분
   - Warning: 5-15분
   - Informational: 15-30분

3. **Severity 분류**:
   - 중요도에 따라 명확히 구분
   - 각 Severity별 다른 Action Group 설정

4. **알림 메시지 명확화**:
   ```kusto
   | extend alert_message = strcat(
       "Error rate: ", error_rate, "% ",
       "(", errors, "/", total, " requests)"
   )
   ```

5. **비즈니스 시간 고려**:
   - 중요도 낮은 알림은 업무 시간에만 전송
   - Logic App으로 조건부 라우팅

#### ❌ DON'T (지양)

1. **너무 많은 알림**: 알림 피로도(Alert Fatigue)
2. **너무 긴 평가 주기**: 문제 발견 지연
3. **불명확한 메시지**: 원인 파악 어려움
4. **단일 채널**: 이메일만 또는 SMS만
5. **테스트 없이 배포**: 프로덕션 배포 전 테스트

---

### 🔧 고급 알림 시나리오

#### 시나리오 1: 다단계 알림 (Escalation)

```kusto
// 1단계: Warning (5분간 에러율 > 5%)
// 2단계: Error (10분간 에러율 > 5%)
// 3단계: Critical (15분간 에러율 > 10%)

requests
| where timestamp > ago(15m)
| summarize 
    error_rate = 100.0 * countif(success == false) / count(),
    duration = datetime_diff('minute', max(timestamp), min(timestamp))
| extend severity = case(
    error_rate > 10 and duration >= 15, "Critical",
    error_rate > 5 and duration >= 10, "Error",
    error_rate > 5 and duration >= 5, "Warning",
    "OK"
)
| where severity != "OK"
```

#### 시나리오 2: 복합 조건 알림

```kusto
// 에러율 높음 AND 트래픽 정상 (실제 문제)
let error_threshold = 5.0;
let traffic_threshold = 100;

requests
| where timestamp > ago(5m)
| summarize 
    total_requests = count(),
    error_rate = 100.0 * countif(success == false) / count()
| where error_rate > error_threshold and total_requests > traffic_threshold
```

#### 시나리오 3: AI Token 비용 알림 (실전 예시)

```kusto
// OpenAI API 호출 시 Token 사용량 추적
customMetrics
| where name == "ai.tokens.total"
| where timestamp > ago(1h)
| summarize 
    total_tokens = sum(value),
    total_requests = count()
| extend 
    avg_tokens_per_request = total_tokens / total_requests,
    estimated_cost_usd = total_tokens / 1000 * 0.002  // GPT-4 가격 예시
| where estimated_cost_usd > 10  // 시간당 $10 초과
| project total_tokens, total_requests, avg_tokens_per_request, estimated_cost_usd
```

**Action**: 비용 초과 시 개발팀 이메일 + Slack 알림

---

### 📧 알림 테스트 및 검증

#### 알림 테스트 방법

1. **수동 테스트**:
   - Alert rule → **"Test"** 버튼 클릭
   - 과거 데이터로 시뮬레이션

2. **실제 트리거**:
   ```bash
   # 의도적으로 에러 발생
   for i in {1..100}; do
     curl http://your-app/api/error
   done
   ```

3. **알림 히스토리 확인**:
   - Alerts → **"Alert History"**
   - Fired alerts, Resolved alerts 확인

---

### 🔔 알림 관리 및 모니터링

#### Alert Dashboard 생성

```kusto
// 알림 발생 현황
AzureActivity
| where CategoryValue == "Alert"
| where TimeGenerated > ago(7d)
| summarize alert_count = count() by bin(TimeGenerated, 1h), AlertRuleName
| render timechart
```

#### Alert 통계

```kusto
AzureActivity
| where CategoryValue == "Alert"
| where TimeGenerated > ago(30d)
| summarize 
    total_alerts = count(),
    critical_alerts = countif(Severity == "Critical"),
    avg_alerts_per_day = count() / 30
  by AlertRuleName
| order by total_alerts desc
```

---

### ✅ 알림 실습 과제

1. **필수 알림 3종 세트 구성**:
   - 에러율 > 5% (Critical)
   - 응답 시간 p95 > 2초 (Warning)
   - 의존성 실패율 > 10% (Error)

2. **AI Token 사용량 모니터링**:
   - 시간당 Token 사용량 추적
   - 일일 비용 예측 알림
   - 임계값 초과 시 Slack 알림

3. **사용자 행동 알림**:
   - 활성 사용자 20% 감소
   - 전환율 50% 하락
   - 신규 가입자 0명 (24시간)

4. **다단계 Escalation 구성**:
   - 1단계: 이메일 (Warning)
   - 2단계: SMS + 이메일 (Error)
   - 3단계: 전화 + SMS + 이메일 (Critical)

---

### Workbook 생성 - 사용자 행동 대시보드

Azure Portal → Application Insights → Workbooks → New

<div class="info" data-title="📘 Workbook이란?">

> **Azure Workbook**은 대화형 리포트 및 대시보드를 만들 수 있는 캔버스입니다. KQL 쿼리, 텍스트, 매개변수, 메트릭을 결합하여 풍부한 시각적 환경을 제공합니다.

</div>

#### 🛠️ Workbook 생성 단계별 가이드

**1단계: 새 Workbook 만들기**

1. Azure Portal → Application Insights 리소스 선택
2. 왼쪽 메뉴: **"Workbooks"** 클릭
3. 상단: **"+ New"** 버튼 클릭
4. 빈 템플릿 또는 샘플 템플릿 선택

**2단계: 편집 모드 진입**

- 상단 툴바에서 **"Edit"** 버튼 클릭
- **"+ Add"** 드롭다운에서 추가할 항목 선택:
  - **Add text**: 마크다운 텍스트 추가
  - **Add parameters**: 동적 필터 파라미터
  - **Add query**: KQL 쿼리 기반 차트
  - **Add metric**: Azure Monitor 메트릭
  - **Add group**: 섹션 그룹화

**3단계: 쿼리 블록 추가**

각 섹션마다 **"Add query"**를 클릭하고 다음 설정:

**쿼리 설정**:
- **Data source**: `Logs`
- **Resource type**: `Application Insights`
- **Log Analytics workspace**: 본인의 workspace 선택
- **Time Range**: `Last 24 hours` (또는 파라미터 사용)

**시각화 옵션**:
- **Visualization**: `Chart`, `Table`, `Tiles`, `Grid` 등 선택
- **Chart type**: `Line chart`, `Bar chart`, `Pie chart` 등
- **Size**: `Small`, `Medium`, `Large`, `Full`

**4단계: 파라미터로 동적 필터 추가**

```markdown
1. "Add parameters" 클릭
2. "Add Parameter" 버튼 클릭
3. 설정:
   - Parameter name: `TimeRange`
   - Parameter type: `Time range picker`
   - Required: ✅
   - Default value: `Last 24 hours`
4. "Save" 클릭
```

쿼리에서 파라미터 사용:
```kusto
requests
| where timestamp {TimeRange}  // 파라미터 적용
| summarize count() by bin(timestamp, 1h)
```

**5단계: 저장 및 공유**

1. 상단 **"Done Editing"** 클릭
2. **"Save"** 버튼 클릭
3. 저장 정보 입력:
   - **Title**: `사용자 행동 분석 대시보드`
   - **Subscription**: 본인 구독
   - **Resource group**: `rg-sk-appinsights`
   - **Location**: `Korea Central`
4. **"Apply"** 클릭

**6단계: 공유 및 권한 설정**

- **Share** 버튼: URL 링크 생성
- **Publish**: 팀원과 공유 가능한 공개 Workbook으로 게시
- **Pin to dashboard**: Azure Dashboard에 고정

---

#### 📊 실전 Workbook 템플릿

**대시보드 구성 예시**:

##### 1️⃣ **개요 섹션** (텍스트 + 타일)

**텍스트 블록** (Add text):
```markdown
# 📊 사용자 행동 분석 대시보드

실시간 사용자 활동, 성능 지표, 코호트 분석을 한눈에 확인하세요.

---
```

**KPI 타일** (Add query → Visualization: `Tiles`):
```kusto
let timeRange = ago(24h);
union
  (requests | where timestamp > timeRange),
  (pageViews | where timestamp > timeRange),
  (customEvents | where timestamp > timeRange)
| summarize 
    total_requests = countif(itemType == "request"),
    total_page_views = countif(itemType == "pageView"),
    total_events = countif(itemType == "customEvent"),
    unique_users = dcountif(user_Id, user_Id != "")
| extend 
    requests_per_user = round(1.0 * total_requests / unique_users, 1),
    pages_per_user = round(1.0 * total_page_views / unique_users, 1),
    events_per_user = round(1.0 * total_events / unique_users, 1)
```

**타일 설정**:
- **Visualization**: `Tiles`
- **Tile Settings**:
  - Left tile: `total_requests` (제목: "총 요청 수")
  - Title tile: `unique_users` (제목: "고유 사용자")
  - Right tile: `pages_per_user` (제목: "사용자당 페이지뷰")

##### 2️⃣ **성능 섹션** (시계열 차트)

**Add query** → Visualization: `Line chart`:
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

**차트 설정**:
- **Y축**: `request_count`, `avg_duration`, `error_rate` (다중 축)
- **X축**: `timestamp`
- **범례**: 하단 표시

##### 3️⃣ **사용자 행동 섹션** (히트맵)

**Add query** → Visualization: `Grid`:
```kusto
pageViews
| where timestamp > ago(7d)
| extend 
    hour = hourofday(timestamp),
    day = case(
        dayofweek(timestamp) == 0d, "일",
        dayofweek(timestamp) == 1d, "월",
        dayofweek(timestamp) == 2d, "화",
        dayofweek(timestamp) == 3d, "수",
        dayofweek(timestamp) == 4d, "목",
        dayofweek(timestamp) == 5d, "금",
        "토"
    )
| summarize page_views = count() by hour, day
| evaluate pivot(day, sum(page_views))
```

**Grid 설정**:
- **Column Settings**: 각 요일별 색상 그라데이션 적용
- **Heatmap**: 활성화 (낮음: 파랑, 높음: 빨강)

##### 4️⃣ **코호트 분석 섹션** (라인 차트)

**Add query** → Visualization: `Line chart`:


```kusto
// KPI 요약
let timeRange = ago(24h);
union
  (requests | where timestamp > timeRange),
  (pageViews | where timestamp > timeRange),
  (customEvents | where timestamp > timeRange)
| summarize 
    total_requests = countif(itemType == "request"),
    total_page_views = countif(itemType == "pageView"),
    total_events = countif(itemType == "customEvent"),
    unique_users = dcountif(user_Id, user_Id != "")
| extend 
    requests_per_user = round(1.0 * total_requests / unique_users, 1),
    pages_per_user = round(1.0 * total_page_views / unique_users, 1),
    events_per_user = round(1.0 * total_events / unique_users, 1)
```

#### 2️⃣ **성능 섹션**
```kusto
// 시간대별 트렌드
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

#### 3️⃣ **사용자 행동 섹션**
```kusto
// 페이지별 참여도 (히트맵)
pageViews
| where timestamp > ago(7d)
| extend 
    hour = hourofday(timestamp),
    day = dayofweek(timestamp) / 1d
| summarize page_views = count() by hour, day
| render columnchart
```

#### 4️⃣ **코호트 분석 섹션**
```kusto
// 유지율 차트
let users_by_day = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A"
| where timestamp > ago(30d)
| extend day = startofday(timestamp)
| summarize by user_id, day;

let first_day = users_by_day
| summarize first_day = min(day) by user_id;

users_by_day
| join kind=inner first_day on user_id
| extend days_since_first = datetime_diff('day', day, first_day)
| where days_since_first <= 30
| summarize user_count = dcount(user_id) by days_since_first
| order by days_since_first asc
| extend retention_pct = round(100.0 * user_count / first(user_count), 1)
| project days_since_first, retention_pct
```

**차트 설정**:
- **Y축**: `retention_pct` (단위: %)
- **X축**: `days_since_first` (Day 0, 1, 2, ... 30)
- **차트 타입**: Area chart

##### 5️⃣ **RFM 세그먼트 분포** (파이 차트)

**Add query** → Visualization: `Pie chart`:
```kusto
// 사용자 세그먼트 파이 차트
let current_date = now();
let user_activity = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where user_id != "N/A"
| where timestamp > ago(30d);

user_activity
| summarize 
    last_activity = max(timestamp),
    total_events = count(),
    distinct_days = dcount(startofday(timestamp))
  by user_id
| extend 
    recency_days = datetime_diff('day', current_date, last_activity),
    recency_score = case(recency_days <= 1, 5, recency_days <= 3, 4, recency_days <= 7, 3, recency_days <= 14, 2, 1),
    frequency_tier = case(total_events >= 100, 5, total_events >= 50, 4, total_events >= 20, 3, total_events >= 10, 2, 1),
    engagement_tier = case(distinct_days >= 20, 5, distinct_days >= 10, 4, distinct_days >= 5, 3, distinct_days >= 2, 2, 1)
| extend rfm_score = recency_score + frequency_tier + engagement_tier
| extend user_segment = case(
    rfm_score >= 13, "Champions",
    rfm_score >= 11, "Loyal Customers",
    rfm_score >= 9, "Potential Loyalists",
    rfm_score >= 7, "Recent Users",
    rfm_score >= 5, "At Risk",
    "Lost"
)
| summarize user_count = count() by user_segment
```

**파이 차트 설정**:
- **Value**: `user_count`
- **Category**: `user_segment`
- **범례 위치**: 오른쪽

---

#### 💡 Workbook 고급 기능

**1. 조건부 포맷팅**

```markdown
Column Settings에서:
- error_rate > 5 → 빨간색
- error_rate > 2 → 주황색
- error_rate <= 2 → 녹색
```

**2. 드릴다운 (클릭 상세보기)**

```markdown
Grid Settings → Make items exportable
또는
Tile Settings → Click action → Run query (상세 쿼리 실행)
```

**3. 링크 추가**

```kusto
requests
| extend detail_link = strcat("https://portal.azure.com/#@/resource", 
    "/subscriptions/.../providers/Microsoft.Insights/components/...")
```

**4. 템플릿 변수 활용**

```markdown
파라미터:
- {Subscription:subscriptions}
- {Workspace:workspaces}
- {TimeRange:timerange}
- {UserSegment:value} (custom)
```

**5. 자동 새로고침**

```markdown
Workbook 설정:
- Auto refresh: On
- Refresh interval: 5분
```

---

#### 📥 Workbook 내보내기 및 버전 관리

**JSON으로 내보내기**:
1. Workbook 편집 모드
2. 상단 **"Advanced Editor"** (</> 아이콘) 클릭
3. JSON 코드 복사
4. Git 저장소에 저장 (버전 관리)

**템플릿 재사용**:
```json
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 1,
      "content": {
        "json": "# 대시보드 제목"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests | summarize count()"
      }
    }
  ]
}
```

**GitHub에서 배포**:
```bash
# 워크북 JSON 파일 저장
git add azure-workbook.json
git commit -m "Add user behavior workbook"
git push

# Azure Portal에서 Import
Workbooks → Gallery → Upload
```

---

#### ✅ Workbook 실습 과제

1. **나만의 대시보드 만들기**:
   - 5개 섹션 구성 (개요, 성능, 사용자, 코호트, 에러)
   - 파라미터로 시간 범위 필터 추가
   - 타일, 차트, 그리드 각각 1개 이상 사용

2. **드릴다운 기능 구현**:
   - 세그먼트 클릭 → 해당 사용자 목록 표시
   - 에러 타일 클릭 → 상세 에러 로그 표시

3. **알림 연동**:
   - Workbook에서 이상 징후 발견 시
   - 알림 규칙 생성 링크 추가

---

### 자동화된 리포트 생성

**주간 리포트 쿼리**:
```kusto
// 지난 주 성과 요약
let this_week = ago(7d);
let last_week = ago(14d);

let this_week_metrics = requests
| where timestamp > this_week
| summarize 
    requests = count(),
    avg_duration = avg(duration),
    errors = countif(success == false);

let last_week_metrics = requests
| where timestamp between (last_week .. this_week)
| summarize 
    requests = count(),
    avg_duration = avg(duration),
    errors = countif(success == false);

union
  (this_week_metrics | extend period = "This Week"),
  (last_week_metrics | extend period = "Last Week")
| extend 
    error_rate = round(100.0 * errors / requests, 2),
    avg_duration_ms = round(avg_duration, 2)
| project period, requests, avg_duration_ms, errors, error_rate
```

**사용자 성장 리포트**:
```kusto
// 신규 vs 재방문 사용자
let period = 30d;
let all_users = pageViews
| where timestamp > ago(period)
| extend user_id = tostring(customDimensions["user_id"])
| where user_id != "N/A";

let first_seen = all_users
| summarize first_seen = min(timestamp) by user_id;

all_users
| join kind=inner first_seen on user_id
| extend days_since_first = datetime_diff('day', timestamp, first_seen)
| extend user_type = iif(days_since_first == 0, "New", "Returning")
| summarize user_count = dcount(user_id) by bin(timestamp, 1d), user_type
| render columnchart
```

## ✅ 실습 과제

### 과제 1: 개인화된 사용자 대시보드

**목표**: 각 사용자 세그먼트별 맞춤 분석 대시보드 생성

1. **Champions 세그먼트 분석**:
   ```kusto
   // 최고 등급 사용자의 행동 패턴
   // - 가장 많이 사용하는 기능
   // - 평균 세션 시간
   // - 선호하는 사용 시간대
   ```

2. **At Risk 사용자 재참여 전략**:
   ```kusto
   // 이탈 위험 사용자 식별 후
   // - 마지막 활동 시간
   // - 과거 선호 기능
   // - 재참여 유도 메시지 타겟팅
   ```

### 과제 2: 전환 퍼널 최적화

**목표**: 사용자 여정의 병목 지점 찾기

1. **단계별 이탈률 계산**:
   ```kusto
   // Landing → Dashboard → ETF List → Chat → Conversion
   // 각 단계에서 몇 %가 이탈하는가?
   ```

2. **이탈 원인 분석**:
   - 특정 단계에서 오래 머무르는가?
   - 에러가 발생하는가?
   - 특정 사용자 그룹에서 이탈률이 높은가?

### 과제 3: 커스텀 코호트 분석

**목표**: 월간 코호트 유지율 히트맵 생성

1. **월간 코호트 매트릭스**:
   ```kusto
   // 각 월별 신규 사용자 그룹이
   // 이후 각 월에 얼마나 돌아오는지 분석
   ```

2. **시각화**:
   ```
   Cohort    | Month 0 | Month 1 | Month 2 | Month 3
   ----------|---------|---------|---------|--------
   2024-08   | 100%    | 45%     | 32%     | 28%
   2024-09   | 100%    | 52%     | 38%     | -
   2024-10   | 100%    | 48%     | -       | -
   ```

### 과제 4: 기능 사용 히트맵

**목표**: 요일/시간대별 기능 사용 패턴 시각화

```kusto
// 각 기능이 언제 가장 많이 사용되는지
// 히트맵으로 시각화하여 서버 리소스 최적화
```

### 과제 5: 예측 분석 모델

**목표**: 사용자 이탈 예측 모델 구축

1. **특징(Feature) 추출**:
   - 최근 활동 일수
   - 총 이벤트 수
   - 세션 빈도
   - 페이지 뷰 수
   - 기능 사용 다양성

2. **위험 스코어 계산**:
   ```kusto
   // 각 특징에 가중치를 부여하여
   // 0-100 점수로 이탈 위험도 계산
   ```

3. **액션 플랜**:
   - 고위험 사용자: 즉시 개입
   - 중위험 사용자: 맞춤 컨텐츠 제공
   - 저위험 사용자: 정기 업데이트

### 과제 6: A/B 테스트 설계

**목표**: 새로운 기능의 효과 측정

1. **테스트 설계**:
   - 그룹 A: 기존 UI
   - 그룹 B: 새로운 UI

2. **측정 지표**:
   - 전환율 (Conversion Rate)
   - 클릭률 (CTR)
   - 사용 시간
   - 만족도 (간접 지표)

3. **통계적 유의성 검증**:
   ```kusto
   // 두 그룹 간 차이가 통계적으로 유의한가?
   // (샘플 크기, p-value 고려)
   ```

### 과제 7: 실시간 알림 시스템

**목표**: 비즈니스 크리티컬 이벤트 실시간 알림

1. **알림 규칙 설정**:
   - 신규 가입자 급증 (평소 대비 200% 이상)
   - 특정 기능 사용률 급락 (전일 대비 50% 이하)
   - 에러율 급증 (5% 초과)
   - 서버 응답 시간 증가 (p95 > 2초)

2. **알림 채널**:
   - 이메일
   - Teams/Slack 웹훅
   - SMS (긴급 상황)

### 보너스 과제: 머신러닝 통합

**목표**: Application Insights 데이터를 Azure ML과 연동

1. **데이터 내보내기**:
   ```kusto
   // Application Insights → Log Analytics → Azure ML
   ```

2. **예측 모델 학습**:
   - 사용자 이탈 예측
   - 다음 행동 예측
   - 이상 징후 탐지

3. **결과 피드백**:
   - 예측 결과를 다시 Application Insights로
   - customMetrics로 저장하여 모니터링

## 📚 핵심 정리

✅ **KQL 활용**:
- 강력한 데이터 분석 도구
- 실시간 인사이트 도출
- 자동화된 알림 설정

✅ **사용자 행동 분석**:
- **코호트 분석**: 시간 경과에 따른 사용자 그룹 추적
- **유지율(Retention)**: Day 1, Day 7, Day 30 재방문률
- **RFM 분석**: 사용자를 Champions, Loyal, At Risk 등으로 세분화
- **전환 퍼널**: 사용자 여정의 병목 지점 식별

✅ **고급 분석 기법**:
- **세션 분석**: 평균 세션 시간, 바운스율
- **세그먼트 분석**: 사용자 그룹별 행동 패턴
- **이탈 예측**: 위험 사용자 조기 식별
- **A/B 테스트**: 기능 개선 효과 측정

✅ **운영 자동화**:
- **실시간 알림**: 비즈니스 크리티컬 이벤트 감지
- **커스텀 대시보드**: Workbook으로 시각화
- **정기 리포트**: 주간/월간 성과 분석

### 🎯 분석 프레임워크

#### 1단계: 데이터 수집
- ✅ 자동 계측 (requests, dependencies, traces)
- ✅ 수동 추적 (pageViews, customEvents)
- ✅ 사용자 ID 및 세션 관리

#### 2단계: 기본 분석
- ✅ 성능 메트릭 (응답 시간, 에러율)
- ✅ 사용량 메트릭 (요청 수, 사용자 수)
- ✅ 가용성 모니터링

#### 3단계: 사용자 인사이트
- ✅ 페이지별 참여도
- ✅ 기능 사용 패턴
- ✅ 사용자 여정 분석

#### 4단계: 코호트 및 세그먼트
- ✅ 유지율 추적
- ✅ RFM 세그먼테이션
- ✅ 이탈 위험 예측

#### 5단계: 액션 및 최적화
- ✅ 자동 알림
- ✅ 대시보드 공유
- ✅ 데이터 기반 의사결정

### 💡 모범 사례

**DO** ✅:
- 비즈니스 KPI와 연결된 메트릭 추적
- 사용자 ID로 개인화된 분석
- 정기적인 코호트 분석으로 유지율 모니터링
- 세그먼트별 맞춤 전략 수립
- 알림을 통한 즉각적인 대응

**DON'T** ❌:
- 너무 많은 메트릭으로 복잡도 증가
- 사용자 개인정보 과도하게 수집
- 알림 피로도(Alert Fatigue) 유발
- 데이터만 보고 액션 없음
- 일회성 분석으로 끝

### 📊 성공 지표 예시

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| **Day 1 Retention** | > 40% | 신규 사용자 중 다음 날 재방문 |
| **Day 7 Retention** | > 20% | 첫 주 후 재방문률 |
| **Day 30 Retention** | > 10% | 첫 달 후 유지율 |
| **전환율** | > 15% | 방문자 중 핵심 액션 완료 |
| **세션 시간** | > 5분 | 평균 세션 체류 시간 |
| **바운스율** | < 50% | 한 페이지만 보고 이탈 |
| **Champions 비율** | > 15% | 전체 사용자 중 최고 등급 |
| **At Risk 전환** | > 30% | 위험 사용자의 재참여 성공률 |

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



