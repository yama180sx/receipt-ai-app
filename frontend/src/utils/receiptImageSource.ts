import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import apiClient from './apiClient';
import { authService } from '../services/authService';

export type ReceiptImageSource = {
  uri: string;
  headers?: Record<string, string>;
};

function getUploadApiPath(imagePath: string): string {
  const normalized = imagePath.replace(/^\//, '');
  const filename = normalized.startsWith('uploads/')
    ? normalized.slice('uploads/'.length)
    : normalized;
  return `/uploads/${encodeURIComponent(filename)}`;
}

function getCacheFilename(imagePath: string): string {
  const normalized = imagePath.replace(/^\//, '');
  return normalized.replace(/\//g, '_');
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const [token, memberId] = await Promise.all([
    authService.getToken(),
    authService.getMemberId(),
  ]);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (memberId != null) {
    headers['x-member-id'] = String(memberId);
  }
  return headers;
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

  try {
    if (Platform.OS === 'web') {
      const res = await apiClient.get(getUploadApiPath(imagePath), {
        responseType: 'blob',
      });
      return { uri: URL.createObjectURL(res.data) };
    }

    const destination = new File(Paths.cache, `receipt-${getCacheFilename(imagePath)}`);
    const downloaded = await File.downloadFileAsync(
      getReceiptImageApiUrl(imagePath),
      destination,
      {
        headers: await buildAuthHeaders(),
        idempotent: true,
      }
    );
    return { uri: downloaded.uri };
  } catch (error) {
    console.warn('[ReceiptImage] Failed to load image:', error);
    return null;
  }
}

/** 認証付き API から取得したローカル URI（Web: blob / Native: cache file） */
export function useReceiptImageSource(imagePath: string | null | undefined) {
  const [source, setSource] = useState<ReceiptImageSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    buildReceiptImageSource(imagePath).then((next) => {
      if (cancelled) {
        if (next?.uri.startsWith('blob:')) {
          URL.revokeObjectURL(next.uri);
        }
        return;
      }
      if (next?.uri.startsWith('blob:')) {
        blobUrl = next.uri;
      }
      setSource(next);
    });

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imagePath]);

  return source;
}
