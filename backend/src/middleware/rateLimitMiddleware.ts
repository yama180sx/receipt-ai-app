import type { NextFunction, Request, Response } from 'express';

type RateLimitOptions = {
  name: string;
  windowMs: number;
  max: number;
  key: (req: Request) => string;
};

type RateLimitEntry = { count: number; resetAt: number };

/**
 * 単一プロセス用の固定ウィンドウ制限。
 * 公開初期の単一VMで認証・アップロード入口を保護する。複数process化時は共有ストアへ置換する。
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.name}:${options.key(req)}`;
    const existing = entries.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : existing;

    entry.count += 1;
    entries.set(key, entry);

    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    const remaining = Math.max(0, options.max - entry.count);
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: '短時間に操作が集中しています。しばらくしてから再試行してください。',
      });
      return;
    }

    if (entries.size > 10_000) {
      for (const [entryKey, value] of entries) {
        if (value.resetAt <= now) entries.delete(entryKey);
      }
    }
    next();
  };
}

/** Expressのtrust proxy設定に従う。未設定時はsocketの接続元だけを使う。 */
export function getRateLimitClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export const authResolveRateLimit = createRateLimitMiddleware({
  name: 'auth-resolve', windowMs: 15 * 60 * 1000, max: 30, key: getRateLimitClientIp,
});
export const authMembersRateLimit = createRateLimitMiddleware({
  name: 'auth-members', windowMs: 15 * 60 * 1000, max: 20, key: getRateLimitClientIp,
});
export const authLoginRateLimit = createRateLimitMiddleware({
  name: 'auth-login', windowMs: 15 * 60 * 1000, max: 10, key: getRateLimitClientIp,
});
export const authTotpRateLimit = createRateLimitMiddleware({
  name: 'auth-totp', windowMs: 15 * 60 * 1000, max: 10,
  key: (req) => `${req.user?.id ?? 'unknown'}:${getRateLimitClientIp(req)}`,
});
export const receiptUploadRateLimit = createRateLimitMiddleware({
  name: 'receipt-upload', windowMs: 15 * 60 * 1000, max: 20,
  key: (req) => `${req.user?.id ?? 'unknown'}:${getRateLimitClientIp(req)}`,
});
