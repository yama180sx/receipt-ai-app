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

/**
 * --- レスポンスインターセプター ---
 * [Issue #42] エラーレスポンスのキーを 'message' に統一し、
 * かつコンテキスト（response/status）を維持するために元の error を加工して返します。
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.data) {
      // 1. バックエンドの統一キー 'message' から文言を抽出
      const serverMessage = error.response.data.message || error.message;
      
      // 2. 元のエラーオブジェクトの message を書き換える
      // これにより、catch(error) 側で error.message で文言が取れ、
      // かつ error.response.status で HTTP 409 等の判定も可能になります。
      error.message = serverMessage;
    }
    return Promise.reject(error);
  }
);

export default apiClient;