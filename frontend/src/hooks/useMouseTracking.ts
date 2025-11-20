import { useEffect, useRef } from "react";
import { trackEvent } from "../services/analytics";

interface MouseTrackingOptions {
  userId?: string;
  sessionId?: string;
  pageName: string;
  /**
   * 마우스 이동 샘플링 간격 (ms)
   * 기본값: 1000ms (1초마다 한 번)
   */
  samplingInterval?: number;
  /**
   * 클릭 이벤트 추적 여부
   */
  trackClicks?: boolean;
  /**
   * 호버 이벤트 추적 여부 (특정 요소에 일정 시간 머무름)
   */
  trackHover?: boolean;
  /**
   * 호버로 간주할 최소 시간 (ms)
   */
  hoverThreshold?: number;
}

interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
  viewportWidth: number;
  viewportHeight: number;
  /**
   * 상대적 위치 (0~1 범위)
   */
  relativeX: number;
  relativeY: number;
  /**
   * 화면을 9개 영역으로 나눴을 때의 영역
   * top-left, top-center, top-right,
   * middle-left, middle-center, middle-right,
   * bottom-left, bottom-center, bottom-right
   */
  zone: string;
}

/**
 * 마우스 위치 추적 Hook
 *
 * 사용자의 마우스 움직임, 클릭, 호버 위치를 추적하여
 * 화면에서 어떤 영역을 선호하는지 분석할 수 있습니다.
 *
 * @param options 추적 옵션
 */
export const useMouseTracking = (options: MouseTrackingOptions) => {
  const {
    userId,
    sessionId,
    pageName,
    samplingInterval = 1000,
    trackClicks = true,
    trackHover = true,
    hoverThreshold = 2000,
  } = options;

  const lastSampleTimeRef = useRef<number>(0);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mousePositionsRef = useRef<MousePosition[]>([]);
  const clickCountRef = useRef<number>(0);
  const hoverCountRef = useRef<number>(0);

  useEffect(() => {
    console.log(`🖱️ useMouseTracking: Monitoring "${pageName}"`);

    /**
     * 화면 영역 계산 (3x3 그리드)
     */
    const getZone = (
      x: number,
      y: number,
      width: number,
      height: number
    ): string => {
      const relX = x / width;
      const relY = y / height;

      let vertical = "middle";
      if (relY < 0.33) vertical = "top";
      else if (relY > 0.67) vertical = "bottom";

      let horizontal = "center";
      if (relX < 0.33) horizontal = "left";
      else if (relX > 0.67) horizontal = "right";

      return `${vertical}-${horizontal}`;
    };

    /**
     * 마우스 위치 정보 생성
     */
    const createMousePosition = (x: number, y: number): MousePosition => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      return {
        x,
        y,
        timestamp: Date.now(),
        viewportWidth,
        viewportHeight,
        relativeX: x / viewportWidth,
        relativeY: y / viewportHeight,
        zone: getZone(x, y, viewportWidth, viewportHeight),
      };
    };

    /**
     * 마우스 이동 핸들러 (샘플링)
     */
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      // 샘플링 간격 체크
      if (now - lastSampleTimeRef.current < samplingInterval) {
        return;
      }

      lastSampleTimeRef.current = now;
      const position = createMousePosition(e.clientX, e.clientY);
      mousePositionsRef.current.push(position);

      console.log(
        `🖱️ Mouse sampled: (${position.x}, ${position.y}) zone: ${position.zone}`
      );

      // 호버 타이머 재설정
      if (trackHover && hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }

      if (trackHover) {
        hoverTimerRef.current = setTimeout(() => {
          const hoverPos = createMousePosition(e.clientX, e.clientY);
          hoverCountRef.current++;

          console.log(`🖱️ Hover detected at zone: ${hoverPos.zone}`);

          trackEvent({
            event_name: "mouse_hover",
            event_category: "mouse_interaction",
            user_id: userId,
            session_id: sessionId,
            properties: {
              page_name: pageName,
              x: hoverPos.x,
              y: hoverPos.y,
              relative_x: hoverPos.relativeX,
              relative_y: hoverPos.relativeY,
              zone: hoverPos.zone,
              viewport_width: hoverPos.viewportWidth,
              viewport_height: hoverPos.viewportHeight,
              hover_duration_ms: hoverThreshold,
              timestamp: new Date(hoverPos.timestamp).toISOString(),
            },
          }).catch((error: Error) => {
            console.error("Failed to track hover:", error);
          });
        }, hoverThreshold);
      }
    };

    /**
     * 클릭 핸들러
     */
    const handleClick = (e: MouseEvent) => {
      if (!trackClicks) return;

      const position = createMousePosition(e.clientX, e.clientY);
      clickCountRef.current++;

      console.log(
        `🖱️ Click at: (${position.x}, ${position.y}) zone: ${position.zone}`
      );

      // 클릭된 요소 정보
      const target = e.target as HTMLElement;
      const elementInfo = {
        tag: target.tagName,
        id: target.id || undefined,
        className: target.className || undefined,
        textContent: target.textContent?.substring(0, 50) || undefined,
      };

      trackEvent({
        event_name: "mouse_click",
        event_category: "mouse_interaction",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          x: position.x,
          y: position.y,
          relative_x: position.relativeX,
          relative_y: position.relativeY,
          zone: position.zone,
          viewport_width: position.viewportWidth,
          viewport_height: position.viewportHeight,
          element: elementInfo,
          timestamp: new Date(position.timestamp).toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track click:", error);
      });
    };

    /**
     * 마우스가 페이지를 떠날 때
     */
    const handleMouseLeave = () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener("mousemove", handleMouseMove);
    if (trackClicks) {
      document.addEventListener("click", handleClick);
    }
    document.addEventListener("mouseleave", handleMouseLeave);

    // 주기적으로 수집된 데이터 전송 (30초마다)
    const summaryInterval = setInterval(() => {
      if (mousePositionsRef.current.length === 0) return;

      // 영역별 방문 횟수 집계
      const zoneVisits: Record<string, number> = {};
      mousePositionsRef.current.forEach((pos) => {
        zoneVisits[pos.zone] = (zoneVisits[pos.zone] || 0) + 1;
      });

      // 가장 많이 방문한 영역
      const mostVisitedZone = Object.entries(zoneVisits).reduce((a, b) =>
        a[1] > b[1] ? a : b
      );

      console.log(
        `🖱️ Mouse summary: ${mousePositionsRef.current.length} samples, most visited: ${mostVisitedZone[0]}`
      );

      trackEvent({
        event_name: "mouse_movement_summary",
        event_category: "mouse_interaction",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          total_samples: mousePositionsRef.current.length,
          zone_visits: zoneVisits,
          most_visited_zone: mostVisitedZone[0],
          most_visited_count: mostVisitedZone[1],
          click_count: clickCountRef.current,
          hover_count: hoverCountRef.current,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track mouse summary:", error);
      });

      // 리셋
      mousePositionsRef.current = [];
      clickCountRef.current = 0;
      hoverCountRef.current = 0;
    }, 30000);

    // 클린업
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearInterval(summaryInterval);

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }

      // 최종 요약 전송
      if (mousePositionsRef.current.length > 0) {
        const zoneVisits: Record<string, number> = {};
        mousePositionsRef.current.forEach((pos) => {
          zoneVisits[pos.zone] = (zoneVisits[pos.zone] || 0) + 1;
        });

        console.log(`🖱️ useMouseTracking: Final cleanup for "${pageName}"`);

        trackEvent({
          event_name: "mouse_tracking_cleanup",
          event_category: "mouse_interaction",
          user_id: userId,
          session_id: sessionId,
          properties: {
            page_name: pageName,
            total_samples: mousePositionsRef.current.length,
            zone_visits: zoneVisits,
            click_count: clickCountRef.current,
            hover_count: hoverCountRef.current,
            timestamp: new Date().toISOString(),
          },
        }).catch((error: Error) => {
          console.error("Failed to track mouse cleanup:", error);
        });
      }
    };
  }, [
    pageName,
    userId,
    sessionId,
    samplingInterval,
    trackClicks,
    trackHover,
    hoverThreshold,
  ]);

  return {
    // 현재까지 수집된 샘플 수
    sampleCount: mousePositionsRef.current.length,
  };
};

