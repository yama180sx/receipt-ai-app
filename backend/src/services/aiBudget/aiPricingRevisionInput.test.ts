import { AiUsagePurpose } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { parseAiPricingRevisionArgs } from './aiPricingRevisionInput';

const args = ['--purpose', 'ocr', '--model-id', 'gemini-3.5-flash-lite', '--input-price-jpy-per-million', '12.345678', '--output-price-jpy-per-million', '98.765432', '--max-input-tokens', '1000000', '--max-output-tokens', '8192', '--effective-from', '2026-08-19T00:00:00.000Z', '--source-url', 'https://ai.google.dev/gemini-api/docs/pricing', '--verified-at', '2026-08-19T01:00:00.000Z', '--verified-by', 'global-ai-budget-admin'];

describe('parseAiPricingRevisionArgs', () => {
  it('parses the complete deployment-only registration payload', () => {
    expect(parseAiPricingRevisionArgs(args)).toMatchObject({ purpose: AiUsagePurpose.OCR, modelId: 'gemini-3.5-flash-lite', inputPriceJpyPerMillion: '12.345678', maxInputTokens: 1000000, sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing' });
  });
  it('rejects an unverified source URL and invalid purpose', () => {
    expect(() => parseAiPricingRevisionArgs(args.map((value) => value === 'ocr' ? 'other' : value))).toThrow('--purpose must be ocr or product-classification.');
    expect(() => parseAiPricingRevisionArgs(args.map((value) => value === 'https://ai.google.dev/gemini-api/docs/pricing' ? 'http://example.com' : value))).toThrow('--source-url must be an HTTPS URL.');
  });
});
