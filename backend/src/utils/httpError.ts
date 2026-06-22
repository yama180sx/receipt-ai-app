/** リトライ判定用に unknown エラーから HTTP ステータスを取得 */
export function getHttpStatusFromError(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const record = error as Record<string, unknown>;
  if (typeof record.status === 'number') return record.status;

  const response = record.response;
  if (response && typeof response === 'object') {
    const status = (response as Record<string, unknown>).status;
    if (typeof status === 'number') return status;
  }

  return undefined;
}

export function isRetryableHttpError(error: unknown): boolean {
  const status = getHttpStatusFromError(error);
  return status === 429 || (status !== undefined && status >= 500);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export function getNodeErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
