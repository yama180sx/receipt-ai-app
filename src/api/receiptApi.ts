// T320のIPアドレスを動的に取得するか、固定で設定します
// ※ localhostではなく、必ずサーバーのIP（例: 192.168.1.10）を指定してください
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Category {
  id: number;
  name: string;
}

export interface ReceiptItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  categoryId: number | null;
  category?: Category;
}

/**
 * カテゴリー一覧を取得
 */
export const getCategories = async (): Promise<Category[]> => {
  const response = await fetch(`${BASE_URL}/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
};

/**
 * 特定のアイテムのカテゴリーを更新
 */
export const updateItemCategory = async (itemId: number, categoryId: number): Promise<ReceiptItem> => {
  const response = await fetch(`${BASE_URL}/items/${itemId}/category`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ categoryId }),
  });
  if (!response.ok) throw new Error('Failed to update category');
  return response.json();
};

/**
 * レシート一覧を取得
 * @param params { memberId?: number, month?: string }
 */
export const fetchReceipts = async (params: { memberId?: number, month?: string } = {}) => {
  const query = new URLSearchParams(params as any).toString();
  const response = await fetch(`${BASE_URL}/receipts?${query}`);
  if (!response.ok) throw new Error('Failed to fetch receipts');
  return response.json();
};