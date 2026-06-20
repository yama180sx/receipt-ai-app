import axios from 'axios';

function readStringField(data: unknown, key: 'error' | 'message'): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Axios レスポンス body（存在する場合） */
export function getApiErrorResponseData(error: unknown): unknown {
  if (axios.isAxiosError(error)) {
    return error.response?.data;
  }
  return undefined;
}

/** HTTP ステータス（Axios エラー時） */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

/** API / Error からユーザー向けメッセージを抽出 */
export function getApiErrorMessage(
  error: unknown,
  fallback = '通信エラーが発生しました。'
): string {
  const data = getApiErrorResponseData(error);
  const fromError = readStringField(data, 'error');
  if (fromError) return fromError;

  const fromMessage = readStringField(data, 'message');
  if (fromMessage) return fromMessage;

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
