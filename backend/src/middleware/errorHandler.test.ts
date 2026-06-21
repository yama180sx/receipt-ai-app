import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { errorHandler } from '../middleware/errorHandler';
import { DuplicateReceiptError } from '../services/receipt/receiptDuplicateError';

function createMockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  } as Response & { statusCode: number; body: unknown };
  return res;
}

const req = { method: 'POST', path: '/test', originalUrl: '/api/test' } as Request;
const next = vi.fn() as NextFunction;

describe('errorHandler', () => {
  it('formats DuplicateReceiptError per api-spec §2.3', () => {
    const res = createMockRes();
    errorHandler(new DuplicateReceiptError(42), req, res, next);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: 'DUPLICATE',
      existingId: 42,
    });
  });

  it('formats AppError with success false and message envelope', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = createMockRes();
    errorHandler(new AppError('入力内容に不備があります', 400), req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: '入力内容に不備があります',
    });

    process.env.NODE_ENV = prev;
  });
});
