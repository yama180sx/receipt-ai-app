import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './appError';
import { asyncHandler } from './asyncHandler';

describe('asyncHandler', () => {
  it('forwards rejected promises to next', async () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;
    const error = new AppError('test', 400);

    const handler = asyncHandler(async () => {
      throw error;
    });

    handler(req, res, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });
});
