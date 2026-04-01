import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエスト送信前にトークンを自動注入
apiClient.interceptors.request.use((config) => {
  if (API_TOKEN) {
    config.headers.Authorization = `Bearer ${API_TOKEN}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;