import { describe, expect, it } from 'vitest';
import {
  getHttpStatusFromError,
  isGeminiDailyQuotaError,
  isRetryableHttpError,
} from './httpError';

const DAILY_QUOTA_MESSAGE = `[GoogleGenerativeAI Error]: [429 Too Many Requests]
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.5-flash
"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"`;

const RPM_LIMIT_MESSAGE = `[GoogleGenerativeAI Error]: [429 Too Many Requests]
"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"`;

describe('httpError retry classification', () => {
  it('detects Gemini daily free-tier quota exhaustion', () => {
    const error = Object.assign(new Error(DAILY_QUOTA_MESSAGE), { status: 429 });
    expect(isGeminiDailyQuotaError(error)).toBe(true);
    expect(isRetryableHttpError(error)).toBe(false);
  });

  it('keeps per-minute 429 as retryable', () => {
    const error = Object.assign(new Error(RPM_LIMIT_MESSAGE), { status: 429 });
    expect(isGeminiDailyQuotaError(error)).toBe(false);
    expect(isRetryableHttpError(error)).toBe(true);
  });

  it('keeps 5xx as retryable', () => {
    expect(isRetryableHttpError({ status: 503, message: 'Service Unavailable' })).toBe(true);
  });

  it('reads HTTP status from nested response', () => {
    expect(getHttpStatusFromError({ response: { status: 429 } })).toBe(429);
  });
});
