import { analyticsApi } from "./api";

/**
 * 페이지 뷰 추적
 */
export const trackPageView = async (data: {
  page_name: string;
  duration_ms?: number;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    console.log("📊 Tracking page view:", data);
    const response = await analyticsApi.trackPageView(data);
    console.log("✅ Page view tracked successfully:", response.data);
    return response;
  } catch (error) {
    console.warn("⚠️ Failed to track page view (non-critical):", error);
    // 추적 실패는 치명적이지 않으므로 에러를 던지지 않음
    return null;
  }
};

/**
 * 사용자 이벤트 추적
 */
export const trackEvent = async (data: {
  event_name: string;
  event_category: string;
  user_id?: string;
  session_id?: string;
  properties?: Record<string, any>;
}) => {
  try {
    console.log("🎯 Tracking event:", data);
    const response = await analyticsApi.trackEvent(data);
    console.log("✅ Event tracked successfully:", response.data);
    return response;
  } catch (error) {
    console.warn("⚠️ Failed to track event (non-critical):", error);
    // 추적 실패는 치명적이지 않으므로 에러를 던지지 않음
    return null;
  }
};

/**
 * 버튼 클릭 추적
 */
export const trackButtonClick = (
  buttonName: string,
  userId?: string,
  sessionId?: string,
  additionalProps?: Record<string, any>
) => {
  return trackEvent({
    event_name: "button_click",
    event_category: "interaction",
    user_id: userId,
    session_id: sessionId,
    properties: {
      button_name: buttonName,
      ...additionalProps,
    },
  });
};

/**
 * 검색 추적
 */
export const trackSearch = (
  searchQuery: string,
  resultCount: number,
  userId?: string,
  sessionId?: string
) => {
  return trackEvent({
    event_name: "search",
    event_category: "search",
    user_id: userId,
    session_id: sessionId,
    properties: {
      query: searchQuery,
      result_count: resultCount,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * 필터 적용 추적
 */
export const trackFilterApplied = (
  filterType: string,
  filterValue: any,
  userId?: string,
  sessionId?: string
) => {
  return trackEvent({
    event_name: "filter_applied",
    event_category: "interaction",
    user_id: userId,
    session_id: sessionId,
    properties: {
      filter_type: filterType,
      filter_value: filterValue,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * ETF 상세 조회 추적
 */
export const trackETFView = (
  symbol: string,
  userId?: string,
  sessionId?: string
) => {
  return trackEvent({
    event_name: "etf_view",
    event_category: "content",
    user_id: userId,
    session_id: sessionId,
    properties: {
      symbol,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * 채팅 메시지 전송 추적
 */
export const trackChatMessage = (
  messageLength: number,
  userId?: string,
  sessionId?: string
) => {
  return trackEvent({
    event_name: "chat_message_sent",
    event_category: "interaction",
    user_id: userId,
    session_id: sessionId,
    properties: {
      message_length: messageLength,
      timestamp: new Date().toISOString(),
    },
  });
};
