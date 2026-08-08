import { describe, expect, it } from 'vitest';
import {
  INITIAL_PRODUCT_TYPES,
  INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES,
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

  it('defines exactly the initial 22 product types including beverages and vehicle fuel', () => {
    expect(INITIAL_PRODUCT_TYPES).toHaveLength(22);
    expect(new Set(INITIAL_PRODUCT_TYPES.map((productType) => productType.code)).size).toBe(22);
    expect(INITIAL_PRODUCT_TYPES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'tea', standardCategoryCode: 'food-beverages' }),
        expect.objectContaining({ code: 'carbonated-drinks', standardCategoryCode: 'food-beverages' }),
        expect.objectContaining({ code: 'coffee', standardCategoryCode: 'food-beverages' }),
        expect.objectContaining({ code: 'other-beverages', standardCategoryCode: 'food-beverages' }),
        expect.objectContaining({ code: 'vehicle-fuel', name: '燃料（車用）', standardCategoryCode: 'transport-communication' }),
      ])
    );
  });

  it('maps every initial rule to a valid category and product type', () => {
    const categoryCodes = new Set(STANDARD_CATEGORIES.map((category) => category.code));
    for (const rule of INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES) {
      expect(categoryCodes).toContain(rule.standardCategoryCode);
      expect(INITIAL_PRODUCT_TYPES.map((productType) => productType.code)).toContain(rule.productTypeCode);
    }
  });

  it('includes beverage and daily-goods keyword rules while excluding unsafe one-character terms', () => {
    expect(INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ normalizedKeyword: '麦茶', productTypeCode: 'tea' }),
        expect.objectContaining({ normalizedKeyword: 'コーヒー', productTypeCode: 'coffee' }),
        expect.objectContaining({ normalizedKeyword: '洗濯洗剤', productTypeCode: 'laundry-detergent' }),
        expect.objectContaining({ normalizedKeyword: 'トイレットペーパー', productTypeCode: 'toilet-paper' }),
        expect.objectContaining({ normalizedKeyword: 'レギュラー', productTypeCode: 'vehicle-fuel' }),
        expect.objectContaining({ normalizedKeyword: 'ハイオク', productTypeCode: 'vehicle-fuel' }),
        expect.objectContaining({ normalizedKeyword: '軽油', productTypeCode: 'vehicle-fuel' }),
      ])
    );
    expect(INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES.some((entry) => entry.normalizedKeyword === '茶')).toBe(false);
    expect(INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES.some((entry) => entry.normalizedKeyword === '洗車')).toBe(false);
    expect(INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES.some((entry) => entry.normalizedKeyword === '灯油')).toBe(false);
  });
});
