import { getHttpStatusFromError, isGeminiDailyQuotaError } from '../utils/httpError';

export const GEMINI_DAILY_QUOTA_FAILURE_CODE = 'gemini_daily_quota';
export const HTTP_429_FAILURE_CODE = 'http_429';
export const HTTP_5XX_FAILURE_CODE = 'http_5xx';

type ReceiptRetryFailureCode =
  | typeof GEMINI_DAILY_QUOTA_FAILURE_CODE
  | typeof HTTP_429_FAILURE_CODE
  | typeof HTTP_5XX_FAILURE_CODE;

type ReceiptManualRetryInput = {
  state: string;
  imagePath: string | null;
  failureCode?: string | null;
  failedReason?: string | null;
  manualRetryCount?: unknown;
};

export type ReceiptManualRetryInfo = {
  eligible: boolean;
  remainingCount: number;
};

function getManualRetryLimit(): number {
  const parsed = Number.parseInt(process.env.RECEIPT_MANUAL_RETRY_LIMIT ?? '1', 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 1;
}

function getRetryableFailureCodes(): Set<string> {
  const configured = process.env.RECEIPT_MANUAL_RETRY_FAILURE_CODES
    ?? GEMINI_DAILY_QUOTA_FAILURE_CODE;
  return new Set(configured.split(',').map((code) => code.trim()).filter(Boolean));
}

export function getReceiptAnalysisFailureCode(error: unknown): ReceiptRetryFailureCode | undefined {
  if (isGeminiDailyQuotaError(error)) return GEMINI_DAILY_QUOTA_FAILURE_CODE;

  const status = getHttpStatusFromError(error);
  if (status === 429) return HTTP_429_FAILURE_CODE;
  if (status !== undefined && status >= 500) return HTTP_5XX_FAILURE_CODE;
  return undefined;
}

export function getReceiptManualRetryInfo({
  state,
  imagePath,
  failureCode,
  failedReason,
  manualRetryCount,
}: ReceiptManualRetryInput): ReceiptManualRetryInfo {
  const retryLimit = getManualRetryLimit();
  const retryCount = Math.max(0, Math.floor(Number(manualRetryCount) || 0));
  const resolvedFailureCode = failureCode
    ?? (isGeminiDailyQuotaError(failedReason) ? GEMINI_DAILY_QUOTA_FAILURE_CODE : undefined);
  const remainingCount = Math.max(0, retryLimit - retryCount);

  return {
    eligible: state === 'failed'
      && imagePath !== null
      && remainingCount > 0
      && resolvedFailureCode !== undefined
      && getRetryableFailureCodes().has(resolvedFailureCode),
    remainingCount,
  };
}
