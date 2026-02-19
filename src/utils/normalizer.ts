import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 店舗名の正規化
 */
export const normalizeStoreName = async (rawName: string): Promise<string> => {
  const stores = await prisma.store.findMany();
  
  for (const store of stores) {
    // Json型を string[] としてキャスト
    const aliases = store.aliases as string[];
    if (aliases.some(alias => rawName.includes(alias)) || rawName.includes(store.officialName)) {
      return store.officialName;
    }
  }
  return rawName;
};

/**
 * 商品名からカテゴリーIDを推論
 */
export const inferCategoryId = async (productName: string, aiCategory?: string): Promise<number> => {
  const categories = await prisma.category.findMany();

  // 1. 既存のキーワードマスタでのマッチング（最優先）
  for (const cat of categories) {
    const keywords = cat.keywords as string[];
    if (keywords.some(k => productName.includes(k))) {
      return cat.id;
    }
  }

  // 2. マスタにない場合、AIの推論結果でカテゴリー名をマッチング
  if (aiCategory) {
    const matched = categories.find(cat => 
      cat.name === aiCategory || aiCategory.includes(cat.name)
    );
    if (matched) return matched.id;
  }

  // 3. 最終手段
  const other = categories.find(c => c.name === 'その他');
  return other ? other.id : 1;
};