import { VALIDATION_THRESHOLDS } from '../config/validationThresholds';

export interface ValidationResult {
  isSuspicious: boolean;
  warnings: string[];
}

export const validateReceiptItems = (items: any[]): ValidationResult => {
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const category = item.category || 'default';
    const threshold = VALIDATION_THRESHOLDS[category] || VALIDATION_THRESHOLDS['default'];

    // 1. 単価チェック
    if (threshold.maxUnitPrice && item.price > threshold.maxUnitPrice) {
      warnings.push(`明細${index + 1}: 単価(¥${item.price})が設定閾値(¥${threshold.maxUnitPrice})を超えています。`);
    }

    // 2. 数量チェック
    if (threshold.maxQuantity && item.quantity > threshold.maxQuantity) {
      warnings.push(`明細${index + 1}: 数量(${item.quantity})が異常に多い可能性があります。`);
    }

    // 3. 行合計チェック (単価 × 数量 の不整合)
    // OCRが合計金額を単価に誤認した場合、ここが火を吹く
    if (item.price && item.quantity && item.amount) {
      const calculated = item.price * item.quantity;
      if (Math.abs(calculated - item.amount) > 10) { // 10円以上の乖離
        warnings.push(`明細${index + 1}: 単価×数量(¥${calculated})と行合計(¥${item.amount})が一致しません。`);
      }
    }
  });

  return {
    isSuspicious: warnings.length > 0,
    warnings
  };
};