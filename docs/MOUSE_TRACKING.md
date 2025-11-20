# 마우스 위치 추적 및 히트맵 분석

## 개요

사용자의 마우스 움직임, 클릭, 호버 위치를 추적하여 화면에서 어떤 영역을 선호하는지 분석하는 기능입니다. 히트맵 데이터로 활용하여 UI/UX 개선에 활용할 수 있습니다.

## 주요 기능

### 1. 마우스 이동 추적 (`useMouseTracking`)

사용자의 마우스 움직임을 샘플링하여 화면 영역별 방문 횟수를 집계합니다.

**추적 데이터:**
- 절대 좌표 (x, y)
- 상대 좌표 (0~1 범위)
- 화면 영역 (3x3 그리드)
- 뷰포트 크기
- 타임스탬프

**화면 영역 (Zone) 구분:**
```
┌──────────────┬──────────────┬──────────────┐
│  top-left    │  top-center  │  top-right   │
├──────────────┼──────────────┼──────────────┤
│ middle-left  │middle-center │ middle-right │
├──────────────┼──────────────┼──────────────┤
│ bottom-left  │bottom-center │ bottom-right │
└──────────────┴──────────────┴──────────────┘
```

### 2. 클릭 위치 추적

사용자가 클릭한 정확한 위치와 클릭된 요소 정보를 기록합니다.

**추적 정보:**
- 클릭 좌표
- 화면 영역
- 클릭된 HTML 요소 (태그, ID, 클래스명, 텍스트 일부)

### 3. 호버 추적

사용자가 특정 위치에 일정 시간 이상 머문 경우를 감지합니다.

**기본 설정:**
- 호버 인식 시간: 2초
- 각 호버 이벤트의 위치와 영역 기록

### 4. 스크롤 위치 추적 (`useScrollTracking`)

사용자가 페이지를 어디까지 스크롤했는지 추적합니다.

**추적 데이터:**
- 현재 스크롤 위치 (%)
- 최대 스크롤 깊이
- 페이지 전체 높이

## 사용법

### 기본 사용

```typescript
import { useMouseTracking, useScrollTracking } from '../hooks/useMouseTracking';

function MyComponent() {
  const userId = 'user_123';
  const sessionId = 'session_456';
  const pageName = 'Dashboard';

  // 마우스 추적
  useMouseTracking({
    userId,
    sessionId,
    pageName,
    samplingInterval: 1000, // 1초마다 샘플링
    trackClicks: true,
    trackHover: true,
    hoverThreshold: 2000, // 2초 이상 머물면 호버
  });

  // 스크롤 추적
  useScrollTracking({
    userId,
    sessionId,
    pageName,
    samplingInterval: 2000, // 2초마다 샘플링
  });

  return <div>My Component</div>;
}
```

### App.tsx 통합 예시

```typescript
function App() {
  const [userId] = useState(() => getUserId());
  const currentPage = 'Dashboard';
  const { sessionId } = usePageTracking(currentPage, userId);

  // 마우스 및 스크롤 추적
  useMouseTracking({
    userId,
    sessionId,
    pageName: currentPage,
    samplingInterval: 1000,
    trackClicks: true,
    trackHover: true,
    hoverThreshold: 2000,
  });

  useScrollTracking({
    userId,
    sessionId,
    pageName: currentPage,
  });

  return <div>App Content</div>;
}
```

### 옵션 설정

```typescript
interface MouseTrackingOptions {
  userId?: string;
  sessionId?: string;
  pageName: string;
  samplingInterval?: number;    // 기본값: 1000ms
  trackClicks?: boolean;         // 기본값: true
  trackHover?: boolean;          // 기본값: true
  hoverThreshold?: number;       // 기본값: 2000ms
}
```

## 수집되는 데이터

### 1. 마우스 이동 요약 (30초마다 전송)

```json
{
  "event_name": "mouse_movement_summary",
  "event_category": "mouse_interaction",
  "user_id": "user_12345",
  "session_id": "session_67890",
  "properties": {
    "page_name": "Dashboard",
    "total_samples": 30,
    "zone_visits": {
      "top-left": 5,
      "top-center": 8,
      "top-right": 3,
      "middle-left": 4,
      "middle-center": 7,
      "middle-right": 2,
      "bottom-left": 1,
      "bottom-center": 0,
      "bottom-right": 0
    },
    "most_visited_zone": "top-center",
    "most_visited_count": 8,
    "click_count": 3,
    "hover_count": 2,
    "viewport_width": 1920,
    "viewport_height": 1080,
    "timestamp": "2025-11-20T10:30:00.000Z"
  }
}
```

### 2. 클릭 이벤트

