import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

// --- 定数定義 ---
// [Issue #73] role を保存するためのキー（USER_ROLE）を追加
const STORAGE_KEYS = {
  TOKEN: 'userToken',
  MEMBER_ID: 'currentMemberId',
  USER_ROLE: 'currentUserRole', 
} as const;

/**
 * [Issue #52] 401エラー時に App.tsx 等の UI 側でログアウト処理を発火させるためのハンドラ
 */
let onUnauthorizedHandler: (() => void) | null = null;

export const setOnUnauthorized = (handler: () => void) => {
  onUnauthorizedHandler = handler;
};

// 環境変数からベースURLを取得。未設定の場合は警告を出す
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE) {
  console.warn('[API] Warning: EXPO_PUBLIC_API_URL is not defined. Falling back to localhost.');
}

const apiClient = axios.create({
  baseURL: API_BASE || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * ストレージから値を安全に取得するユーティリティ
 */
const getStorageItem = async (key: string): Promise<string | null> => {
  try {
    return Platform.OS === 'web'
      ? await AsyncStorage.getItem(key)
      : await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[API-AUTH] Storage retrieval failed for key: ${key}`, error);
    return null;
  }
};

/**
 * [Issue #73] 現在ログイン中のユーザーの Role を取得するユーティリティ
 */
export const getUserRole = async (): Promise<string | null> => {
  return await getStorageItem(STORAGE_KEYS.USER_ROLE);
};

// --- リクエストインターセプター：送信前に認証情報を自動注入 ---
apiClient.interceptors.request.use(async (config) => {
  const token = await getStorageItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const memberId = await getStorageItem(STORAGE_KEYS.MEMBER_ID);
  if (memberId) {
    config.headers['x-member-id'] = memberId;
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

      // [Issue #51/52/73/75] 認証エラー (401) または 権限エラー (403) のハンドリング
      if (error.response.status === 401) {
        console.warn(`[API] Unauthorized: ${errorCode || 'TOKEN_EXPIRED'}`);
        if (onUnauthorizedHandler) {
          onUnauthorizedHandler();
        }
      } else if (error.response.status === 403) {
        // [Issue #75] 403 Forbidden: 管理者メニュー等への不正アクセス時のUIフィードバック
        console.warn(`[API] Forbidden: ${serverMessage}`);
        Alert.alert('アクセス権限エラー', 'この操作を行う権限がありません。');
      }
    }
    return Promise.reject(error);
  }
);

// ★ [Issue #78/#79] 按分機能等のAPIコール用ラッパー
export const api = {
  // 家族メンバー一覧の取得
  getFamilyMembers: async () => {
    const res = await apiClient.get('/family-groups/members');
    return res.data;
  },
  // 明細ごとの按分設定保存
  saveItemSplits: async (itemId: number, splits: { familyMemberId: number; amount?: number; ratio?: number }[]) => {
    const res = await apiClient.post(`/receipts/items/${itemId}/splits`, { splits });
    return res.data;
  }
};

export default apiClient;