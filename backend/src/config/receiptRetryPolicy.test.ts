import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GEMINI_DAILY_QUOTA_FAILURE_CODE,
  HTTP_429_FAILURE_CODE,
  getReceiptAnalysisFailureCode,
  getReceiptManualRetryInfo,
} from './receiptRetryPolicy';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('receipt manual retry policy', () => {
  it('allows one retry for a Gemini daily quota failure by default', () => {
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failureCode: GEMINI_DAILY_QUOTA_FAILURE_CODE, manualRetryCount: 0,
    })).toEqual({ eligible: true, remainingCount: 1 });
  });

  it('does not allow a second manual retry with the default limit', () => {
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failureCode: GEMINI_DAILY_QUOTA_FAILURE_CODE, manualRetryCount: 1,
    })).toEqual({ eligible: false, remainingCount: 0 });
  });

  it('rejects failures outside the configured retryable failure codes', () => {
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failureCode: 'unknown_failure', manualRetryCount: 0,
    }).eligible).toBe(false);
  });

  it('supports operational adjustment through environment settings', () => {
    vi.stubEnv('RECEIPT_MANUAL_RETRY_LIMIT', '2');
    vi.stubEnv('RECEIPT_MANUAL_RETRY_FAILURE_CODES', 'gemini_daily_quota,http_429');
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failureCode: GEMINI_DAILY_QUOTA_FAILURE_CODE, manualRetryCount: 1,
    })).toEqual({ eligible: true, remainingCount: 1 });
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failureCode: HTTP_429_FAILURE_CODE, manualRetryCount: 0,
    }).eligible).toBe(true);
  });

  it('recognizes the persisted daily quota message for jobs created before failure codes', () => {
    expect(getReceiptAnalysisFailureCode('Quota: GenerateRequestsPerDayPerProjectPerModel-FreeTier'))
      .toBe(GEMINI_DAILY_QUOTA_FAILURE_CODE);
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failedReason: 'Quota: GenerateRequestsPerDayPerProjectPerModel-FreeTier',
    }).eligible).toBe(true);
  });

  it('assigns a configurable code to other provider HTTP failures', () => {
    expect(getReceiptAnalysisFailureCode(Object.assign(new Error('rate limited'), { status: 429 })))
      .toBe(HTTP_429_FAILURE_CODE);
  });
});
