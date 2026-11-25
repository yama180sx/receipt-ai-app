import type { ParsedReceipt } from '../../types/receipt';

export type ExpectedReceipt = {
  storeName?: string | null;
  purchaseDate?: string | null;
  totalAmount?: number | null;
  taxAmount?: number | null;
  items?: Array<{ name: string; price: number; quantity: number }>;
};

/** 期待値を読めない場合もファイルの内容やパスはエラーへ含めない。 */
export function parseExpectedReceipt(value: unknown): ExpectedReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected receipt format is invalid.');
  const input = value as Record<string, unknown>;
  const allowed = ['storeName', 'purchaseDate', 'totalAmount', 'taxAmount', 'items'];
  if (Object.keys(input).some((key) => !allowed.includes(key)) || Object.keys(input).length === 0) throw new Error('Expected receipt format is invalid.');
  for (const key of ['storeName', 'purchaseDate']) {
    if (input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') throw new Error('Expected receipt format is invalid.');
  }
  for (const key of ['totalAmount', 'taxAmount']) {
    if (input[key] !== undefined && input[key] !== null && (typeof input[key] !== 'number' || !Number.isFinite(input[key]))) throw new Error('Expected receipt format is invalid.');
  }
  if (input.items !== undefined && (!Array.isArray(input.items) || input.items.some((item: unknown) => {
    if (!item || typeof item !== 'object') return true;
    const row = item as Record<string, unknown>;
    return typeof row.name !== 'string' || typeof row.price !== 'number' || !Number.isFinite(row.price) || typeof row.quantity !== 'number' || !Number.isFinite(row.quantity);
  }))) throw new Error('Expected receipt format is invalid.');
  return input as ExpectedReceipt;
}

function itemKey(item: { name: string; price: number; quantity: number }): string {
  return JSON.stringify([item.name.trim().normalize('NFKC'), item.price, item.quantity]);
}

/** 結果には一致・不一致と行数のみを含め、期待値や解析値は含めない。 */
export function compareReceiptToExpected(actual: ParsedReceipt, expected: ExpectedReceipt): Record<string, boolean | number | unknown[]> {
  const result: Record<string, boolean | number | unknown[]> = {};
  for (const key of ['storeName', 'purchaseDate', 'totalAmount', 'taxAmount'] as const) {
    if (key in expected) result[`${key}Matches`] = (actual[key] ?? null) === expected[key];
  }
  if (expected.items) {
    const actualItems = Array.isArray(actual.items) ? actual.items : [];
    const safe = actualItems.every((item) => typeof item.name === 'string' && typeof item.price === 'number' && Number.isFinite(item.price) && typeof item.quantity === 'number' && Number.isFinite(item.quantity));
    const left = safe ? actualItems.map(itemKey).sort() : [];
    const right = expected.items.map(itemKey).sort();
    result.itemCountMatches = actualItems.length === expected.items.length;
    result.itemsMatch = safe && JSON.stringify(left) === JSON.stringify(right);
    result.itemPositions = expected.items.map((expectedItem, index) => {
      const item = actualItems[index];
      return {
        index: index + 1,
        present: Boolean(item),
        nameMatches: typeof item?.name === 'string' && item.name.trim().normalize('NFKC') === expectedItem.name.trim().normalize('NFKC'),
        priceMatches: item?.price === expectedItem.price,
        quantityMatches: item?.quantity === expectedItem.quantity,
      };
    });
  }
  return result;
}
