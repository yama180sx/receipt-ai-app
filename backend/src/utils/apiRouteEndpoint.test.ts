import { describe, expect, it } from 'vitest';
import {
  diffRouteSets,
  normalizeRouteKey,
  toRouteKeySet,
} from './apiRouteEndpoint';

describe('apiRouteEndpoint', () => {
  it('normalizes Express and OpenAPI path params to the same key', () => {
    expect(normalizeRouteKey('PATCH', '/api/receipts/items/:id')).toBe(
      normalizeRouteKey('PATCH', '/api/receipts/items/{itemId}')
    );
  });

  it('diffRouteSets reports missing and extra endpoints', () => {
    const actual = toRouteKeySet([{ method: 'GET', path: '/api/receipts' }]);
    const expected = toRouteKeySet([
      { method: 'GET', path: '/api/receipts' },
      { method: 'POST', path: '/api/receipts' },
    ]);

    expect(diffRouteSets(actual, expected)).toEqual({
      missingInActual: ['POST /api/receipts'],
      extraInActual: [],
    });
  });
});
