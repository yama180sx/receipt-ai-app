import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import apiClient from './apiClient';

export type ReceiptImageSource = {
  uri: string;
  headers: Record<string, string>;
};

const TOKEN_KEY = 'userToken';

async function getAuthToken(): Promise<string | null> {
  try {
    return Platform.OS === 'web'
      ? await AsyncStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** imagePath (uploads/xxx.webp) を認証付き API URL に変換 */
export function getReceiptImageApiUrl(imagePath: string): string {
  const normalized = imagePath.replace(/^\//, '');
  const filename = normalized.startsWith('uploads/')
    ? normalized.slice('uploads/'.length)
    : normalized;
  const base = (apiClient.defaults.baseURL || 'http://localhost:3000/api').replace(/\/$/, '');
  return `${base}/uploads/${encodeURIComponent(filename)}`;
}

export async function buildReceiptImageSource(
  imagePath: string | null | undefined
): Promise<ReceiptImageSource | null> {
  if (!imagePath) return null;
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return {
    uri: getReceiptImageApiUrl(imagePath),
    headers,
  };
}

/** React Native Image 用 — Authorization ヘッダ付き source */
export function useReceiptImageSource(imagePath: string | null | undefined) {
  const [source, setSource] = useState<ReceiptImageSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildReceiptImageSource(imagePath).then((next) => {
      if (!cancelled) setSource(next);
    });
    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  return source;
}
