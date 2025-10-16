import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  search: (query, userId = 'anonymous', limit = 20) =>
    apiClient.post('/search/', { query, user_id: userId, limit }),
  
  getPaperDetails: (paperId) =>
    apiClient.get(`/search/paper/${paperId}`),
  
  getSearchHistory: (userId, limit = 20) =>
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

export default apiClient;