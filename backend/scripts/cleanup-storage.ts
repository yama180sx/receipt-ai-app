import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import logger from '../src/utils/logger';

const prisma = new PrismaClient();
// 実行場所に関わらず uploads ディレクトリを正しく参照
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
const RETENTION_DAYS = 90;

async function cleanup() {
  logger.info('🧹 ストレージクリーンアップを開始します...');

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - RETENTION_DAYS);

  try {
    // 1. 期限切れレコードの取得
    const oldReceipts = await prisma.receipt.findMany({
      where: { date: { lt: expirationDate } },
      select: { id: true, imagePath: true }
    });

    // 2. 期限切れ物理ファイルの削除
    let deletedCount = 0;
    for (const receipt of oldReceipts) {
      if (receipt.imagePath) {
        const fullPath = path.join(UPLOAD_DIR, path.basename(receipt.imagePath));
        try {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            deletedCount++;
          }
        } catch (err) {
          logger.error(`[Cleanup Error] ファイル削除失敗: ${fullPath}`, err);
        }
      }
    }

    // 3. DBレコードの一括削除
    if (oldReceipts.length > 0) {
      const { count } = await prisma.receipt.deleteMany({
        where: { id: { in: oldReceipts.map(r => r.id) } }
      });
      logger.info(`[Cleanup] ${count} 件の古いレコードを削除しました。`);
    }

    // 4. 孤立ファイル（DBに参照がないゴミ）の掃除
    // WebP化に伴う古いJPGの取り残しなども一掃します
    const allFiles = fs.readdirSync(UPLOAD_DIR);
    const dbReceipts = await prisma.receipt.findMany({
      where: { imagePath: { not: null } },
      select: { imagePath: true }
    });
    
    const dbImageBasenames = new Set(
      dbReceipts.map(r => path.basename(r.imagePath!))
    );

    let orphanCount = 0;
    for (const file of allFiles) {
      // .gitkeep やディレクトリ自体は除外
      if (file === '.gitkeep' || fs.statSync(path.join(UPLOAD_DIR, file)).isDirectory()) {
        continue;
      }

      if (!dbImageBasenames.has(file)) {
        try {
          fs.unlinkSync(path.join(UPLOAD_DIR, file));
          orphanCount++;
        } catch (err) {
          logger.error(`[Cleanup Error] 孤立ファイル削除失敗: ${file}`, err);
        }
      }
    }

    logger.info(`[Cleanup 完了] 期限切れ削除: ${deletedCount}枚, 孤立ファイル削除: ${orphanCount}枚`);

  } catch (error) {
    logger.error('🚀 クリーンアッププロセスで致命的なエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();