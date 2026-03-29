import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

/**
 * 【Issue #20 強化版】文字列の表記ゆれを徹底的に吸収する内部関数
 * 1. NFKC正規化: 全角・半角の英数、記号、カタカナの統合
 * 2. 小文字化: 大文字小文字の区別を排除
 * 3. 制御文字除去: 目に見えない不要なキャラクタを排除
 * 4. 空白整理: 前後トリムに加え、文中の連続空白（改行含む）を半角スペース1つに集約
 */
const sanitize = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .normalize("NFKC")           // 全角( )や（ ）を統一、英数字の全角半角を統一
    .toLowerCase()               // 大文字小文字の統合
    .replace(/[\u0000-\u001F\u007F]/g, "") // 制御文字の削除
    .replace(/\s+/g, ' ')        // 連続する空白や改行を半角スペース1つに
    .trim();                     // 前後の空白削除
};

/**
 * 店舗名の正規化
 * エイリアス（シノニム）マスタを利用して正式名称を返却
 */
export const normalizeStoreName = async (rawName: string): Promise<string> => {
  try {
    const stores = await prisma.store.findMany();
    const cleanRawName = sanitize(rawName);
    
    for (const store of stores) {
      const officialName = sanitize(store.officialName);
      const aliases = (store.aliases as string[] || []).map(a => sanitize(a));

      // エイリアスまたは正式名称に包含関係があるかチェック
      if (aliases.some(alias => cleanRawName.includes(alias)) || cleanRawName.includes(officialName)) {
        return store.officialName; // DBへは定義済みの正式名称を返す
      }
    }
    return rawName;
  } catch (error) {
    logger.error(`[NORMALIZE_STORE_ERROR] ${error}`);
    return rawName;
  }
};

/**
 * 商品名からカテゴリーIDを推論
 * ※ Issue #20 のマスタ優先ロジックは、この呼び出し元である 
 * persistenceService 側で行うのがアーキテクチャ的に綺麗です。
 */
export const inferCategoryId = async (productName: string, aiCategory?: string): Promise<number> => {
  try {
    const categories = await prisma.category.findMany();
    const cleanProductName = sanitize(productName);

    // 1. 既存のキーワードマスタでのマッチング（最優先）
    for (const cat of categories) {
      const keywords = (cat.keywords as string[] || []).map(k => sanitize(k));
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
    const other = categories.find(c => c.name === 'その他' || c.name === '未分類');
    return other ? other.id : (categories[0]?.id || 1);
  } catch (error) {
    logger.error(`[INFER_CATEGORY_ERROR] ${error}`);
    return 1;
  }
};

/**
 * 汎用的なテキストサニタイズ（外部利用用）
 * ProductMasterの検索キー（name_storeName）作成時などに使用
 */
export const getCleanText = (text: string | null | undefined): string => sanitize(text);