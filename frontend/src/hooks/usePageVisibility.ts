import { useEffect, useRef } from "react";
import { trackEvent } from "../services/analytics";

interface PageVisibilityOptions {
  userId?: string;
  sessionId?: string;
  pageName: string;
}

/**
 * 페이지 가시성 추적 Hook
 * - 사용자가 화면을 보고 있는지 (탭이 활성 상태인지)
 * - 다른 창에 화면이 가려진 상태인지 추적
 *
 * @param options 추적 옵션
 */
export const usePageVisibility = (options: PageVisibilityOptions) => {
  const { userId, sessionId, pageName } = options;
  const visibilityStartTimeRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(!document.hidden);

  useEffect(() => {
    console.log(`👁️ usePageVisibility: Monitoring "${pageName}"`);

    // 초기 상태 기록
    trackEvent({
      event_name: "page_visibility_init",
      event_category: "visibility",
      user_id: userId,
      session_id: sessionId,
      properties: {
        page_name: pageName,
        is_visible: !document.hidden,
        visibility_state: document.visibilityState,
        timestamp: new Date().toISOString(),
      },
    }).catch((error: Error) => {
      console.error("Failed to track initial visibility:", error);
    });

    const handleVisibilityChange = () => {
      const isNowVisible = !document.hidden;
      const visibilityState = document.visibilityState;
      const now = Date.now();
      const durationMs = now - visibilityStartTimeRef.current;

      console.log(
        `👁️ Visibility changed: ${
          isVisibleRef.current ? "visible" : "hidden"
        } → ${isNowVisible ? "visible" : "hidden"} (${durationMs}ms)`
      );

      // 이전 상태의 지속 시간 기록
      trackEvent({
        event_name: isVisibleRef.current
          ? "page_became_hidden"
          : "page_became_visible",
        event_category: "visibility",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          previous_state: isVisibleRef.current ? "visible" : "hidden",
          current_state: isNowVisible ? "visible" : "hidden",
          visibility_state: visibilityState,
          duration_ms: durationMs,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track visibility change:", error);
      });

      // 상태 업데이트
      isVisibleRef.current = isNowVisible;
      visibilityStartTimeRef.current = now;
    };

    // visibilitychange 이벤트 리스너 등록
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 언마운트 시 최종 상태 기록
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      const finalDurationMs = Date.now() - visibilityStartTimeRef.current;
      console.log(
        `👁️ usePageVisibility: Cleanup for "${pageName}" (final duration: ${finalDurationMs}ms, state: ${
          isVisibleRef.current ? "visible" : "hidden"
        })`
      );

      trackEvent({
        event_name: "page_visibility_cleanup",
        event_category: "visibility",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          final_state: isVisibleRef.current ? "visible" : "hidden",
          final_duration_ms: finalDurationMs,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track visibility cleanup:", error);
      });
    };
  }, [pageName, userId, sessionId]);

  return {
    isVisible: isVisibleRef.current,
  };
};

/**
 * 페이지 포커스 추적 Hook
 * - 브라우저 창이 포커스를 받았는지/잃었는지 추적
 * - visibilitychange보다 더 세밀한 추적
 *
 * @param options 추적 옵션
 */
export const usePageFocus = (options: PageVisibilityOptions) => {
  const { userId, sessionId, pageName } = options;
  const focusStartTimeRef = useRef<number>(Date.now());
  const isFocusedRef = useRef<boolean>(document.hasFocus());

  useEffect(() => {
    console.log(`🎯 usePageFocus: Monitoring "${pageName}"`);

    const handleFocus = () => {
      const now = Date.now();
      const blurDurationMs = now - focusStartTimeRef.current;

      console.log(`🎯 Page gained focus after ${blurDurationMs}ms`);

      trackEvent({
        event_name: "page_focus_gained",
        event_category: "focus",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          blur_duration_ms: blurDurationMs,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track focus gain:", error);
      });

      isFocusedRef.current = true;
      focusStartTimeRef.current = now;
    };

    const handleBlur = () => {
      const now = Date.now();
      const focusDurationMs = now - focusStartTimeRef.current;

      console.log(`🎯 Page lost focus after ${focusDurationMs}ms`);

      trackEvent({
        event_name: "page_focus_lost",
        event_category: "focus",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          focus_duration_ms: focusDurationMs,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track focus loss:", error);
      });

      isFocusedRef.current = false;
      focusStartTimeRef.current = now;
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);

      const finalDurationMs = Date.now() - focusStartTimeRef.current;
      console.log(
        `🎯 usePageFocus: Cleanup for "${pageName}" (final duration: ${finalDurationMs}ms)`
      );

      trackEvent({
        event_name: "page_focus_cleanup",
        event_category: "focus",
        user_id: userId,
        session_id: sessionId,
        properties: {
          page_name: pageName,
          final_state: isFocusedRef.current ? "focused" : "blurred",
          final_duration_ms: finalDurationMs,
          timestamp: new Date().toISOString(),
        },
      }).catch((error: Error) => {
        console.error("Failed to track focus cleanup:", error);
      });
    };
  }, [pageName, userId, sessionId]);

  return {
    isFocused: isFocusedRef.current,
  };
};
