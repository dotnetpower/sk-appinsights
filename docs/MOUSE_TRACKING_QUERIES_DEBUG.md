# 마우스 추적 쿼리 디버깅 가이드

## 1단계: 데이터 존재 확인

### 모든 마우스 이벤트 확인
```kql
customEvents
| where timestamp > ago(24h)
| where name contains 'mouse' or name contains 'scroll'
| summarize Count = count() by name
| order by Count desc
```

### 최근 이벤트 샘플 확인
```kql
customEvents
| where timestamp > ago(24h)
| where name in ('mouse_click', 'mouse_hover', 'mouse_movement_summary', 'scroll_position')
| take 10
| project timestamp, name, customDimensions
```

## 2단계: customDimensions 구조 확인

### 실제 데이터 구조 파악
```kql
customEvents
| where timestamp > ago(24h)
| where name == 'mouse_click'
| take 1
| project customDimensions
```

## 3단계: 수정된 쿼리들

### 페이지별 선호 영역 요약 (수정)
```kql
customEvents
| where timestamp > ago(1h)
| where name == 'mouse_movement_summary'
| extend 
    page_name = tostring(customDimensions.page_name),
    most_visited = tostring(customDimensions.most_visited_zone),
    total_samples = toint(customDimensions.total_samples),
    click_count = toint(customDimensions.click_count),
    hover_count = toint(customDimensions.hover_count),
    session_id = tostring(customDimensions.session_id)
| summarize 
    Sessions = dcount(session_id),
    AvgSamples = avg(total_samples),
    TotalClicks = sum(click_count),
    TotalHovers = sum(hover_count)
    by page_name, most_visited
| project 
    페이지 = page_name,
    가장_많이_방문한_영역 = most_visited,
    세션_수 = Sessions,
    평균_마우스_샘플 = round(AvgSamples, 1),
    총_클릭_수 = TotalClicks,
    총_호버_수 = TotalHovers
| order by 세션_수 desc
```

### 영역별 클릭 분포 (수정)
```kql
customEvents
| where timestamp > ago(1h)
| where name == 'mouse_click'
| extend 
    page_name = tostring(customDimensions.page_name),
    zone = tostring(customDimensions.zone)
| where isnotempty(zone)
| summarize 
    ClickCount = count(),
    UniqueUsers = dcount(user_Id)
    by page_name, zone
| project 
    페이지 = page_name,
    화면_영역 = zone,
    클릭_수 = ClickCount,
    고유_사용자 = UniqueUsers
| order by 클릭_수 desc
```

### 클릭 위치 히트맵 (수정)
```kql
customEvents
| where timestamp > ago(1h)
| where name == 'mouse_click'
| extend 
    page_name = tostring(customDimensions.page_name),
    rel_x = todouble(customDimensions.relative_x),
    rel_y = todouble(customDimensions.relative_y)
| where isnotnull(rel_x) and isnotnull(rel_y)
| where rel_x >= 0 and rel_x <= 1 and rel_y >= 0 and rel_y <= 1
| extend 
    x_bucket = bin(rel_x, 0.1),
    y_bucket = bin(rel_y, 0.1)
| summarize ClickCount = count() by page_name, x_bucket, y_bucket
| extend 
    X영역 = strcat(tostring(toint(x_bucket * 100)), '%'),
    Y영역 = strcat(tostring(toint(y_bucket * 100)), '%')
| project 
    페이지 = page_name,
    X_위치 = X영역,
    Y_위치 = Y영역,
    클릭_밀도 = ClickCount
| order by 클릭_밀도 desc
| take 50
```

### 호버 패턴 분석 (수정)
```kql
customEvents
| where timestamp > ago(1h)
| where name == 'mouse_hover'
| extend 
    page_name = tostring(customDimensions.page_name),
    zone = tostring(customDimensions.zone),
    hover_duration = toint(customDimensions.hover_duration_ms)
| where isnotempty(zone) and isnotnull(hover_duration)
| summarize 
    HoverCount = count(),
    AvgHoverTime = round(avg(hover_duration) / 1000.0, 2)
    by page_name, zone
| project 
    페이지 = page_name,
    영역 = zone,
    호버_횟수 = HoverCount,
    평균_호버_시간_초 = AvgHoverTime
| order by 호버_횟수 desc
```

