# ETF Agent 실행 가이드

## 필수 환경 설정

### 1. 환경변수 설정

`.env` 파일을 편집하여 아래 값들을 입력하세요:

```bash
# Application Insights - Azure Portal에서 생성
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key;IngestionEndpoint=...

# Finnhub API - https://finnhub.io/dashboard 에서 발급
FINNHUB_API_KEY=your_finnhub_api_key

# Azure Cosmos DB - Azure Portal에서 생성
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE_NAME=etf-agent
COSMOS_CONTAINER_NAME=etf-data

# OpenAI API - https://platform.openai.com/api-keys 에서 발급
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# FastAPI 서버 설정
API_HOST=0.0.0.0
API_PORT=8000

# React 프론트엔드 설정
REACT_APP_API_URL=http://localhost:8000
```

### 2. Backend 서버 실행

```bash
# 가상환경 활성화
source .venv/bin/activate

# FastAPI 서버 시작 (개발 모드)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

서버가 시작되면:
- API 서버: http://localhost:8000
- API 문서 (Swagger): http://localhost:8000/docs
- Alternative API 문서 (ReDoc): http://localhost:8000/redoc

### 3. Frontend 대시보드 실행

```bash
# frontend 디렉토리로 이동
cd frontend

# 개발 서버 시작
npm start
```

대시보드가 열리면:
- 대시보드: http://localhost:3000

## 주요 기능

### 1. 대시보드 탭
- 주요 지수 (SPY, QQQ, DIA) 실시간 시세
- 최근 시장 뉴스 피드

### 2. ETF 목록 탭
- 데이터베이스에 저장된 ETF 목록 조회
- 각 ETF의 현재가, 변동률 표시
- 개별 ETF 데이터 새로고침 기능

### 3. 주식 상세 탭
- 심볼로 주식/ETF 검색
- 기업 정보 (회사명, 국가, 산업, 시가총액)
- 실시간 시세 (현재가, 변동, 고가/저가)
- 최근 30일 가격 차트

### 4. 뉴스 피드 탭
- 카테고리별 시장 뉴스 (일반, 외환, 암호화폐, 인수합병)
- 뉴스 제목, 요약, 출처, 시간 표시

### 5. AI 채팅 탭
- Semantic Kernel 기반 AI 에이전트
- 주식/ETF 정보 질의응답
- 실시간 데이터 조회 및 분석

## API 엔드포인트

### ETF
- `GET /api/etf/list?limit=20` - ETF 목록
- `GET /api/etf/{symbol}` - ETF 상세 정보
- `GET /api/etf/{symbol}/holdings` - ETF 보유 종목
- `POST /api/etf/{symbol}/refresh` - ETF 데이터 새로고침

### 주식
- `GET /api/stocks/{symbol}` - 주식 상세 정보
- `GET /api/stocks/{symbol}/quote` - 실시간 시세
- `GET /api/stocks/{symbol}/news?days=7` - 주식 뉴스
- `GET /api/stocks/{symbol}/candles?resolution=D&days=30` - 차트 데이터
- `GET /api/stocks/search?q={query}` - 심볼 검색

### 뉴스
- `GET /api/news/market?category=general&limit=20` - 시장 뉴스

### 채팅
- `POST /api/chat/` - AI 에이전트 채팅
- `POST /api/chat/reset` - 대화 히스토리 리셋

## 트러블슈팅

### Backend 오류

**API 키 오류**
```
Warning: APPLICATIONINSIGHTS_CONNECTION_STRING not set
Warning: FINNHUB_API_KEY not set
```
→ `.env` 파일에 필수 환경변수를 설정하세요.

**Cosmos DB 연결 오류**
```
Error initializing Cosmos DB
```
→ Cosmos DB 엔드포인트와 키를 확인하세요.
→ Azure Portal에서 Cosmos DB 계정과 데이터베이스를 먼저 생성하세요.

### Frontend 오류

**API 연결 오류**
```
Network Error
```
→ Backend 서버가 실행 중인지 확인하세요.
→ `.env` 파일의 `REACT_APP_API_URL`이 올바른지 확인하세요.

## 개발 팁

1. **Backend 자동 재시작**: `uvicorn`의 `--reload` 옵션으로 코드 변경 시 자동 재시작
2. **Frontend 핫 리로드**: React 개발 서버는 자동으로 변경사항을 반영
3. **API 테스트**: http://localhost:8000/docs 에서 Swagger UI로 API 테스트
4. **로그 확인**: 터미널에서 실시간 로그 확인 가능
5. **Application Insights**: Azure Portal에서 텔레메트리 데이터 모니터링

## 다음 단계

1. `.env` 파일에 실제 API 키 입력
2. Azure에서 필요한 리소스 생성 (Application Insights, Cosmos DB)
3. Backend 서버 실행
4. Frontend 대시보드 실행
5. 대시보드에서 주식 조회 테스트
6. AI 채팅으로 질문해보기
