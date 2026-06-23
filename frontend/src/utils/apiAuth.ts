import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_STORAGE_KEYS } from '../services/authService';

async function getStorageItem(key: string): Promise<string | null> {
  try {
    return Platform.OS === 'web'
      ? await AsyncStorage.getItem(key)
      : await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[API-AUTH] Storage retrieval failed for key: ${key}`, error);
    return null;
  }
}

/** JWT / x-member-id を API リクエスト用ヘッダに載せる */
export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getStorageItem(AUTH_STORAGE_KEYS.TOKEN);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const memberId = await getStorageItem(AUTH_STORAGE_KEYS.MEMBER_ID);
  if (memberId) {
    headers['x-member-id'] = memberId;
  }
  return headers;
}

/** [Issue #73] 現在ログイン中ユーザーの Role */
export async function getUserRole(): Promise<string | null> {
  return getStorageItem(AUTH_STORAGE_KEYS.ROLE);
}
