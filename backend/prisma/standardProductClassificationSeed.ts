export type StandardCategorySeed = {
  code: string;
  name: string;
  parentCode?: string;
  displayOrder: number;
};

export type ProductTypeSeed = {
  code: string;
  name: string;
  standardCategoryCode: string;
  displayOrder: number;
};

export type StandardProductDictionarySeed = {
  normalizedName: string;
  standardCategoryCode: string;
  productTypeCode: string;
};

export const STANDARD_CATEGORIES: StandardCategorySeed[] = [
  { code: 'food', name: '食費', displayOrder: 10 },
  { code: 'food-snacks', name: 'お菓子', parentCode: 'food', displayOrder: 11 },
  { code: 'food-instant', name: 'インスタント食品', parentCode: 'food', displayOrder: 12 },
  { code: 'food-dairy', name: '乳製品', parentCode: 'food', displayOrder: 13 },
  { code: 'daily-goods', name: '日用品', displayOrder: 20 },
  { code: 'daily-laundry', name: '洗濯用品', parentCode: 'daily-goods', displayOrder: 21 },
  { code: 'daily-paper', name: '紙製品', parentCode: 'daily-goods', displayOrder: 22 },
  { code: 'housing', name: '住居', displayOrder: 30 },
  { code: 'utilities', name: '水道光熱費', displayOrder: 40 },
  { code: 'transport-communication', name: '交通・通信', displayOrder: 50 },
  { code: 'medical-health', name: '医療・健康', displayOrder: 60 },
  { code: 'education-culture', name: '教育・教養', displayOrder: 70 },
  { code: 'entertainment', name: '娯楽', displayOrder: 80 },
  { code: 'clothing-beauty', name: '衣服・美容', displayOrder: 90 },
  { code: 'social', name: '交際費', displayOrder: 100 },
  { code: 'special', name: '特別支出', displayOrder: 110 },
  { code: 'other', name: 'その他', displayOrder: 120 },
];

export const INITIAL_PRODUCT_TYPES: ProductTypeSeed[] = [
  { code: 'potato-chips', name: 'ポテトチップス', standardCategoryCode: 'food-snacks', displayOrder: 1 },
  { code: 'other-snacks', name: 'その他スナック菓子', standardCategoryCode: 'food-snacks', displayOrder: 2 },
  { code: 'chocolate', name: 'チョコレート', standardCategoryCode: 'food-snacks', displayOrder: 3 },
  { code: 'cookies-biscuits', name: 'クッキー・ビスケット', standardCategoryCode: 'food-snacks', displayOrder: 4 },
  { code: 'rice-crackers', name: 'せんべい・米菓', standardCategoryCode: 'food-snacks', displayOrder: 5 },
  { code: 'ice-cream', name: 'アイス', standardCategoryCode: 'food-snacks', displayOrder: 6 },
  { code: 'cup-noodles', name: 'カップ麺', standardCategoryCode: 'food-instant', displayOrder: 1 },
  { code: 'bag-noodles', name: '袋麺', standardCategoryCode: 'food-instant', displayOrder: 2 },
  { code: 'retort-food', name: 'レトルト食品', standardCategoryCode: 'food-instant', displayOrder: 3 },
  { code: 'frozen-food', name: '冷凍食品', standardCategoryCode: 'food-instant', displayOrder: 4 },
  { code: 'milk', name: '牛乳', standardCategoryCode: 'food-dairy', displayOrder: 1 },
  { code: 'laundry-detergent', name: '洗濯洗剤', standardCategoryCode: 'daily-laundry', displayOrder: 1 },
  { code: 'fabric-softener', name: '柔軟剤', standardCategoryCode: 'daily-laundry', displayOrder: 2 },
  { code: 'bleach', name: '漂白剤', standardCategoryCode: 'daily-laundry', displayOrder: 3 },
  { code: 'tissues', name: 'ティッシュ', standardCategoryCode: 'daily-paper', displayOrder: 1 },
  { code: 'toilet-paper', name: 'トイレットペーパー', standardCategoryCode: 'daily-paper', displayOrder: 2 },
  { code: 'kitchen-paper', name: 'キッチンペーパー', standardCategoryCode: 'daily-paper', displayOrder: 3 },
];

// Phase 1では各ProductTypeの標準名称を完全一致辞書として登録する。
export const INITIAL_STANDARD_PRODUCT_DICTIONARY: StandardProductDictionarySeed[] =
  INITIAL_PRODUCT_TYPES.map((productType) => ({
    normalizedName: productType.name,
    standardCategoryCode: productType.standardCategoryCode,
    productTypeCode: productType.code,
  }));
