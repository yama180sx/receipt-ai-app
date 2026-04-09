import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * [Issue #52] 401エラー時に App.tsx 等の UI 側でログアウト処理を発火させるためのハンドラ
 */
let onUnauthorizedHandler: (() => void) | null = null;

export const setOnUnauthorized = (handler: () => void) => {
  onUnauthorizedHandler = handler;
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- リクエストインターセプター：送信前に認証情報を自動注入 ---
apiClient.interceptors.request.use(async (config) => {
  try {
    // 1. JWTトークンの取得と付与
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. [Issue #51/52] メンバーIDの取得と付与 (x-member-id)
    // これにより、各 Screen で headers を手動設定する必要がなくなります
    const memberId = await SecureStore.getItemAsync('currentMemberId');
    if (memberId) {
      config.headers['x-member-id'] = memberId;
    }
  } catch (error) {
    console.error('[API-AUTH] SecureStore 取得失敗:', error);
  }
  
  return config;
}, (error) => Promise.reject(error));

/**
 * --- レスポンスインターセプター：エラーの統一ハンドリング ---
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.data) {
      // バックエンドの AppError 構造からメッセージを抽出
      const serverMessage = error.response.data.message || error.message;
      const errorCode = error.response.data.code;
      
      error.message = serverMessage;

      // [Issue #51/52] 認証エラー (401) のハンドリング
      if (error.response.status === 401) {
        console.warn(`[API] Unauthorized: ${errorCode || 'TOKEN_EXPIRED'}`);
        
        // App.tsx で登録されたログアウト関数を実行し、UIをログイン画面に切り替える
        if (onUnauthorizedHandler) {
          onUnauthorizedHandler();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;