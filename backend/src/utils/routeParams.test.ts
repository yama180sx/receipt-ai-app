import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { getRouteParam } from './routeParams';

function mockRequest(params: Record<string, string | string[]>): Request {
  return { params } as Request;
}

describe('getRouteParam', () => {
  it('returns string param as-is', () => {
    expect(getRouteParam(mockRequest({ id: '42' }), 'id')).toBe('42');
  });

  it('returns first element when param is string[]', () => {
    expect(getRouteParam(mockRequest({ id: ['1', '2'] }), 'id')).toBe('1');
  });

  it('returns empty string when param is missing', () => {
    expect(getRouteParam(mockRequest({}), 'id')).toBe('');
  });
});
