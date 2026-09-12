import { describe, expect, it } from 'vitest';
import { shouldClearSessionAfterUnauthorized } from './unauthorizedResponse';

describe('shouldClearSessionAfterUnauthorized', () => {
  it('does not treat a failed public login as an expired session', () => {
    expect(shouldClearSessionAfterUnauthorized('/auth/login')).toBe(false);
    expect(shouldClearSessionAfterUnauthorized('http://localhost:3000/api/auth/login')).toBe(false);
  });

  it('clears the session for unauthorized protected API requests', () => {
    expect(shouldClearSessionAfterUnauthorized('/receipts/jobs')).toBe(true);
    expect(shouldClearSessionAfterUnauthorized(undefined)).toBe(true);
  });
});