```json
{
  "event_name": "mouse_click",
  "event_category": "mouse_interaction",
  "properties": {
    "page_name": "Dashboard",
    "x": 450,
    "y": 320,
    "relative_x": 0.234,
    "relative_y": 0.296,
    "zone": "middle-left",
    "viewport_width": 1920,
    "viewport_height": 1080,
    "element": {
      "tag": "BUTTON",
      "id": "submit-btn",
      "className": "btn btn-primary",
      "textContent": "Submit"
    },
    "timestamp": "2025-11-20T10:30:00.000Z"
  }
}
```

### 3. 호버 이벤트

```json
{
  "event_name": "mouse_hover",
  "event_category": "mouse_interaction",
  "properties": {
    "page_name": "Dashboard",
    "x": 960,
    "y": 540,
    "relative_x": 0.5,
    "relative_y": 0.5,
    "zone": "middle-center",
    "viewport_width": 1920,
    "viewport_height": 1080,
    "hover_duration_ms": 2000,
    "timestamp": "2025-11-20T10:30:00.000Z"
  }
}
```

### 4. 스크롤 위치

```json
{
  "event_name": "scroll_position",
  "event_category": "scroll_interaction",
  "properties": {
    "page_name": "Dashboard",
    "scroll_percentage": 45.5,
    "max_scroll_depth": 67.8,
    "scroll_top": 800,
    "scroll_height": 2560,
    "client_height": 1080,
    "timestamp": "2025-11-20T10:30:00.000Z"
  }
}
```

## Application Insights에서 분석하기

### KQL 쿼리 예시

#### 1. 페이지별 선호 영역 분석

```kql
customEvents
| where name == "mouse_movement_summary"
| extend page_name = tostring(customDimensions.page_name)
| extend zone_visits = parse_json(tostring(customDimensions.zone_visits))
| extend most_visited = tostring(customDimensions.most_visited_zone)
| summarize 
    total_users = dcount(user_Id),
    avg_samples = avg(tolong(customDimensions.total_samples))
    by page_name, most_visited
| order by total_users desc
```

#### 2. 클릭 히트맵 데이터

```kql
customEvents
| where name == "mouse_click"
| extend page_name = tostring(customDimensions.page_name)
| extend zone = tostring(customDimensions.zone)
| extend x = tolong(customDimensions.x)
| extend y = tolong(customDimensions.y)
| extend viewport_width = tolong(customDimensions.viewport_width)
| extend viewport_height = tolong(customDimensions.viewport_height)
| project 
    timestamp,
    page_name,
    zone,
    x,
    y,
    viewport_width,
    viewport_height,
    user_Id
| order by timestamp desc
```

#### 3. 영역별 클릭 분포

```kql
customEvents
| where name == "mouse_click"
| extend page_name = tostring(customDimensions.page_name)
| extend zone = tostring(customDimensions.zone)
| summarize 
    click_count = count(),
    unique_users = dcount(user_Id)
    by page_name, zone
| order by click_count desc
```

#### 4. 호버 패턴 분석

```kql
customEvents
| where name == "mouse_hover"
| extend page_name = tostring(customDimensions.page_name)
| extend zone = tostring(customDimensions.zone)
| extend hover_duration = tolong(customDimensions.hover_duration_ms)
| summarize 
    hover_count = count(),
    avg_hover_duration_sec = avg(hover_duration) / 1000
    by page_name, zone
| order by hover_count desc
```

#### 5. 스크롤 깊이 분석

```kql
customEvents
| where name == "scroll_tracking_cleanup"
| extend page_name = tostring(customDimensions.page_name)
| extend max_depth = toreal(customDimensions.max_scroll_depth)
| summarize 
    avg_scroll_depth = avg(max_depth),
    users_reached_bottom = countif(max_depth > 90),
    total_users = count()
    by page_name
| extend bottom_reach_rate = (users_reached_bottom * 100.0) / total_users
| order by avg_scroll_depth desc
```

#### 6. 시간대별 마우스 활동

```kql
customEvents
| where name in ("mouse_click", "mouse_hover", "mouse_movement_summary")
| extend page_name = tostring(customDimensions.page_name)
| summarize 
    total_interactions = count(),
    unique_users = dcount(user_Id)
    by page_name, bin(timestamp, 1h)
| order by timestamp desc
```

#### 7. 상대 좌표 기반 히트맵 (정규화된 위치)

```kql
customEvents
| where name == "mouse_click"
| extend page_name = tostring(customDimensions.page_name)
| extend rel_x = toreal(customDimensions.relative_x)
| extend rel_y = toreal(customDimensions.relative_y)
| extend zone = tostring(customDimensions.zone)
| where page_name == "Dashboard"
| summarize count() by 
    bin(rel_x, 0.1),  // 10% 단위로 구분
    bin(rel_y, 0.1)
| order by count_ desc
```

