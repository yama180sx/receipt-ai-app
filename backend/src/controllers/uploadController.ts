import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';
import { getFamilyGroupId } from '../utils/context';

/**
 * [Issue #93-1 / G3] レシート画像の認証付き配信。
 * 自世帯の Receipt に紐づく imagePath のみ返す（他世帯・未登録ファイルは 404）。
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
    const receipt = await prisma.receipt.findFirst({
      where: { familyGroupId, imagePath },
      select: { id: true },
    });

    if (!receipt) {
      throw new AppError('Not Found', 404);
    }

    const fullPath = path.join(process.cwd(), imagePath);
    if (!fs.existsSync(fullPath)) {
      throw new AppError('Not Found', 404);
    }

    res.sendFile(fullPath);
  } catch (error) {
    next(error);
  }
};
