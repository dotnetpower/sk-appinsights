# 페이지 가시성 추적 (Page Visibility Tracking)

## 개요

사용자가 실제로 화면을 보고 있는지, 다른 창에 가려져 있는지를 추적하는 기능입니다. 이를 통해 실제 사용자 참여도(engagement)를 정확하게 측정할 수 있습니다.

## 주요 기능

### 1. Page Visibility API (`usePageVisibility`)
탭이 활성화되어 있는지 추적합니다.

**감지 시나리오:**
- ✅ 사용자가 다른 탭으로 전환
- ✅ 브라우저 창을 최소화
- ✅ 다른 애플리케이션으로 전환 (Alt+Tab)
- ✅ 화면 잠금

**추적 이벤트:**
- `page_visibility_init` - 초기 가시성 상태
- `page_became_hidden` - 페이지가 숨겨짐 (다른 탭으로 전환 등)
- `page_became_visible` - 페이지가 다시 보임
- `page_visibility_cleanup` - 컴포넌트 언마운트 시 최종 상태

### 2. Page Focus API (`usePageFocus`)
브라우저 창이 포커스를 받았는지 추적합니다.

**감지 시나리오:**
- ✅ 브라우저 창이 포커스를 받음
- ✅ 브라우저 창이 포커스를 잃음
- ✅ 다른 애플리케이션 창으로 전환

**추적 이벤트:**
- `page_focus_gained` - 페이지가 포커스를 받음
- `page_focus_lost` - 페이지가 포커스를 잃음
- `page_focus_cleanup` - 컴포넌트 언마운트 시 최종 상태

## 사용법

### 기본 사용

```typescript
import { usePageVisibility, usePageFocus } from '../hooks/usePageVisibility';
import { getUserId } from '../hooks/usePageTracking';

function MyComponent() {
  const userId = getUserId();
  const sessionId = 'session_123';
  const pageName = 'Dashboard';

  // 페이지 가시성 추적
  usePageVisibility({
    userId,
    sessionId,
    pageName,
  });

  // 페이지 포커스 추적
  usePageFocus({
    userId,
    sessionId,
    pageName,
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

  // 가시성 및 포커스 추적
  usePageVisibility({ userId, sessionId, pageName: currentPage });
  usePageFocus({ userId, sessionId, pageName: currentPage });

  return <div>App Content</div>;
}
```

## 수집되는 데이터

### Visibility 이벤트 데이터

```json
{
  "event_name": "page_became_hidden",
  "event_category": "visibility",
  "user_id": "user_12345",
  "session_id": "session_67890",
  "properties": {
    "page_name": "Dashboard",
    "previous_state": "visible",
    "current_state": "hidden",
    "visibility_state": "hidden",
    "duration_ms": 45000,
    "timestamp": "2025-11-20T10:30:00.000Z"
  }
}
```

### Focus 이벤트 데이터

```json
{
  "event_name": "page_focus_lost",
  "event_category": "focus",
  "user_id": "user_12345",
  "session_id": "session_67890",
  "properties": {
    "page_name": "Dashboard",
    "focus_duration_ms": 30000,
    "timestamp": "2025-11-20T10:30:00.000Z"
  }
}
```

## Application Insights에서 확인하기

### KQL 쿼리 예시

#### 1. 페이지 가시성 이벤트 조회

```kql
customEvents
| where name in ("page_became_hidden", "page_became_visible")
| extend page_name = tostring(customDimensions.page_name)
| extend visibility_state = tostring(customDimensions.current_state)
| extend duration_ms = tolong(customDimensions.duration_ms)
| project timestamp, name, page_name, visibility_state, duration_ms, user_id = user_Id
| order by timestamp desc
```

#### 2. 평균 가시성 지속 시간

```kql
customEvents
| where name == "page_became_hidden"
| extend page_name = tostring(customDimensions.page_name)
| extend duration_ms = tolong(customDimensions.duration_ms)
| summarize 
    avg_visible_time_sec = avg(duration_ms) / 1000,
    total_events = count()
    by page_name
| order by avg_visible_time_sec desc
```

