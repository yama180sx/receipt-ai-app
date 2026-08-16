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
  /** BullMQの失敗完了時刻（epoch milliseconds）。 */
  failedAt?: unknown;
  /** テスト時に現在時刻を固定するための内部入力。 */
  now?: number;
};

export type ReceiptManualRetryInfo = {
  eligible: boolean;
  remainingCount: number;
  /** 日次無料枠を使い切った場合の、次に手動再実行できる時刻（epoch milliseconds）。 */
  availableAt?: number;
};

const PACIFIC_TIME_ZONE = 'America/Los_Angeles';

function getPacificDateParts(timestamp: number): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: valueOf('year'), month: valueOf('month'), day: valueOf('day') };
}

function getPacificOffsetMilliseconds(timestamp: number): number {
  const timeZoneName = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIME_ZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(timestamp)).find((part) => part.type === 'timeZoneName')?.value;
  const match = timeZoneName?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) throw new Error('Pacific timezone offset could not be resolved.');

  const direction = match[1] === '+' ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return direction * (hours * 60 + minutes) * 60 * 1000;
}

/** Gemini Free Tier の RPD がリセットされる、次の太平洋時間の午前0時を返す。 */
export function getNextGeminiDailyQuotaResetAt(failedAt: number): number {
  const { year, month, day } = getPacificDateParts(failedAt);
  const nextPacificMidnightAsUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);
  return nextPacificMidnightAsUtc - getPacificOffsetMilliseconds(nextPacificMidnightAsUtc);
}

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
  failedAt,
  now = Date.now(),
}: ReceiptManualRetryInput): ReceiptManualRetryInfo {
  const retryLimit = getManualRetryLimit();
  const retryCount = Math.max(0, Math.floor(Number(manualRetryCount) || 0));
  const resolvedFailureCode = failureCode
    ?? (isGeminiDailyQuotaError(failedReason) ? GEMINI_DAILY_QUOTA_FAILURE_CODE : undefined);
  const remainingCount = Math.max(0, retryLimit - retryCount);
  const isDailyQuotaFailure = resolvedFailureCode === GEMINI_DAILY_QUOTA_FAILURE_CODE;
  const failedAtTimestamp = Number(failedAt);
  const quotaFailedAt = Number.isFinite(failedAtTimestamp) && failedAtTimestamp > 0
    ? failedAtTimestamp
    : now;
  const availableAt = isDailyQuotaFailure
    ? getNextGeminiDailyQuotaResetAt(quotaFailedAt)
    : undefined;
  const quotaHasReset = availableAt === undefined || now >= availableAt;
  const eligibleWithoutQuotaWait = state === 'failed'
    && imagePath !== null
    && remainingCount > 0
    && resolvedFailureCode !== undefined
    && getRetryableFailureCodes().has(resolvedFailureCode);

  return {
    eligible: eligibleWithoutQuotaWait && quotaHasReset,
    remainingCount,
    availableAt: eligibleWithoutQuotaWait && !quotaHasReset ? availableAt : undefined,
  };
}