/**
 * 스크롤 위치 추적 Hook
 *
 * 사용자가 페이지의 어느 부분까지 스크롤했는지 추적합니다.
 */
export const useScrollTracking = (options: {
  userId?: string;
  sessionId?: string;
  pageName: string;
  samplingInterval?: number;
}) => {
  const { userId, sessionId, pageName, samplingInterval = 2000 } = options;
  const lastSampleTimeRef = useRef<number>(0);
  const maxScrollDepthRef = useRef<number>(0);

  useEffect(() => {
    console.log(`📜 useScrollTracking: Monitoring "${pageName}"`);

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastSampleTimeRef.current < samplingInterval) {
        return;
      }

      lastSampleTimeRef.current = now;

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollPercentage =
        (scrollTop / (scrollHeight - clientHeight)) * 100;

      // 최대 스크롤 깊이 업데이트
      if (scrollPercentage > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = scrollPercentage;
      }

      console.log(
        `📜 Scroll: ${scrollPercentage.toFixed(
          1
        )}%, max: ${maxScrollDepthRef.current.toFixed(1)}%`
      );

      trackEvent({
        event_name: "scroll_position",
        event_category: "scroll_interaction",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          scroll_percentage: scrollPercentage,
          max_scroll_depth: maxScrollDepthRef.current,
          scroll_top: scrollTop,
          scroll_height: scrollHeight,
          client_height: clientHeight,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track scroll:", error);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      console.log(
        `📜 useScrollTracking: Cleanup for "${pageName}", max depth: ${maxScrollDepthRef.current.toFixed(
          1
        )}%`
      );

      trackEvent({
        event_name: "scroll_tracking_cleanup",
        event_category: "scroll_interaction",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          max_scroll_depth: maxScrollDepthRef.current,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track scroll cleanup:", error);
      });
    };
  }, [pageName, userId, sessionId, samplingInterval]);

  return {
    maxScrollDepth: maxScrollDepthRef.current,
  };
};
