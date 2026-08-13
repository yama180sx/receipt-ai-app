import { describe, expect, it } from 'vitest';
import { loadInitialData } from '../prisma/initialData';

describe('initial data snapshot (#117-5)', () => {
  it('contains the approved common-master and household settings', () => {
    const { standard, households, manifest } = loadInitialData();
    expect(standard.standardCategories).toHaveLength(18);
    expect(standard.productTypes).toHaveLength(22);
    expect(standard.standardProductClassificationRules).toHaveLength(40);
    expect(manifest.expectedCounts).toEqual({ standardCategories: 18, productTypes: 22, standardProductClassificationRules: 40 });
    expect(households.households.map((item) => item.inviteCode).sort()).toEqual(['SATO-2026', 'YAMAMOTO-2026']);
    expect(households.promptTemplates.map((item) => item.key).sort()).toEqual(['PRODUCT_CLASSIFICATION', 'RECEIPT_ANALYSIS']);
    expect(manifest.preservedUploadPaths).toContain('uploads/tenant-isolation-fixture.webp');
  });
});
