import { z } from 'zod';

/**
 * 1. レシート明細（Item）のバリデーション
 */
export const receiptItemSchema = z.object({
  name: z.string().min(1, "品名は必須です"),
  price: z.coerce.number(),
  quantity: z.coerce.number().default(1),
  categoryId: z.coerce.number().int().nullable().optional(),
});

/**
 * 2. 画像アップロード時専用のバリデーション (Issue #37)
 * OCR解析前なので、この時点では memberId のみが必須
 */
export const uploadReceiptSchema = z.object({
  memberId: z.coerce.number().int().positive("不正な世帯IDです"),
  // 他のフィールド（storeName等）はこの時点ではリクエストに含まれないため、
  // ここには定義しない、もしくは .optional() にします
});

/**
 * 3. 最終的な保存・更新用のバリデーション
 * DB保存時に整合性をチェックするために使用
 */
export const createReceiptSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  storeName: z.string().min(1, "店舗名は必須です"),
  date: z.coerce.date().catch(() => new Date()), 
  totalAmount: z.coerce.number().int(),
  imagePath: z.string().optional(),
  rawText: z.string().optional(),
  items: z.array(receiptItemSchema).min(1, "明細が必要です")
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;