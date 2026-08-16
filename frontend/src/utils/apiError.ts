import axios from 'axios';
import { OpenApiHttpError } from '../api/openapiHttpError';
import { showAlert } from './alertMessage';

function readStringField(data: unknown, key: 'error' | 'message'): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function readValidationDetails(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const details = (data as Record<string, unknown>).details;
  if (!Array.isArray(details)) return undefined;

  const messages = details.flatMap((detail) => {
    if (!detail || typeof detail !== 'object') return [];
    const message = (detail as Record<string, unknown>).message;
    return typeof message === 'string' ? [message] : [];
  });
  return messages.length > 0 ? messages.join('\n') : undefined;
}

/** Axios レスポンス body（存在する場合） */
export function getApiErrorResponseData(error: unknown): unknown {
  if (error instanceof OpenApiHttpError) {
    return error.data;
  }
  if (axios.isAxiosError(error)) {
    return error.response?.data;
  }
  return undefined;
}

/** HTTP ステータス（Axios エラー時） */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (error instanceof OpenApiHttpError) {
    return error.status;
  }
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
  if (fromMessage) {
    const validationDetails = readValidationDetails(data);
    return validationDetails ? `${fromMessage}\n${validationDetails}` : fromMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/** API エラーをログ出力し、抽出メッセージでユーザーに通知する */
export function showApiErrorAlert(
  title: string,
  error: unknown,
  fallback = '通信エラーが発生しました。'
): void {
  // 4xx は利用者が修正できる想定内の入力・状態エラーであり、Expo の
  // 開発用 Console Error 画面を出さない。5xx と通信障害だけを error として記録する。
  if ((getApiErrorStatus(error) ?? 0) >= 500 || getApiErrorStatus(error) === undefined) {
    console.error(`[API Error] ${title}:`, error);
  } else {
    console.warn(`[API Warning] ${title}:`, getApiErrorMessage(error, fallback));
  }
  showAlert(title, getApiErrorMessage(error, fallback));
}
