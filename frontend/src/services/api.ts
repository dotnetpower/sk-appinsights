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
    // Application Insights용 Request-Id 헤더 추가
    // 이를 통해 Frontend → Backend 연결이 Application Map에 표시됨
  },
});

// Request Interceptor: 모든 요청에 추적 헤더 추가
api.interceptors.request.use(
  (config) => {
    // Operation ID 생성 (Frontend-Backend 연결 추적용)
    const operationId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // W3C Trace Context 표준 헤더
    config.headers["traceparent"] = `00-${operationId.padEnd(
      32,
      "0"
    )}-${operationId.substr(0, 16).padEnd(16, "0")}-01`;

    // Application Insights 호환 헤더
    config.headers["Request-Id"] = `|${operationId}.`;
    config.headers["Request-Context"] = "appId=cid-v1:etf-agent-frontend";

    // 디버깅용 로그
    console.log(
      `📡 API Request: ${config.method?.toUpperCase()} ${config.url}`,
      {
        operationId: operationId.substr(0, 16),
      }
    );

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: 응답 로깅
api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ API Response: ${response.config.method?.toUpperCase()} ${
        response.config.url
      }`,
      {
        status: response.status,
        duration: response.headers["x-response-time"] || "N/A",
      }
    );
    return response;
  },
  (error) => {
    console.error(
      `❌ API Error: ${error.config?.method?.toUpperCase()} ${
        error.config?.url
      }`,
      {
        status: error.response?.status,
        message: error.message,
      }
    );
    return Promise.reject(error);
  }
);

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
