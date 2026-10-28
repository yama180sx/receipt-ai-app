import type { ApiSuccessResponse } from './generated';

/**
 * OpenAPI の success envelope を実行時にも検証する。
 *
 * TypeScript の型だけでは、ネットワーク層や実行環境から `undefined` が返った
 * 場合を防げない。利用画面で生の TypeError にせず、失敗した API を特定可能な
 * エラーとして扱う。
 */
export function requireSuccessResponse<T>(
  endpoint: string,
  responseBody: unknown
): ApiSuccessResponse<T> {
  if (
    !responseBody ||
    typeof responseBody !== 'object' ||
    (responseBody as { success?: unknown }).success !== true ||
    !Object.prototype.hasOwnProperty.call(responseBody, 'data')
  ) {
    throw new Error(`${endpoint} の応答形式が不正です。`);
  }

  return responseBody as ApiSuccessResponse<T>;
}
