/**
 * カテゴリーごとの「常識的な」閾値設定
 */
export const VALIDATION_THRESHOLDS: Record<string, { maxUnitPrice?: number; maxQuantity?: number; maxItemAmount?: number }> = {
  'ガソリン': {
    maxUnitPrice: 300,   // リッター300円超えは異常
    maxQuantity: 150,    // 一度の給油で150L超えはトラックでもない限り稀
  },
  '食費': {
    maxUnitPrice: 30000, // 単品3万円の食材は要確認
  },
  '日用品': {
    maxItemAmount: 50000,
  },
  // 未定義のカテゴリー用デフォルト
  'default': {
    maxItemAmount: 100000,
  }
};