import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- リクエストインターセプター ---
apiClient.interceptors.request.use((config) => {
  if (API_TOKEN) {
    config.headers.Authorization = `Bearer ${API_TOKEN}`;
  }
  return config;
}, (error) => Promise.reject(error));

// --- レスポンスインターセプター: [Issue #40] 加工をせずエラーハンドリングのみに集中 ---
apiClient.interceptors.response.use(
  (response) => {
    // 構造は変えず、そのまま返す。これで res.data.data が維持されます。
    return response;
  },
  (error) => {
    if (error.response && error.response.data) {
      const message = error.response.data.error || error.message;
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  }
);

export default apiClient;