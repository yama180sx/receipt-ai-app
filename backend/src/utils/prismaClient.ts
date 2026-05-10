import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import logger from './logger';
import { tenantStorage } from './context'; 

// [Issue #69] ログレベルを環境に応じて調整可能にする
const prismaLogLevels: any[] = process.env.NODE_ENV === 'production' 
  ? ['error', 'warn'] 
  : ['query', 'info', 'warn', 'error'];

// ベースとなるクライアント
const basePrisma = new PrismaClient({
  log: prismaLogLevels,
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
    // 1. 全モデル共通のマルチテナント・フィルタリング
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // 世帯ID（familyGroupId）による分離が必要なモデル定義
        const tenantModels = ['Receipt', 'ProductMaster', 'FamilyMember'];
        
        if (!tenantModels.includes(model)) {
          return query(args);
        }

        // AsyncLocalStorageから現在の世帯IDを取得
        const store = tenantStorage.getStore();
        const familyGroupId = store?.familyGroupId;

        // IDが取得できない（認証外など）場合はフィルタリングをスキップ
        if (!familyGroupId) return query(args);
        
        const anyArgs = args as any;

        // 検索・更新・削除における familyGroupId の強制注入
        const tenantOps = ['findMany', 'findFirst', 'findUnique', 'count', 'update', 'delete', 'updateMany', 'deleteMany'];
        
        if (tenantOps.includes(operation)) {
          // findUnique は複合キー設定がない場合 familyGroupId を追加すると型エラーになるため
          // 実質的に findFirst 相当の挙動として familyGroupId を条件に加える
          anyArgs.where = {
            ...anyArgs.where,
            familyGroupId: familyGroupId
          };
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

    // 2. Receiptモデル固有の物理ファイル削除フック
    receipt: {
      async delete({ args, query }) {
        // 削除前に画像パスを取得（basePrisma を使用して無限ループを防止）
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
 * @param relativePath uploads/... から始まる相対パス
 */
async function deletePhysicalFile(relativePath: string) {
  if (!relativePath) return;
  
  const fullPath = path.join(process.cwd(), relativePath);

  try {
    await fs.access(fullPath);
    await fs.unlink(fullPath);
    logger.info(`[CLEANUP] 物理ファイルを削除しました: ${fullPath}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.warn(`[CLEANUP] 削除対象が見つかりませんでした (既に削除済み): ${fullPath}`);
    } else {
      logger.error(`[CLEANUP] ファイル削除失敗: ${error.message}`);
    }
  }
}

export default prisma;