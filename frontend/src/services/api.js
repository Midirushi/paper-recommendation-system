import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get user ID from localStorage or generate anonymous ID
const getUserId = () => {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', userId);
  }
  return userId;
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Unknown error';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

// Search API
export const searchAPI = {
  search: (query, userId = getUserId(), limit = 20) =>
    apiClient.post('/search/', { query, user_id: userId, limit }),

  getPaperDetails: (paperId) =>
    apiClient.get(`/search/paper/${paperId}`),

  getSearchHistory: (userId = getUserId(), limit = 20) =>
    apiClient.get('/search/history', { params: { user_id: userId, limit } }),

  getPopularPapers: (days = 7, limit = 10) =>
    apiClient.get('/search/popular', { params: { days, limit } }),
};

// Trends API
export const trendsAPI = {
  getLatestTrends: () =>
    apiClient.get('/trends/latest'),

  getTrendHistory: (limit = 10) =>
    apiClient.get('/trends/history', { params: { limit } }),

  getHotPapers: (days = 7, limit = 10) =>
    apiClient.get('/trends/hot-papers', { params: { days, limit } }),

  getTrendingKeywords: (days = 30, limit = 20) =>
    apiClient.get('/trends/keywords', { params: { days, limit } }),
};

// Recommendations API
export const recommendationsAPI = {
  getPersonalized: (userId = getUserId(), limit = 10) =>
    apiClient.get('/recommendations/personalized', { params: { user_id: userId, limit } }),

  getSimilarPapers: (paperId, limit = 10) =>
    apiClient.get(`/recommendations/similar/${paperId}`, { params: { limit } }),

  getTrending: (limit = 10) =>
    apiClient.get('/recommendations/trending', { params: { limit } }),

  recordInteraction: (paperId, action = 'view', userId = getUserId()) =>
    apiClient.post('/recommendations/interaction', null, {
      params: { user_id: userId, paper_id: paperId, action }
    }),

  generateRecommendations: (userId = getUserId()) =>
    apiClient.post(`/recommendations/generate/${userId}`),
};

// Admin API (for advanced features)
export const adminAPI = {
  getCrawlStats: (days = 7) =>
    apiClient.get('/admin/crawl/stats', { params: { days } }),

  getEmbeddingStats: () =>
    apiClient.get('/admin/embeddings/stats'),

  triggerCrawl: (keywords, source, limit = 50) =>
    apiClient.post('/admin/crawl/manual', { keywords, source, limit }),
};

export { getUserId };
export default apiClient;
