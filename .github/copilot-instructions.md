# 핵심 규칙
- 프로젝트명: etf-agent
- https://github.com/Finnhub-Stock-API/finnhub-python 라이브러리를 사용하여 핀허브 API와 상호작용
- FastAPI를 사용하여 API 서버 구축
- Cosmos DB를 사용하여 데이터 저장 및 관리
- React를 사용하여 대시보드 구축 
- Application Insights를 사용하여 애플리케이션 모니터링 및 로깅
- ETF 및 주식 종목 데이터를 핀허브 API에서 주기적으로 가져와 Cosmos DB에 저장
- 대시보드를 통해 ETF 및 주식 종목 데이터를 시각화 및 분석

## UI 구성
- 대시보드에는 다음과 같은 섹션이 포함되어야 함
  - ETF 종목 목록(티커, 가격, 배당율, 시가총액 등)
  - 개별 주식 종목 상세 정보 (가격, 거래량, 뉴스 등)
  - 주식 뉴스 피드
  - 데이터 시각화 (차트, 그래프 등)
  - agent 에게 질문할 수 있는 채팅 인터페이스

## 개발환경
- Python 3.13 이상
- uv 로 패키지 관리
- 필요한 환경변수는 .env 파일에 정의
- Semantic Kernel 사용
- Finnhub Python 라이브러리
- FastAPI
- Cosmos DB
- Application Insights
    - 필요한 패키지 목록:
        - opentelemetry-api
        - opentelemetry-sdk
        - azure-core-tracing-opentelemetry
        - azure-monitor-opentelemetry
        - azure-monitor-opentelemetry-exporter
        - opentelemetry-instrumentation-httpx
        - opentelemetry-instrumentation-fastapi
        - opentelemetry-instrumentation-openai
- React (대시보드 프론트엔드)
- /src 폴더 아래에 모든 코드 위치, observability 관련 코드는 /src/observability 폴더에 위치
- frontend 코드는 /frontend 폴더에 위치
- 폴더 구조:
    ```
    /src
      /observability
      main.py
      ...
    /frontend
      package.json
      ...
    ```



## 가상환경
- .venv 디렉토리가 가상환경이다. 실행전에 반드시 활성화 해야한다.
- 가상환경을 위해서는 다음 스크립트를 사용한다.
    ```
    # Ubuntu
    python3 -m venv .venv
    source .venv/bin/activate
    uv install python 3.13
    ```

## 대화 규칙
- 반드시 한국어만 사용
- 이모지 최소화
- 완료시 "완료" 라고 대답



