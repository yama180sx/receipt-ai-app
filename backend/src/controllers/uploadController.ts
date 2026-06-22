import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { asyncHandler } from '../utils/asyncHandler';
import { resolveReceiptImagePath } from '../services/upload/receiptImageService';

/**
 * [Issue #93-1 / G3] レシート画像の認証付き配信。
 */
export const serveReceiptImage = asyncHandler(async (req, res) => {
  const fullPath = await resolveReceiptImagePath(
    requireTenantContext(),
    getRouteParam(req, 'filename')
  );
  res.sendFile(fullPath);
});
