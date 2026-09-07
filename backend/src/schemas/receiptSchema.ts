import { ClassificationCorrectionScope, ProductTypeStatus } from '@prisma/client';
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

export const productClassificationCorrectionSchema = z
  .object({
    productTypeId: z.coerce.number().int().positive(),
    scope: z.enum(['item_only', 'same_ocr_name']),
  })
  .transform((input) => ({
    ...input,
    scope: {
      item_only: ClassificationCorrectionScope.ITEM_ONLY,
      same_ocr_name: ClassificationCorrectionScope.SAME_OCR_NAME,
    }[input.scope],
  }));

export const deactivateProductClassificationLearningDataSchema = z.object({
  reason: z.string().trim().min(1, '無効化理由は必須です').max(500, '無効化理由は500文字以内です'),
});

const reclassificationStatusMap = {
  unclassified: ProductTypeStatus.UNCLASSIFIED,
  needs_review: ProductTypeStatus.NEEDS_REVIEW,
} as const;

export const productClassificationReclassificationSchema = z
  .object({
    statuses: z.array(z.enum(['unclassified', 'needs_review'])).min(1).max(2).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .superRefine((input, ctx) => {
    if (input.startDate && input.endDate && input.startDate >= input.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: '終了日時は開始日時より後にしてください',
      });
    }
  })
  .transform((input) => ({
    ...input,
    statuses: (input.statuses ?? ['unclassified', 'needs_review']).map(
      (status) => reclassificationStatusMap[status]
    ),
  }));

export const standardProductClassificationRuleSchema = z.object({
  keyword: z.string().trim().min(1, 'キーワードを入力してください').max(100, 'キーワードは100文字以内で入力してください'),
  productTypeId: z.coerce.number().int('商品種別を選択してください').positive('商品種別を選択してください'),
  priority: z.coerce.number().int('優先度は整数で入力してください').min(0, '優先度は0以上で入力してください').max(100000, '優先度は100000以下で入力してください'),
  reason: z.string().trim().min(1, '変更理由は必須です').max(500),
});

export const standardProductClassificationRulePreviewSchema = z.object({
  keyword: z.string().trim().min(1).max(100),
});

export const globalAiBudgetReasonSchema = z.object({ reason: z.string().trim().min(1).max(500) });
export const globalAiBudgetManagerSchema = globalAiBudgetReasonSchema.extend({ memberId: z.coerce.number().int().positive() });
export const updateGlobalAiBudgetSchema = globalAiBudgetReasonSchema.extend({
  isEnabled: z.boolean(), monthlyBudgetJpy: z.coerce.number().positive(),
  warningPercent: z.coerce.number().int().min(1).max(99).optional(),
  criticalPercent: z.coerce.number().int().min(1).max(99).optional(),
  stopPercent: z.coerce.number().int().min(1).max(100).optional(),
  notifyDiscord: z.boolean().default(true),
  notificationEmails: z.array(z.string().trim().email().max(320)).max(20).default([]),
});
export const aiBudgetTestNotificationSchema = z.object({ channels: z.array(z.enum(['DISCORD', 'EMAIL'])).min(1) });

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
