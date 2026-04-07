import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import logger from './logger';
import { tenantStorage } from './context'; 
import 'dotenv/config';

// ベースとなるクライアント（拡張前の素のクライアント）
const basePrisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * [Issue #19 & #45] 
 * 物理ファイル削除 + マルチテナント自動フィルタリング統合クライアント
 */
export const prisma = basePrisma.$extends({
  query: {
    // 1. 全モデル共通のマルチテナント・フィルタリング (Issue #45)
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // ★ 修正：familyGroupId カラムを物理的に持っているモデルのみを対象にする
        // Item, Category などの関連モデルはこのリストに含めない
        const tenantModels = ['Receipt', 'ProductMaster', 'FamilyMember'];
        
        if (!tenantModels.includes(model)) {
          return query(args);
        }

        // AsyncLocalStorageから現在の世帯IDを取得
        const store = tenantStorage.getStore();
        const familyGroupId = store?.familyGroupId;

        // IDが取得できない場合はフィルタリングをスキップ
        if (!familyGroupId) return query(args);
        
        const anyArgs = args as any;

        // 検索・更新・削除において familyGroupId を強制注入
        const tenantOps = ['findMany', 'findFirst', 'findUnique', 'count', 'update', 'delete', 'updateMany', 'deleteMany'];
        
        if (tenantOps.includes(operation)) {
          if (operation === 'findUnique') {
            // ★ 修正：findUnique は厳格なキーのみを期待するため、内部的に findFirst 相当のフィルタへ変換
            // または、スキーマで複合ユニークキーが設定されている場合はそれを使用する設計にする
            const originalWhere = { ...anyArgs.where };
            anyArgs.where = {
              ...originalWhere,
              familyGroupId: familyGroupId
            };
          } else {
            anyArgs.where = {
              ...anyArgs.where,
              familyGroupId: familyGroupId
            };
          }
        }

        // 新規作成時は所属世帯を自動セット
        if (operation === 'create' || operation === 'upsert') {
          if (anyArgs.data) {
            anyArgs.data.familyGroupId = familyGroupId;
          }
          if (anyArgs.create) {
            anyArgs.create.familyGroupId = familyGroupId;
          }
        }

        return query(anyArgs);
      },
    },

    // 2. Receiptモデル固有の物理ファイル削除フック (Issue #19)
    receipt: {
      async delete({ args, query }) {
        // 削除前に画像パスを取得（無限ループ防止のため拡張前の basePrisma を使用）
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
 * 物理ファイルの削除実行 (T320 Ubuntu環境用)
 */
async function deletePhysicalFile(relativePah: string) {
  if (!relativePah) return;
  
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

export default prisma;