## 히트맵 시각화

### Power BI / Azure Dashboard에서 사용

1. **클릭 히트맵**
   - X축: x 좌표 (또는 relative_x)
   - Y축: y 좌표 (또는 relative_y)
   - 색상: 클릭 횟수 (히트맵)

2. **영역별 방문 분포**
   - 3x3 그리드 차트
   - 각 영역의 방문 횟수를 색상으로 표시

3. **스크롤 깊이 분포**
   - 히스토그램: 스크롤 깊이별 사용자 수
   - 평균 스크롤 깊이 추이

## 활용 사례

### 1. UI/UX 개선

**문제 발견:**
- 중요한 버튼이 클릭이 적은 영역에 위치
- 사용자가 특정 영역을 거의 보지 않음

**개선 방향:**
- 클릭이 많은 영역으로 중요 요소 재배치
- 호버가 많은 영역에 추가 정보 제공

### 2. 콘텐츠 배치 최적화

**분석:**
```kql
// 가장 많은 관심을 받는 영역
customEvents
| where name == "mouse_movement_summary"
| extend zone_visits = parse_json(tostring(customDimensions.zone_visits))
| mv-expand zone_visits
| extend zone_name = tostring(zone_visits[0])
| extend visit_count = tolong(zone_visits[1])
| summarize total_visits = sum(visit_count) by zone_name
| order by total_visits desc
```

### 3. A/B 테스트 효과 측정

**비교 지표:**
- 변경 전/후 클릭 영역 분포
- 호버 패턴 변화
- 스크롤 깊이 개선

### 4. 반응형 디자인 검증

**분석:**
```kql
// 뷰포트 크기별 클릭 패턴
customEvents
| where name == "mouse_click"
| extend viewport_width = tolong(customDimensions.viewport_width)
| extend zone = tostring(customDimensions.zone)
| summarize click_count = count() by 
    viewport_category = case(
        viewport_width < 768, "Mobile",
        viewport_width < 1024, "Tablet",
        "Desktop"
    ),
    zone
```

## 성능 고려사항

### 샘플링 전략

- **마우스 이동:** 1초마다 샘플링 (너무 자주 샘플링하면 성능 저하)
- **클릭:** 모든 클릭 추적
- **호버:** 2초 이상 머문 경우만 기록
- **스크롤:** 2초마다 샘플링

### 데이터 전송 최적화

- **배치 전송:** 30초마다 요약 데이터 전송
- **개별 이벤트:** 클릭, 호버는 즉시 전송
- **클린업:** 페이지 이탈 시 최종 데이터 전송

### 메모리 관리

- 샘플 데이터는 메모리에 임시 저장
- 30초마다 배치 전송 후 메모리 클리어
- 최대 저장 샘플 수 제한 없음 (30초 제한으로 충분)

## 프라이버시 고려사항

### 수집하지 않는 정보

- ❌ 입력된 텍스트 내용
- ❌ 비밀번호 필드
- ❌ 개인 식별 정보 (PII)

### 익명화

- 사용자 ID는 자동 생성된 UUID
- IP 주소는 백엔드에서 수집하지 않음
- 세션 기반 추적만 수행

## 디버깅

### 콘솔 로그 확인

```
🖱️ useMouseTracking: Monitoring "Dashboard"
🖱️ Mouse sampled: (450, 320) zone: middle-left
🖱️ Click at: (450, 320) zone: middle-left
🖱️ Hover detected at zone: middle-center
🖱️ Mouse summary: 30 samples, most visited: middle-center
📜 useScrollTracking: Monitoring "Dashboard"
📜 Scroll: 45.5%, max: 67.8%
```

### 브라우저 개발자 도구

1. **Console:** 이벤트 발생 로그 확인
2. **Network:** `/api/analytics/track-event` 요청 확인
3. **Performance:** 성능 영향 모니터링

## 문제 해결

### 이벤트가 너무 많이 발생하는 경우

```typescript
// 샘플링 간격을 늘림
samplingInterval: 5000,  // 5초로 증가
```

### 특정 영역만 추적하고 싶은 경우

```typescript
// 커스텀 구현 필요
const handleMouseMove = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest('.track-area')) {
    // 특정 영역만 추적
  }
};
```

## 관련 문서

- [Page Visibility Tracking](./PAGE_VISIBILITY_TRACKING.md)
- [User Behavior Analytics](./USER_BEHAVIOR_ANALYTICS.md)
- [Application Insights Custom Events](https://docs.microsoft.com/azure/azure-monitor/app/api-custom-events-metrics)
