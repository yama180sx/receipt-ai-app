import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
// 開発用トークン（Issue #52 完了後は SecureStore から取得するように移行）
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- リクエストインターセプター ---
apiClient.interceptors.request.use((config) => {
  // 1. JWT 認証トークンの付与
  if (API_TOKEN) {
    config.headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  // 2. [Issue #51/52 準備] 
  // TODO: Issue #52 にて AsyncStorage/SecureStore から取得した 
  // currentMemberId を自動で headers['x-member-id'] にセットする処理をここに追加予定
  
  return config;
}, (error) => Promise.reject(error));

/**
 * --- レスポンスインターセプター ---
 * [Issue #42 & #51] エラーハンドリングの統一
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.data) {
      // バックエンドの AppError が返す { success, message, code } 構造に対応
      const serverMessage = error.response.data.message || error.message;
      const errorCode = error.response.data.code;
      
      error.message = serverMessage;

      // [Issue #51] 認証エラー (401) の共通処理
      if (error.response.status === 401) {
        console.warn(`[API] Unauthorized: ${errorCode}`);
        // ここでグローバルな通知やログイン画面への遷移トリガーを引くことが可能です
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;