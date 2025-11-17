import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ETF API
export const etfApi = {
  list: (limit: number = 20) => api.get(`/api/etf/list?limit=${limit}`),
  getDetail: (symbol: string) => api.get(`/api/etf/${symbol}`),
  getHoldings: (symbol: string) => api.get(`/api/etf/${symbol}/holdings`),
  refresh: (symbol: string) => api.post(`/api/etf/${symbol}/refresh`),
};

// Stocks API
export const stocksApi = {
  getDetail: (symbol: string) => api.get(`/api/stocks/${symbol}`),
  getQuote: (symbol: string) => api.get(`/api/stocks/${symbol}/quote`),
  getNews: (symbol: string, days: number = 7) => 
    api.get(`/api/stocks/${symbol}/news?days=${days}`),
  getCandles: (symbol: string, resolution: string = 'D', days: number = 30) =>
    api.get(`/api/stocks/${symbol}/candles?resolution=${resolution}&days=${days}`),
  search: (query: string) => api.get(`/api/stocks/search?q=${query}`),
};

// News API
export const newsApi = {
  getMarket: (category: string = 'general', limit: number = 20) =>
    api.get(`/api/news/market?category=${category}&limit=${limit}`),
};

// Chat API
export const chatApi = {
  send: (message: string) => api.post('/api/chat/', { message }),
  reset: () => api.post('/api/chat/reset'),
};

export default api;
