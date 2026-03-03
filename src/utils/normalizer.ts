import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 文字列の表記ゆれを吸収する内部関数
 * 1. NFKC正規化（全角英数を半角、半角カナを全角に統一）
 * 2. 大文字を小文字に統一
 * 3. 前後の空白削除
 */
const sanitize = (text: string): string => {
  if (!text) return "";
  return text
    .normalize("NFKC") // ( ) や （ ） を統一、英数字の全角半角を統一
    .toLowerCase()
    .trim();
};

/**
 * 店舗名の正規化
 * エイリアス（シノニム）マスタを利用して正式名称を返却
 */
export const normalizeStoreName = async (rawName: string): Promise<string> => {
  const stores = await prisma.store.findMany();
  const cleanRawName = sanitize(rawName);
  
  for (const store of stores) {
    const officialName = sanitize(store.officialName);
    const aliases = (store.aliases as string[]).map(a => sanitize(a));

    // エイリアスまたは正式名称に部分一致するかチェック
    if (aliases.some(alias => cleanRawName.includes(alias)) || cleanRawName.includes(officialName)) {
      return store.officialName; // DBへは定義済みの正式名称を返す
    }
  }
  return rawName;
};

/**
 * 商品名からカテゴリーIDを推論
 */
export const inferCategoryId = async (productName: string, aiCategory?: string): Promise<number> => {
  const categories = await prisma.category.findMany();
  const cleanProductName = sanitize(productName);

  // 1. 既存のキーワードマスタでのマッチング（最優先）
  for (const cat of categories) {
    const keywords = (cat.keywords as string[]).map(k => sanitize(k));
    if (keywords.some(k => cleanProductName.includes(k))) {
      return cat.id;
    }
  }

  // 2. マスタにない場合、AIの推論結果でカテゴリー名をマッチング
  if (aiCategory) {
    const cleanAiCategory = sanitize(aiCategory);
    const matched = categories.find(cat => {
      const cleanCatName = sanitize(cat.name);
      return cleanCatName === cleanAiCategory || cleanAiCategory.includes(cleanCatName);
    });
    if (matched) return matched.id;
  }

  // 3. 最終手段（「その他」を探す）
  const other = categories.find(c => sanitize(c.name || "") === 'その他');
  return other ? other.id : 1;
};

/**
 * 【新規提供】汎用的なテキストサニタイズ（外部利用用）
 * ProductMasterの検索キー作成時などに使用
 */
export const getCleanText = (text: string): string => sanitize(text);