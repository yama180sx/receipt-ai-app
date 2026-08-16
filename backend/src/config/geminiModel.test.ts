import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Gemini model configuration', () => {
  it('uses independent fixed defaults for receipt OCR and product classification', async () => {
    const config = await import('./geminiModel.js');

    expect(config.getConfiguredReceiptModelId()).toBe('gemini-3.5-flash-lite');
    expect(config.getConfiguredProductClassificationModelId()).toBe('gemini-3.5-flash-lite');
  });

  it('allows OCR and product classification to use different fixed model IDs', async () => {
    vi.stubEnv('GEMINI_RECEIPT_MODEL', 'gemini-3.6-flash');
    vi.stubEnv('GEMINI_PRODUCT_CLASSIFICATION_MODEL', 'gemini-3.5-flash-lite');
    const config = await import('./geminiModel.js');

    expect(config.getConfiguredReceiptModelId()).toBe('gemini-3.6-flash');
    expect(config.getConfiguredProductClassificationModelId()).toBe('gemini-3.5-flash-lite');
  });

  it('rejects a moving latest alias at startup', async () => {
    vi.stubEnv('GEMINI_RECEIPT_MODEL', 'gemini-flash-latest');

    await expect(import('./geminiModel.js')).rejects.toThrow('fixed Gemini model ID');
  });
});
