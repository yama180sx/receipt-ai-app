import { Request, Response, NextFunction } from 'express';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { resolveReceiptImagePath } from '../services/upload/receiptImageService';

/**
 * [Issue #93-1 / G3] レシート画像の認証付き配信。
 */
export const serveReceiptImage = async (
  req: Request<{ filename: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const fullPath = await resolveReceiptImagePath(
      requireTenantContext(),
      getRouteParam(req, 'filename')
    );
    res.sendFile(fullPath);
  } catch (error) {
    next(error);
  }
};
