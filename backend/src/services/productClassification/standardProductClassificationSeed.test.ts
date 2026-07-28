import { describe, expect, it } from 'vitest';
import {
  INITIAL_PRODUCT_TYPES,
  INITIAL_STANDARD_PRODUCT_DICTIONARY,
  STANDARD_CATEGORIES,
} from '../../../prisma/standardProductClassificationSeed';

describe('standard product classification seed', () => {
  it('defines the agreed standard category hierarchy roots and children', () => {
    expect(STANDARD_CATEGORIES.filter((category) => !category.parentCode)).toHaveLength(12);
    expect(STANDARD_CATEGORIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'food', name: '食費' }),
        expect.objectContaining({ code: 'food-snacks', parentCode: 'food' }),
        expect.objectContaining({ code: 'daily-goods', name: '日用品' }),
        expect.objectContaining({ code: 'daily-paper', parentCode: 'daily-goods' }),
      ])
    );
  });

  it('defines exactly the initial 17 product types', () => {
    expect(INITIAL_PRODUCT_TYPES).toHaveLength(17);
    expect(new Set(INITIAL_PRODUCT_TYPES.map((productType) => productType.code)).size).toBe(17);
  });

  it('maps every initial product type to a valid category and dictionary entry', () => {
    const categoryCodes = new Set(STANDARD_CATEGORIES.map((category) => category.code));
    const dictionaryCodes = new Set(
      INITIAL_STANDARD_PRODUCT_DICTIONARY.map((entry) => entry.productTypeCode)
    );

    for (const productType of INITIAL_PRODUCT_TYPES) {
      expect(categoryCodes).toContain(productType.standardCategoryCode);
      expect(dictionaryCodes).toContain(productType.code);
    }
  });
});
