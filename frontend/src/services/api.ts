import axios from "axios";

// 프로덕션 환경에서는 빈 값으로 설정하여 상대경로 사용
// 개발 환경에서는 localhost:8000 사용
const API_BASE_URL =
  process.env.REACT_APP_API_URL !== undefined
    ? process.env.REACT_APP_API_URL
    : process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ETF API
export const etfApi = {
  list: (limit: number = 20) => api.get(`/api/etf/list?limit=${limit}`),
  getDetail: (symbol: string) => api.get(`/api/etf/${symbol}`),
  getHoldings: (symbol: string) => api.get(`/api/etf/${symbol}/holdings`),
  refresh: (symbol: string) => api.post(`/api/etf/${symbol}/refresh`),
  delete: (symbol: string) => api.delete(`/api/etf/${symbol}`),
};

// Stocks API
export const stocksApi = {
  getDetail: (symbol: string) => api.get(`/api/stocks/${symbol}`),
  getQuote: (symbol: string) => api.get(`/api/stocks/${symbol}/quote`),
  getQuotes: (symbols: string[]) =>
    api.get(`/api/stocks/batch-quotes?symbols=${symbols.join(",")}`),
  getNews: (symbol: string, days: number = 7) =>
    api.get(`/api/stocks/${symbol}/news?days=${days}`),
  getCandles: (symbol: string, resolution: string = "D", days: number = 30) =>
    api.get(
      `/api/stocks/${symbol}/candles?resolution=${resolution}&days=${days}`
    ),
  search: (query: string) => api.get(`/api/stocks/search?q=${query}`),
};

// News API
export const newsApi = {
  getMarket: (category: string = "general", limit: number = 20) =>
    api.get(`/api/news/market?category=${category}&limit=${limit}`),
  getGlobal: (sources: string = "all", limit: number = 30) =>
    api.get(`/api/news/global?sources=${sources}&limit=${limit}`),
  search: (query: string, sources: string = "all", limit: number = 20) =>
    api.get(
      `/api/news/search?q=${encodeURIComponent(
        query
      )}&sources=${sources}&limit=${limit}`
    ),
};

// Chat API
export const chatApi = {
  send: (message: string) => api.post("/api/chat/", { message }),
  stream: async (message: string, onChunk: (chunk: string) => void) => {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error("스트리밍 요청 실패");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("응답 스트림을 읽을 수 없습니다");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  },
  reset: () => api.post("/api/chat/reset"),
};

// Analytics API
export const analyticsApi = {
  trackPageView: (data: {
    page_name: string;
    duration_ms?: number;
    user_id?: string;
    session_id?: string;
    metadata?: Record<string, any>;
  }) => api.post("/api/analytics/page-view", data),

  trackEvent: (data: {
    event_name: string;
    event_category: string;
    user_id?: string;
    session_id?: string;
    properties?: Record<string, any>;
  }) => api.post("/api/analytics/event", data),
};

export default api;
