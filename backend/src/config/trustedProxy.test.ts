import { describe, expect, it } from 'vitest';
import { getTrustedProxyHops } from './trustedProxy';

describe('getTrustedProxyHops', () => {
  it('defaults to zero so forwarded headers are not trusted', () => {
    expect(getTrustedProxyHops(undefined)).toBe(0);
    expect(getTrustedProxyHops('')).toBe(0);
  });

  it('accepts only the small explicit proxy hop range', () => {
    expect(getTrustedProxyHops('1')).toBe(1);
    expect(() => getTrustedProxyHops('3')).toThrow('TRUST_PROXY_HOPS');
    expect(() => getTrustedProxyHops('true')).toThrow('TRUST_PROXY_HOPS');
  });
});
