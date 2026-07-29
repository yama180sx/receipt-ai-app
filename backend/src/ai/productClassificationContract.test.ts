import { describe, expect, it } from 'vitest';
import {
  parseAndValidateProductClassificationResponse,
  ProductClassificationResponseValidationError,
  type ProductClassificationAiRequest,
} from './productClassificationContract';

const request: ProductClassificationAiRequest = {
  familyGroupId: 1,
  storeName: 'テスト店',
  items: [
    {
      itemId: 10,
      itemName: '特濃牛乳 1000ml',
      normalizedName: '特濃牛乳 1000ml',
      candidates: [
        { productTypeId: 11, name: '牛乳', standardCategoryName: '乳製品' },
      ],
    },
  ],
};

describe('parseAndValidateProductClassificationResponse', () => {
  it('accepts a response that selects only a supplied candidate', () => {
    expect(
      parseAndValidateProductClassificationResponse(
        '{"items":[{"itemId":10,"productTypeId":11,"confidence":"high"}]}',
        request
      )
    ).toEqual({ items: [{ itemId: 10, productTypeId: 11, confidence: 'high' }] });
  });

  it('accepts null as a valid no-selection response', () => {
    expect(
      parseAndValidateProductClassificationResponse(
        '{"items":[{"itemId":10,"productTypeId":null,"confidence":"low"}]}',
        request
      )
    ).toEqual({ items: [{ itemId: 10, productTypeId: null, confidence: 'low' }] });
  });

  it.each([
    '{not-json}',
    '{"items":[{"itemId":10,"productTypeId":99,"confidence":"high"}]}',
    '{"items":[{"itemId":10,"productTypeId":11,"confidence":"high"},{"itemId":10,"productTypeId":11,"confidence":"high"}]}',
    '{"items":[{"itemId":99,"productTypeId":11,"confidence":"high"}]}',
    '{"items":[{"itemId":10,"productTypeId":11,"confidence":"certain"}]}',
    '{"items":[{"itemId":10,"productTypeId":11,"confidence":"high","reason":"候補一致"}]}',
  ])('rejects an invalid batch response: %s', (rawText) => {
    expect(() => parseAndValidateProductClassificationResponse(rawText, request)).toThrow(
      ProductClassificationResponseValidationError
    );
  });
});
