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

  it('defines the beverage category below food', () => {
    expect(STANDARD_CATEGORIES).toContainEqual(
      expect.objectContaining({ code: 'food-beverages', name: '飲料', parentCode: 'food' })
    );
  });

  it('defines exactly the initial 21 product types including beverages', () => {
    expect(INITIAL_PRODUCT_TYPES).toHaveLength(21);
    expect(new Set(INITIAL_PRODUCT_TYPES.map((productType) => productType.code)).size).toBe(21);
    expect(INITIAL_PRODUCT_TYPES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'tea', standardCategoryCode: 'food-beverages' }),
        expect.objectContaining({ code: 'carbonated-drinks', standardCategoryCode: 'food-beverages' }),
        expect.objectContaining({ code: 'coffee', standardCategoryCode: 'food-beverages' }),
        expect.objectContaining({ code: 'other-beverages', standardCategoryCode: 'food-beverages' }),
      ])
    );
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

  it('includes only normalized, exact-match beverage dictionary entries', () => {
    expect(INITIAL_STANDARD_PRODUCT_DICTIONARY).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ normalizedName: 'zone hyper 400ml', productTypeCode: 'other-beverages' }),
        expect.objectContaining({ normalizedName: 'grダカラやさしい麦茶2lx6', productTypeCode: 'tea' }),
        expect.objectContaining({ normalizedName: 'nescafeex b珈琲無糖', productTypeCode: 'coffee' }),
        expect.objectContaining({ normalizedName: 'ファンタ gdグレープ 500ml', productTypeCode: 'carbonated-drinks' }),
      ])
    );
    expect(INITIAL_STANDARD_PRODUCT_DICTIONARY.every((entry) => entry.normalizedName === entry.normalizedName.normalize('NFKC').toLowerCase().trim())).toBe(true);
  });
});
