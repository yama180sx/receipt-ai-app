import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/appError';
import { getFamilyGroupId } from '../utils/context';
import { canAccessReceiptImage, getImageFullPath } from '../services/imageAccessService';

/**
 * [Issue #93-1 / G3] レシート画像の認証付き配信。
 * 自世帯の Receipt、または解析ジョブ投入済み imagePath のみ返す。
 */
export const serveReceiptImage = async (
  req: Request<{ filename: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const familyGroupId = getFamilyGroupId();
    const rawFilename = req.params.filename;
    const filename = path.basename(rawFilename);

    if (!filename || filename !== rawFilename || filename.includes('..')) {
      throw new AppError('Invalid filename', 400);
    }

    const imagePath = path.join('uploads', filename).replace(/\\/g, '/');

    if (!(await canAccessReceiptImage(familyGroupId, imagePath))) {
      throw new AppError('Not Found', 404);
    }

    const fullPath = getImageFullPath(imagePath);
    if (!fs.existsSync(fullPath)) {
      throw new AppError('Not Found', 404);
    }

    res.sendFile(fullPath);
  } catch (error) {
    next(error);
  }
};
