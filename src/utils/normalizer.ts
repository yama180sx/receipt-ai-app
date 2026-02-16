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
export const inferCategoryId = async (itemName: string): Promise<number | null> => {
  const categories = await prisma.category.findMany();
  
  for (const category of categories) {
    const keywords = category.keywords as string[];
    if (keywords.some(kw => itemName.includes(kw))) {
      return category.id;
    }
  }
  // マッチしない場合は「その他」のIDを探す
  const otherCategory = categories.find(c => c.name === 'その他');
  return otherCategory ? otherCategory.id : null;
};