### 가장 많이 클릭된 UI 요소 (수정)
```kql
customEvents
| where timestamp > ago(1h)
| where name == 'mouse_click'
| extend 
    page_name = tostring(customDimensions.page_name),
    element_str = tostring(customDimensions.element)
| where isnotempty(element_str) and element_str != 'null' and element_str != '{}'
| extend element = parse_json(element_str)
| extend 
    ElementTag = tostring(element.tag),
    ElementId = tostring(element.id),
    ElementClass = tostring(element.className)
| where isnotempty(ElementTag)
| extend ElementInfo = case(
        isnotempty(ElementId), strcat(ElementTag, '#', ElementId),
        isnotempty(ElementClass), strcat(ElementTag, '.', substring(ElementClass, 0, 20)),
        ElementTag
    )
| summarize 
    ClickCount = count(),
    UniqueUsers = dcount(user_Id)
    by page_name, ElementInfo
| project 
    페이지 = page_name,
    클릭된_요소 = ElementInfo,
    클릭_수 = ClickCount,
    고유_사용자 = UniqueUsers
| order by 클릭_수 desc
| take 20
```

### 스크롤 깊이 분석 (수정)
```kql
customEvents
| where timestamp > ago(1h)
| where name == 'scroll_position'
| extend 
    page_name = tostring(customDimensions.page_name),
    scroll_pct = todouble(customDimensions.scroll_percentage),
    max_depth = todouble(customDimensions.max_scroll_depth)
| where isnotnull(scroll_pct) and isnotnull(max_depth)
| summarize 
    AvgScrollDepth = round(avg(max_depth), 1),
    MaxScrollDepth = round(max(max_depth), 1),
    UniqueUsers = dcount(user_Id),
    Reached100 = dcountif(user_Id, scroll_pct >= 99)
    by page_name
| extend BottomReachRate = round(100.0 * Reached100 / UniqueUsers, 1)
| project 
    페이지 = page_name,
    평균_스크롤_깊이_퍼센트 = AvgScrollDepth,
    최대_스크롤_깊이_퍼센트 = MaxScrollDepth,
    고유_사용자 = UniqueUsers,
    페이지_하단_도달률_퍼센트 = BottomReachRate
| order by 평균_스크롤_깊이_퍼센트 desc
```

### 디바이스 타입별 상호작용 (수정)
```kql
customEvents
| where timestamp > ago(1h)
| where name in ('mouse_click', 'mouse_hover')
| extend 
    viewport_width = toint(customDimensions.viewport_width),
    viewport_height = toint(customDimensions.viewport_height)
| where isnotnull(viewport_width)
| extend 
    DeviceType = case(
        viewport_width < 768, '📱 Mobile',
        viewport_width < 1024, '📱 Tablet',
        viewport_width < 1920, '💻 Desktop',
        '🖥️ Large Desktop'
    ),
    Resolution = strcat(tostring(viewport_width), 'x', tostring(viewport_height))
| summarize 
    InteractionCount = count(),
    UniqueUsers = dcount(user_Id),
    TopResolutions = make_set(Resolution, 5)
    by DeviceType
| project 
    디바이스_타입 = DeviceType,
    상호작용_수 = InteractionCount,
    고유_사용자 = UniqueUsers,
    주요_해상도 = TopResolutions
| order by 상호작용_수 desc
```

## 주요 변경 사항

### 1. 타입 변환 함수 변경
- `tolong()` → `toint()` (더 안정적)
- `toreal()` → `todouble()` (명확한 타입)

### 2. Null 체크 추가
```kql
| where isnotnull(field_name)
| where isnotempty(string_field)
```

### 3. Extend 순서 개선
- 각 extend를 개별 라인으로 분리
- 의존성 있는 필드는 순서대로 처리

### 4. 컬럼명에서 특수문자 제거
- `['컬럼명']` → 일반 컬럼명으로 변경 (디버깅 용이)

### 5. JSON 파싱 개선
```kql
| extend element_str = tostring(customDimensions.element)
| where isnotempty(element_str) and element_str != 'null' and element_str != '{}'
| extend element = parse_json(element_str)
```

## 문제 해결 체크리스트

- [ ] 이벤트가 실제로 Application Insights에 수집되고 있는지 확인
- [ ] customDimensions 필드명이 정확한지 확인
- [ ] 타임스탬프 범위가 데이터가 있는 시간대인지 확인
- [ ] 타입 변환이 올바른지 확인 (숫자 필드에 문자열이 들어있지 않은지)
- [ ] Null 값이나 빈 문자열 처리가 되어 있는지 확인

## 데이터 수집 확인 방법

1. **프론트엔드에서 이벤트 전송 확인**
   - 브라우저 개발자 도구 → Network 탭
   - `/api/analytics/track-event` 요청 확인

2. **백엔드에서 Application Insights 전송 확인**
   - 백엔드 로그 확인
   - Application Insights Live Metrics 확인

3. **Application Insights에서 데이터 확인**
   - Logs 섹션에서 위의 1단계 쿼리 실행
