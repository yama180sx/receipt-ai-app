import type { ReceiptItemDetail } from '../../../types/receipt';

type ClassificationDisplay = {
  label: string;
  detail?: string;
};

export function getProductClassificationDisplay(
  item: Pick<
    ReceiptItemDetail,
    'productType' | 'productTypeStatus' | 'classificationSource' | 'classificationConfidence'
  >
): ClassificationDisplay {
  if (item.productTypeStatus === 'classified' && item.productType) {
    const source =
      item.classificationSource === 'history'
        ? '確定履歴'
        : item.classificationSource === 'household_dictionary'
          ? '世帯辞書'
          : item.classificationSource === 'standard_dictionary'
            ? '標準辞書'
            : item.classificationSource === 'ai'
              ? 'AI候補'
              : undefined;
    return { label: item.productType.name, detail: source };
  }

  switch (item.productTypeStatus) {
    case 'needs_review':
      return { label: '商品種別を要確認' };
    case 'outside_initial_scope':
      return { label: '初期分類の対象外' };
    case 'not_applicable':
      return { label: '商品種別の対象外' };
    default:
      return { label: '商品種別は未分類' };
  }
}
