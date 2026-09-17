import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createRateLimitMiddleware, getRateLimitClientIp, resetRateLimiters } from './rateLimitMiddleware';

function invoke(middleware: ReturnType<typeof createRateLimitMiddleware>, ip = '198.51.100.10') {
  const headers = new Map<string, string>();
  const res = {
    setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
    status: vi.fn(), json: vi.fn(),
  } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  const next = vi.fn();
  const req = { ip, socket: { remoteAddress: '192.0.2.8' } } as unknown as Request;
  middleware(req, res, next);
  return { headers, res, next };
}

describe('createRateLimitMiddleware', () => {
  it('permits requests within the window and returns rate limit headers', () => {
    const limiter = createRateLimitMiddleware({ name: 'test', windowMs: 60_000, max: 2, key: getRateLimitClientIp });
    expect(invoke(limiter).next).toHaveBeenCalledOnce();
    const second = invoke(limiter);
    expect(second.next).toHaveBeenCalledOnce();
    expect(second.headers.get('RateLimit-Remaining')).toBe('0');
  });

  it('returns a safe 429 and Retry-After without leaking the key', () => {
    const limiter = createRateLimitMiddleware({ name: 'test', windowMs: 60_000, max: 1, key: getRateLimitClientIp });
    invoke(limiter, '198.51.100.99');
    const blocked = invoke(limiter, '198.51.100.99');
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.status).toHaveBeenCalledWith(429);
    expect(blocked.res.json).toHaveBeenCalledWith({
      success: false,
      code: 'RATE_LIMITED',
      message: '短時間に操作が集中しています。しばらくしてから再試行してください。',
    });
    expect(blocked.headers.get('Retry-After')).toBeDefined();
  });

  it('keeps different client IPs in independent buckets', () => {
    const limiter = createRateLimitMiddleware({ name: 'test', windowMs: 60_000, max: 1, key: getRateLimitClientIp });
    invoke(limiter, '198.51.100.1');
    expect(invoke(limiter, '198.51.100.2').next).toHaveBeenCalledOnce();
  });

  it('can reset state between isolated test cases', () => {
    const limiter = createRateLimitMiddleware({ name: 'test', windowMs: 60_000, max: 1, key: getRateLimitClientIp });
    invoke(limiter);
    resetRateLimiters();
    expect(invoke(limiter).next).toHaveBeenCalledOnce();
  });
});
