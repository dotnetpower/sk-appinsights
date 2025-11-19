# 사용자 행동 분석 가이드

이 문서는 ETF Agent 애플리케이션에서 구현된 사용자 행동 분석 기능과 Application Insights에서 데이터를 조회하는 방법을 설명합니다.

## 📊 수집되는 데이터

### 1. 페이지 뷰 (Page Views)
각 페이지의 방문 및 체류 시간을 추적합니다.

**수집 데이터:**
- `name`: 페이지 이름 (Dashboard, ETF List, Stock Detail, News Feed, AI Chat)
- `url`: 페이지 URL
- `duration`: 페이지 체류 시간 (밀리초)
- `customDimensions.user_id`: 사용자 고유 ID
- `customDimensions.session_id`: 세션 ID
- `timestamp`: 이벤트 발생 시간

**저장 위치**: **pageViews** 테이블

### 2. 사용자 이벤트 (User Events)
사용자의 상호작용을 추적합니다.

**이벤트 유형:**
- `tab_changed`: 탭 변경
- `button_click`: 버튼 클릭
- `search`: 검색 수행
- `filter_applied`: 필터 적용
- `etf_view`: ETF 상세 조회
- `chat_message_sent`: 채팅 메시지 전송

**수집 속성:**
- `name`: 이벤트 이름
- `customDimensions.event_category`: 이벤트 카테고리 (navigation, interaction, search, content)
- `customDimensions.user_id`: 사용자 ID
- `customDimensions.session_id`: 세션 ID
- 이벤트별 추가 속성

**저장 위치**: **customEvents** 테이블

## 🔍 Application Insights에서 데이터 조회

