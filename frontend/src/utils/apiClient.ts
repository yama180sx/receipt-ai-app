import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { AUTH_STORAGE_KEYS } from '../services/authService';

/**
 * 401エラー時にセッション Context / ルート側でログアウト処理を発火させるためのハンドラ
 */
let onUnauthorizedHandler: (() => void) | null = null;

export const setOnUnauthorized = (handler: () => void) => {
  onUnauthorizedHandler = handler;
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE) {
  console.warn('[API] Warning: EXPO_PUBLIC_API_URL is not defined. Falling back to localhost.');
}

const apiClient = axios.create({
  baseURL: API_BASE || 'http://localhost:3000/api',
  timeout: 30_000,
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
  return await getStorageItem(AUTH_STORAGE_KEYS.ROLE);
};

// --- リクエストインターセプター：送信前に認証情報を自動注入 ---
apiClient.interceptors.request.use(async (config) => {
  const token = await getStorageItem(AUTH_STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const memberId = await getStorageItem(AUTH_STORAGE_KEYS.MEMBER_ID);
  if (memberId) {
    config.headers['x-member-id'] = memberId;
  }

  const isFormData =
    typeof FormData !== 'undefined' &&
    (config.data instanceof FormData ||
      (typeof config.data === 'object' &&
        config.data !== null &&
        typeof (config.data as FormData).append === 'function'));

  if (isFormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
      if (Platform.OS !== 'web') {
        config.headers['Content-Type'] = 'multipart/form-data';
      }
    }
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
      const serverMessage = error.response.data.message || error.message;
      const errorCode = error.response.data.code;

      error.message = serverMessage;

      if (error.response.status === 401) {
        console.warn(`[API] Unauthorized: ${errorCode || 'TOKEN_EXPIRED'}`);
        if (onUnauthorizedHandler) {
          onUnauthorizedHandler();
        }
      } else if (error.response.status === 403) {
        console.warn(`[API] Forbidden: ${serverMessage}`);
        Alert.alert('アクセス権限エラー', 'この操作を行う権限がありません。');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
