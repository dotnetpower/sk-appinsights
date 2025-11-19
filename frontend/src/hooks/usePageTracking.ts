import { useEffect, useRef } from "react";
import { trackPageView } from "../services/analytics";

/**
 * 페이지 체류시간 추적 Hook
 *
 * @param pageName 페이지 이름
 * @param userId 사용자 ID (선택적)
 * @param metadata 추가 메타데이터 (선택적)
 */
export const usePageTracking = (
  pageName: string,
  userId?: string,
  metadata?: Record<string, any>
) => {
  const startTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(generateSessionId());

  useEffect(() => {
    console.log(`📄 usePageTracking: Entering page "${pageName}"`);

    // 페이지 진입 시 시작 시간 기록
    startTimeRef.current = Date.now();
    const currentSessionId = sessionIdRef.current;

    // 페이지 진입 즉시 추적 (duration 없이)
    trackPageView({
      page_name: pageName,
      user_id: userId,
      session_id: currentSessionId,
      metadata: {
        ...metadata,
        entry_timestamp: new Date().toISOString(),
        event_type: "page_entry",
      },
    }).catch((error: Error) => {
      console.error("Failed to track page entry:", error);
    });

    // 페이지 이탈 시 체류시간과 함께 전송
    return () => {
      const durationMs = Date.now() - startTimeRef.current;
      console.log(
        `📄 usePageTracking: Leaving page "${pageName}" (duration: ${durationMs}ms)`
      );

      trackPageView({
        page_name: pageName,
        duration_ms: durationMs,
        user_id: userId,
        session_id: currentSessionId,
        metadata: {
          ...metadata,
          exit_timestamp: new Date().toISOString(),
          event_type: "page_exit",
        },
      }).catch((error: Error) => {
        console.error("Failed to track page exit:", error);
      });
    };
  }, [pageName, userId, metadata]);

  return {
    sessionId: sessionIdRef.current,
  };
};

/**
 * 세션 ID 생성
 */
function generateSessionId(): string {
  // 간단한 세션 ID 생성 (브라우저 세션 기반)
  const key = "etf_agent_session_id";
  let sessionId = sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }

  return sessionId;
}

/**
 * 사용자 ID 가져오기/생성
 */
export const getUserId = (): string => {
  const key = "etf_agent_user_id";
  let userId = localStorage.getItem(key);

  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, userId);
  }

  return userId;
};