### Azure Portal 접속
1. [Azure Portal](https://portal.azure.com) 로그인
2. Application Insights 리소스로 이동
3. 왼쪽 메뉴에서 "Logs" 선택

### 데이터 저장 위치
Application Insights는 사용자 행동 데이터를 다음 테이블에 저장합니다:
- **pageViews**: 페이지 뷰 추적 (`track_page_view()` 호출)
- **customEvents**: 사용자 이벤트 추적 (`track_user_event()` 호출)
- **customMetrics**: 메트릭 집계 (페이지 뷰 카운터, 체류 시간 등)

### KQL 쿼리 예제

#### 1. 페이지별 평균 체류 시간 분석
```kusto
pageViews
| where duration > 0
| summarize 
    avg_duration_ms = avg(duration),
    median_duration_ms = percentile(duration, 50),
    p90_duration_ms = percentile(duration, 90),
    total_views = count()
  by name
| extend avg_duration_seconds = avg_duration_ms / 1000
| order by avg_duration_ms desc
```

#### 2. 페이지별 방문 횟수
```kusto
pageViews
| summarize view_count = count() by name
| order by view_count desc
| render piechart
```

#### 3. 사용자별 활동 분석
```kusto
// 페이지 뷰 + 이벤트 통합 분석
union
  (pageViews | extend user_id = tostring(customDimensions["user_id"]), event_type = "page_view"),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]), event_type = "user_event")
| where isnotnull(user_id) and user_id != "N/A"
| summarize 
    total_events = count(),
    page_views = countif(event_type == "page_view"),
    user_events = countif(event_type == "user_event"),
    first_seen = min(timestamp),
    last_seen = max(timestamp)
  by user_id
| extend active_days = datetime_diff('day', last_seen, first_seen) + 1
| order by total_events desc
```

#### 4. 시간대별 활동 분석
```kusto
union
  (pageViews | extend event_type = "Page View"),
  (customEvents | extend event_type = "User Event")
| summarize event_count = count() by bin(timestamp, 1h), event_type
| render timechart
```

#### 5. 탭 전환 패턴 분석
```kusto
customEvents
| where name == "tab_changed"
| extend 
    from_tab = tostring(customDimensions["from_tab"]),
    to_tab = tostring(customDimensions["to_tab"])
| summarize transitions = count() by from_tab, to_tab
| order by transitions desc
```

#### 6. 세션별 활동 분석
```kusto
pageViews
| extend session_id = tostring(customDimensions["session_id"])
| where isnotnull(session_id)
| summarize 
    page_count = count(),
    unique_pages = dcount(name),
    total_duration_ms = sum(duration),
    first_event = min(timestamp),
    last_event = max(timestamp)
  by session_id
| extend 
    session_duration = last_event - first_event,
    session_duration_minutes = (last_event - first_event) / 1m,
    avg_page_duration_seconds = total_duration_ms / page_count / 1000
| order by page_count desc
```

## 📈 코호트 분석 (Cohort Analysis)

코호트 분석을 통해 사용자 그룹의 행동 패턴과 유지율을 분석할 수 있습니다.

### 1. 주간 코호트 분석
```kusto
let cohort_analysis = union
  (pageViews | extend user_id = tostring(customDimensions["user_id"])),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]))
| where isnotnull(user_id)
| summarize 
    first_seen = min(timestamp),
    last_seen = max(timestamp)
  by user_id
| extend cohort_week = startofweek(first_seen)
| extend weeks_since_first = datetime_diff('week', last_seen, first_seen);
cohort_analysis
| summarize user_count = dcount(user_id) by cohort_week, weeks_since_first
| order by cohort_week asc, weeks_since_first asc
```

### 2. 신규 vs 재방문 사용자
```kusto
pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where isnotnull(user_id)
| summarize 
    first_visit = min(timestamp),
    total_visits = count()
  by user_id
| extend user_type = case(
    total_visits == 1, "New User",
    total_visits <= 5, "Occasional User",
    "Regular User"
  )
| summarize user_count = dcount(user_id) by user_type
| render piechart
```

### 3. 사용자 유지율 (Retention Rate)
```kusto
let users_by_day = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where isnotnull(user_id)
| extend day = startofday(timestamp)
| summarize by user_id, day;
let first_day = users_by_day
| summarize first_day = min(day) by user_id;
users_by_day
| join kind=inner first_day on user_id
| extend days_since_first = datetime_diff('day', day, first_day)
| summarize user_count = dcount(user_id) by days_since_first
| order by days_since_first asc
| extend retention_rate = round(100.0 * user_count / prev(user_count, 1), 2)
```

### 4. 기능별 사용자 세그먼트
```kusto
customEvents
| extend user_id = tostring(customDimensions["user_id"])
| where isnotnull(user_id)
| summarize events = make_set(name) by user_id
| extend 
    uses_chat = events has "chat_message_sent",
    uses_search = events has "search",
    uses_filter = events has "filter_applied"
| summarize 
    total_users = dcount(user_id),
    chat_users = dcountif(user_id, uses_chat),
    search_users = dcountif(user_id, uses_search),
    filter_users = dcountif(user_id, uses_filter)
| extend 
    chat_adoption = round(100.0 * chat_users / total_users, 2),
    search_adoption = round(100.0 * search_users / total_users, 2),
    filter_adoption = round(100.0 * filter_users / total_users, 2)
```

## 📊 추천 대시보드 쿼리

### 1. 실시간 활동 모니터링
```kusto
union
  (pageViews | extend event_type = "Page View"),
  (customEvents | extend event_type = "User Event")
| where timestamp > ago(1h)
| summarize event_count = count() by bin(timestamp, 5m), event_type
| render timechart
```

### 2. 인기 페이지 TOP 5
```kusto
pageViews
| where timestamp > ago(7d)
| summarize 
    view_count = count(),
    avg_duration_ms = avg(duration)
  by name
| extend avg_duration_seconds = avg_duration_ms / 1000
| top 5 by view_count desc
```

### 3. 사용자 여정 (User Journey)
```kusto
union
  (pageViews 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]),
        detail = name,
        event_type = "PageView"),
  (customEvents 
    | extend 
        user_id = tostring(customDimensions["user_id"]),
        session_id = tostring(customDimensions["session_id"]),
        detail = name,
        event_type = "Event")
| where isnotnull(session_id)
| order by timestamp asc
| project timestamp, session_id, user_id, event_type, detail
| take 100
```

## 🎯 비즈니스 인사이트 쿼리

### 1. 이탈률 분석 (Bounce Rate)
```kusto
pageViews
| extend session_id = tostring(customDimensions["session_id"])
| where isnotnull(session_id)
| summarize 
    page_count = dcount(name),
    first_page = any(name)
  by session_id
| extend is_bounce = page_count == 1
| summarize 
    total_sessions = count(),
    bounce_sessions = countif(is_bounce)
| extend bounce_rate = round(100.0 * bounce_sessions / total_sessions, 2)
```

### 2. 평균 세션 길이
```kusto
pageViews
| extend session_id = tostring(customDimensions["session_id"])
| where isnotnull(session_id)
| summarize 
    session_start = min(timestamp),
    session_end = max(timestamp)
  by session_id
| extend session_duration = session_end - session_start
| summarize avg_duration_minutes = avg(session_duration) / 1m
```

### 3. 전환 깔때기 (Conversion Funnel)
```kusto
let all_users = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where isnotnull(user_id)
| distinct user_id;
let dashboard_users = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where name == "Dashboard" and isnotnull(user_id)
| distinct user_id;
let etf_users = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where name == "ETF List" and isnotnull(user_id)
| distinct user_id;
let chat_users = pageViews
| extend user_id = tostring(customDimensions["user_id"])
| where name == "AI Chat" and isnotnull(user_id)
| distinct user_id;
union 
  (all_users | summarize step = "All Users", user_count = count()),
  (dashboard_users | summarize step = "Dashboard", user_count = count()),
  (etf_users | summarize step = "ETF List", user_count = count()),
  (chat_users | summarize step = "AI Chat", user_count = count())
| order by user_count desc
```

## 🔧 디버깅 쿼리

### 모든 customDimensions 확인
```kusto
// pageViews 확인
pageViews
| take 10
| project timestamp, name, url, duration, customDimensions

// customEvents 확인
customEvents
| take 10
| project timestamp, name, customDimensions, customMeasurements
```

### 특정 사용자 추적
```kusto
let target_user = "user_123...";  // 사용자 ID 입력
union
  (pageViews | extend user_id = tostring(customDimensions["user_id"]), event_type = "PageView"),
  (customEvents | extend user_id = tostring(customDimensions["user_id"]), event_type = "Event")
| where user_id == target_user
| order by timestamp asc
| project timestamp, event_type, name, customDimensions
```

## 🛠️ 커스텀 이벤트 추가 방법

프론트엔드에서 새로운 이벤트를 추적하려면:

```typescript
import { trackEvent } from './services/analytics';
import { getUserId } from './hooks/usePageTracking';

// 사용자 이벤트 추적
trackEvent({
  event_name: 'custom_action',
  event_category: 'interaction',
  user_id: getUserId(),
  session_id: sessionStorage.getItem('etf_agent_session_id') || '',
  properties: {
    // 커스텀 속성
    action_type: 'example',
    value: 123,
  },
});
```

## 📌 참고사항

1. **데이터 저장**: 페이지 뷰는 **pageViews** 테이블, 사용자 이벤트는 **customEvents** 테이블에 저장됩니다
2. **사용자 ID**: localStorage에 저장되는 고유 ID로 사용자를 추적합니다
3. **세션 ID**: sessionStorage에 저장되며 브라우저 탭을 닫으면 초기화됩니다
4. **데이터 보존**: Application Insights 기본 보존 기간은 90일입니다
5. **실시간 데이터**: 데이터가 Application Insights에 나타나기까지 1-2분 소요될 수 있습니다
6. **샘플링**: 대량의 데이터가 발생하면 Application Insights가 자동으로 샘플링을 적용할 수 있습니다
7. **KQL 예약어**: `views`, `events` 등은 예약어이므로 alias로 `view_count`, `event_count` 사용
8. **필드 접근**: customDimensions는 `customDimensions["user_id"]` 형식으로 접근합니다

## 📧 문의

추가 분석이 필요하거나 질문이 있으시면 개발팀에 문의하세요.
