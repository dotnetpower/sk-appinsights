# traces 테이블 로그 수집 확인 가이드

## 수정 사항

### 1. telemetry.py 수정
- `configure_azure_monitor` 호출 시 `logger_name` 파라미터 제거
- 루트 로거와 애플리케이션 로거들의 레벨을 INFO로 명시적 설정
- 로깅 핸들러 설정 확인 메시지 추가

### 2. main.py 수정
- `setup_telemetry()` 호출을 `logging.basicConfig()` **전에** 실행
- `logging.basicConfig()`에 `force=True` 추가하여 기존 핸들러 유지
- 텔레메트리 설정 → 로깅 설정 → 미들웨어 설정 순서로 변경

## 작동 원리

1. `configure_azure_monitor()`가 자동으로 Python 로깅 핸들러를 설정
2. 모든 `logger.info()`, `logger.warning()`, `logger.error()` 호출이 Application Insights로 전송
3. traces 테이블에 자동으로 기록됨

## 확인 방법

### 1. 테스트 스크립트 실행
```bash
source .venv/bin/activate
python test_traces.py
```

성공 메시지:
```
Transmission succeeded: Item received: 8. Items accepted: 8
```

### 2. Application Insights에서 확인

**Azure Portal > Application Insights > Logs**에서 다음 KQL 쿼리 실행:

```kql
traces
| where timestamp > ago(5m)
| order by timestamp desc
| project timestamp, message, severityLevel, customDimensions
```

### 3. Live Metrics에서 실시간 확인

**Azure Portal > Application Insights > Live Metrics**

- 서버 실행 중 실시간으로 로그 확인 가능
- 요청 처리, 에러, 로그 메시지가 실시간으로 표시됨

## 로그 레벨별 severityLevel 매핑

| Python 로그 레벨 | Application Insights severityLevel |
|-----------------|-----------------------------------|
| DEBUG           | 0 (Verbose)                       |
| INFO            | 1 (Information)                   |
| WARNING         | 2 (Warning)                       |
| ERROR           | 3 (Error)                         |
| CRITICAL        | 4 (Critical)                      |

## 구조화된 로그 전송

```python
logger.info(
    "사용자 작업 완료",
    extra={
        "custom_dimensions": {
            "user_id": "user123",
            "operation": "create_order",
            "status": "success"
        }
    }
)
```

KQL 쿼리:
```kql
traces
| where customDimensions.user_id == "user123"
| where customDimensions.operation == "create_order"
```

## 주의사항

1. **로그 표시 지연**: 로그가 traces 테이블에 표시되기까지 1-2분 소요
2. **Live Metrics**: 실시간 확인이 필요하면 Live Metrics 사용
3. **로그 레벨**: INFO 이상만 수집됨 (DEBUG는 수집 안 됨)
4. **비용**: 대량의 로그는 비용 증가 가능성 있음

## 다음 단계

서버를 재시작하고 API 요청을 보내면:
- `/api/etf` → requests 테이블
- 미들웨어 로그 → traces 테이블
- 외부 API 호출 → dependencies 테이블

모두 자동으로 수집됩니다.
