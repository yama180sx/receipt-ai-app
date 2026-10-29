import { describe, expect, it } from 'vitest';
import { requireSuccessResponse } from './responseContract';

describe('requireSuccessResponse', () => {
  it('accepts the OpenAPI success envelope', () => {
    expect(requireSuccessResponse<number[]>('/categories', { success: true, data: [1] }))
      .toEqual({ success: true, data: [1] });
  });

  it.each([
    undefined,
    null,
    {},
    { success: true },
    { success: false, data: [] },
  ])('rejects a malformed response without a property access error: %j', (body) => {
    expect(() => requireSuccessResponse('/categories', body))
      .toThrow('/categories の応答形式が不正です。');
  });
});
