import fs from 'fs';
import path from 'path';
import { AppError } from '../../utils/appError';
import type { TenantContext } from '../../utils/context';
import { canAccessReceiptImage, getImageFullPath } from '../imageAccessService';

export async function resolveReceiptImagePath(
  ctx: TenantContext,
  rawFilename: string
): Promise<string> {
  const filename = path.basename(rawFilename);

  if (!filename || filename !== rawFilename || filename.includes('..')) {
    throw new AppError('Invalid filename', 400);
  }

  const imagePath = path.join('uploads', filename).replace(/\\/g, '/');

  if (!(await canAccessReceiptImage(ctx.familyGroupId, imagePath))) {
    throw new AppError('Not Found', 404);
  }

  const fullPath = getImageFullPath(imagePath);
  if (!fs.existsSync(fullPath)) {
    throw new AppError('Not Found', 404);
  }

  return fullPath;
}
