import { describe, expect, it, vi } from 'vitest';
import type { ProductClassificationProvider } from './productClassificationProvider';
import {
  getProductClassificationProvider,
  resetProductClassificationProvider,
  setProductClassificationProvider,
} from './productClassificationProviderRegistry';
import { geminiProductClassificationProvider } from './geminiProductClassificationProvider';

describe('productClassificationProviderRegistry', () => {
  it('returns the Gemini provider by default', () => {
    resetProductClassificationProvider();
    expect(getProductClassificationProvider()).toBe(geminiProductClassificationProvider);
  });

  it('allows injecting a mock provider for tests', async () => {
    const provider: ProductClassificationProvider = {
      classifyProducts: vi.fn().mockResolvedValue('{"items":[]}'),
    };
    setProductClassificationProvider(provider);

    await expect(
      getProductClassificationProvider().classifyProducts({ familyGroupId: 1, items: [] })
    ).resolves.toBe('{"items":[]}');

    resetProductClassificationProvider();
  });
});
