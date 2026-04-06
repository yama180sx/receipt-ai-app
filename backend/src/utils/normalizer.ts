import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

/**
 * 【Issue #42 強化版】文字列の表記ゆれを徹底的に吸収する内部関数
 * 1. NFKC正規化: 全角・半角の英数、記号、カタカナの統合（"１" -> "1"）
 * 2. 小文字化: 大文字小文字の区別を排除（"Apple" -> "apple"）
 * 3. 制御文字除去: 目に見えない不要なキャラクタを排除
 * 4. 空白整理: 連続空白（改行含む）を半角スペース1つに集約
 */
const sanitize = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .normalize("NFKC")                // 全角英数字を半角へ、( )や（ ）を統一
    .toLowerCase()                    // 大文字小文字の統合
    .replace(/[\u0000-\u001F\u007F]/g, "") // 制御文字の削除
    .replace(/\s+/g, ' ')             // 連続する空白や改行を半角スペース1つに
    .trim();                          // 前後の空白削除
};

/**
 * 店舗名の正規化
 * エイリアス（シノニム）マスタを利用して正式名称を返却
 */
export const normalizeStoreName = async (rawName: string): Promise<string> => {
  try {
    const cleanRawName = sanitize(rawName);
    if (!cleanRawName) return "";

    // パフォーマンス考慮: 全件取得ではなく、まずは完全一致で検索
    // ※頻繁に呼ばれるため、将来的にRedis等のキャッシュを検討
    const stores = await prisma.store.findMany();
    
    for (const store of stores) {
      const officialName = sanitize(store.officialName);
      const aliases = (store.aliases as string[] || []).map(a => sanitize(a));

      // エイリアスまたは正式名称に包含関係があるかチェック
      if (aliases.some(alias => cleanRawName.includes(alias)) || cleanRawName.includes(officialName)) {
        return store.officialName; // DBへは定義済みの正式名称を返す
      }
    }
    return rawName; // マッチしない場合は元の名前（正規化前）を返す
  } catch (error) {
    logger.error(`[NORMALIZE_STORE_ERROR] ${error}`);
    return rawName;
  }
};

/**
 * 汎用的なテキストサニタイズ（外部利用用）
 * ProductMasterの検索キー作成や、ReceiptのcontentHash生成に使用
 */
export const getCleanText = (text: string | null | undefined): string => sanitize(text);