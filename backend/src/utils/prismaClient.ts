import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import logger from './logger';

// ベースとなるクライアント
const basePrisma = new PrismaClient();

/**
 * Issue #19: 物理ファイル削除フックを統合した共通Prismaクライアント
 */
export const prisma = basePrisma.$extends({
  query: {
    receipt: {
      // 1件削除 (delete)
      async delete({ args, query }) {
        const receipt = await basePrisma.receipt.findUnique({
          where: args.where,
          select: { imagePath: true }
        });

        const result = await query(args);

        if (receipt?.imagePath) {
          await deletePhysicalFile(receipt.imagePath);
        }
        return result;
      },
      // 一括削除 (deleteMany)
      async deleteMany({ args, query }) {
        const receipts = await basePrisma.receipt.findMany({
          where: args.where,
          select: { imagePath: true }
        });

        const result = await query(args);

        for (const rec of receipts) {
          if (rec.imagePath) {
            await deletePhysicalFile(rec.imagePath);
          }
        }
        return result;
      }
    }
  }
});

/**
 * 物理ファイルの削除実行
 */
async function deletePhysicalFile(relativePah: string) {
  if (!relativePah) return;
  
  // T320のUbuntu環境におけるフルパスを構成
  const fullPath = path.join(process.cwd(), relativePah);

  try {
    await fs.access(fullPath);
    await fs.unlink(fullPath);
    logger.info(`[CLEANUP] 物理ファイルを削除しました: ${fullPath}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.warn(`[CLEANUP] 削除対象が見つかりませんでした: ${fullPath}`);
    } else {
      logger.error(`[CLEANUP] ファイル削除失敗: ${error.message}`);
    }
  }
}