#### 3. 페이지별 가시성 전환 횟수

```kql
customEvents
| where name in ("page_became_hidden", "page_became_visible")
| extend page_name = tostring(customDimensions.page_name)
| summarize 
    visibility_changes = count(),
    unique_users = dcount(user_Id)
    by page_name, bin(timestamp, 1h)
| order by timestamp desc
```

#### 4. 사용자별 참여도 분석

```kql
customEvents
| where name in ("page_became_hidden", "page_became_visible")
| extend page_name = tostring(customDimensions.page_name)
| extend duration_ms = tolong(customDimensions.duration_ms)
| summarize 
    total_visible_time_sec = sum(case(name == "page_became_hidden", duration_ms, 0)) / 1000,
    visibility_changes = count()
    by user_Id, page_name
| order by total_visible_time_sec desc
```

#### 5. 포커스 이벤트 조회

```kql
customEvents
| where name in ("page_focus_gained", "page_focus_lost")
| extend page_name = tostring(customDimensions.page_name)
| extend duration_ms = tolong(customDimensions.focus_duration_ms)
| project timestamp, name, page_name, duration_ms, user_id = user_Id
| order by timestamp desc
```

## 차이점: Visibility vs Focus

| 특성 | Page Visibility | Page Focus |
|------|----------------|------------|
| **감지 대상** | 탭이 활성화되어 있는지 | 브라우저 창이 포커스를 받았는지 |
| **API** | `document.visibilityState` | `document.hasFocus()` |
| **이벤트** | `visibilitychange` | `focus`, `blur` |
| **사용 사례** | 탭 전환 감지 | 창 전환 감지 |
| **세밀도** | 탭 레벨 | 창 레벨 |

## 활용 사례

### 1. 실제 사용 시간 측정
- 사용자가 실제로 화면을 보고 있었던 시간만 계산
- 탭을 열어두고 다른 작업을 한 시간은 제외

### 2. 콘텐츠 참여도 분석
- 어떤 페이지에서 사용자가 가장 오래 머무르는지
- 어떤 콘텐츠가 사용자의 주의를 끄는지

### 3. 이탈 패턴 분석
- 사용자가 어느 시점에서 다른 탭으로 전환하는지
- 어떤 페이지에서 이탈률이 높은지

### 4. A/B 테스트
- 새로운 UI가 사용자 참여도를 높이는지 측정
- 콘텐츠 배치 변경이 가시성 유지에 미치는 영향

## 브라우저 지원

- ✅ Chrome/Edge: 완벽 지원
- ✅ Firefox: 완벽 지원
- ✅ Safari: 완벽 지원
- ✅ Mobile browsers: 완벽 지원

## 성능 고려사항

- 이벤트는 상태 변경 시에만 발생 (CPU 부하 최소)
- 네트워크 요청은 비동기로 처리
- 메모리 사용량 무시할 수준

## 디버깅

### 콘솔 로그 확인

```
👁️ usePageVisibility: Monitoring "Dashboard"
👁️ Visibility changed: visible → hidden (45000ms)
🎯 usePageFocus: Monitoring "Dashboard"
🎯 Page lost focus after 30000ms
```

### 개발자 도구에서 테스트

1. 콘솔 탭 열기
2. 다른 탭으로 전환
3. 다시 돌아와서 로그 확인
4. Network 탭에서 `/api/analytics/track-event` 요청 확인

## 문제 해결

### 이벤트가 기록되지 않는 경우

1. 브라우저 콘솔에서 에러 확인
2. Network 탭에서 API 요청 실패 여부 확인
3. Application Insights connection string 확인
4. CORS 설정 확인

### 중복 이벤트가 발생하는 경우

- React StrictMode에서는 개발 중 두 번 호출될 수 있음 (정상)
- 프로덕션 빌드에서는 한 번만 호출됨

## 관련 문서

- [Page Visibility API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Application Insights Custom Events](https://docs.microsoft.com/azure/azure-monitor/app/api-custom-events-metrics)
- [User Behavior Analytics](./USER_BEHAVIOR_ANALYTICS.md)
