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
  it('allows one retry for a Gemini daily quota failure after the next Pacific midnight', () => {
    const failedAt = Date.parse('2026-08-16T08:00:00.000Z'); // 8/16 01:00 PDT
    const nextResetAt = Date.parse('2026-08-17T07:00:00.000Z');
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failureCode: GEMINI_DAILY_QUOTA_FAILURE_CODE, manualRetryCount: 0, failedAt,
      now: nextResetAt,
    })).toEqual({ eligible: true, remainingCount: 1, availableAt: undefined });
  });

  it('blocks a Gemini daily quota retry until the next Pacific midnight', () => {
    const failedAt = Date.parse('2026-08-16T08:00:00.000Z'); // 8/16 01:00 PDT
    const nextResetAt = Date.parse('2026-08-17T07:00:00.000Z');
    expect(getReceiptManualRetryInfo({
      state: 'failed', imagePath: 'uploads/receipt.webp',
      failureCode: GEMINI_DAILY_QUOTA_FAILURE_CODE, manualRetryCount: 0, failedAt,
      now: failedAt + 1,
    })).toEqual({ eligible: false, remainingCount: 1, availableAt: nextResetAt });
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
      failedAt: Date.parse('2026-08-16T08:00:00.000Z'),
      now: Date.parse('2026-08-17T07:00:00.000Z'),
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
      failedAt: Date.parse('2026-08-16T08:00:00.000Z'),
      now: Date.parse('2026-08-17T07:00:00.000Z'),
    }).eligible).toBe(true);
  });

  it('assigns a configurable code to other provider HTTP failures', () => {
    expect(getReceiptAnalysisFailureCode(Object.assign(new Error('rate limited'), { status: 429 })))
      .toBe(HTTP_429_FAILURE_CODE);
  });
});
