import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { restoreTenantContextMiddleware } from './tenantMiddleware';
import { requireTenantContext } from '../utils/context';

describe('restoreTenantContextMiddleware', () => {
  it('Multer 後の非同期処理にも照合済みのテナント文脈を引き継ぐ', async () => {
    const req = {
      tenantContext: { familyGroupId: 10, memberId: 20 },
    } as Request;

    await new Promise<void>((resolve, reject) => {
      const next: NextFunction = () => {
        setImmediate(() => {
          try {
            expect(requireTenantContext()).toEqual({ familyGroupId: 10, memberId: 20 });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };

      restoreTenantContextMiddleware(req, {} as Response, next);
    });
  });

  it('照合済みテナント文脈がなければエラーへ委譲する', () => {
    const next = (error?: unknown) => {
      expect(error).toMatchObject({ statusCode: 500 });
    };

    restoreTenantContextMiddleware({} as Request, {} as Response, next);
  });
});
