# ETF Agent

ETF 및 주식 종목 데이터 분석 에이전트 프로젝트

## 프로젝트 구조

```
sk-appinsights/
├── src/                          # Backend 소스 코드
│   ├── observability/            # Application Insights 및 OpenTelemetry
│   │   ├── __init__.py
│   │   └── telemetry.py
│   ├── __init__.py
│   └── main.py                   # FastAPI 서버 진입점
├── frontend/                     # React 대시보드
│   ├── public/
│   ├── src/
│   └── package.json
├── .env                          # 환경변수 (실제 값)
├── .env.example                  # 환경변수 템플릿
├── pyproject.toml                # Python 프로젝트 설정
└── README.md
```

## 기술 스택

### Backend
- **Python 3.13+**
- **FastAPI**: REST API 서버
- **Semantic Kernel**: AI 에이전트 프레임워크
- **Finnhub Python**: 주식 데이터 API
- **Azure Cosmos DB**: 데이터 저장소
- **Application Insights**: 모니터링 및 로깅
- **OpenTelemetry**: 분산 추적

### Frontend
- **React with TypeScript**
- **대시보드 기능**:
  - ETF 종목 목록
  - 개별 주식 상세 정보
  - 주식 뉴스 피드
  - 데이터 시각화
  - AI 에이전트 채팅 인터페이스

## 설치 및 실행

### 1. 가상환경 활성화

```bash
source .venv/bin/activate
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 필요한 값을 입력하세요:

```bash
cp .env.example .env
# .env 파일을 편집하여 실제 API 키와 연결 문자열을 입력
```

필수 환경변수:
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Application Insights 연결 문자열
- `FINNHUB_API_KEY`: Finnhub API 키
- `COSMOS_ENDPOINT`: Cosmos DB 엔드포인트
- `COSMOS_KEY`: Cosmos DB 키
- `OPENAI_API_KEY`: OpenAI API 키 (또는 Azure OpenAI)

### 3. Backend 실행

```bash
# 개발 모드
uvicorn src.main:app --reload

# 또는
python -m src.main
```

API 서버: http://localhost:8000
API 문서: http://localhost:8000/docs

### 4. Frontend 실행

```bash
cd frontend
npm start
```

대시보드: http://localhost:3000

## 개발

### Backend 패키지 추가

```bash
uv add <package-name>
```

### Frontend 패키지 추가

```bash
cd frontend
npm install <package-name>
```

### 코드 포맷팅

```bash
# Backend
black src/
ruff check src/

# Frontend
cd frontend
npm run lint
```

## VSCode 설정

`Ctrl + /` 로 지침 파일 명시적으로 지정

## 라이선스

MIT License