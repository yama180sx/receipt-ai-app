import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { isAdmin } from '../middleware/authMiddleware';
import {
  createProductClassificationReclassificationRun,
  createStandardProductClassificationRules,
  deactivateStandardProductClassificationRules,
  getStandardProductClassificationRules,
  previewStandardProductClassificationRules,
  updateStandardProductClassificationRules,
} from '../controllers/productClassificationController';
import { validate } from '../middleware/validate';
import { deactivateProductClassificationLearningDataSchema, productClassificationReclassificationSchema, standardProductClassificationRulePreviewSchema, standardProductClassificationRuleSchema } from '../schemas/receiptSchema';

const router = Router();

// ★ [Issue #73] 全ての管理者ルートを isAdmin ミドルウェアで保護する
// これにより、このルーター配下の全エンドポイントは「ログイン済 かつ role === 'ADMIN'」でないとアクセスできなくなります
router.use(isAdmin);

// --- [Issue #73] AIコスト統計管理 ---
router.get('/stats', adminController.getCostStats);

// --- [Issue #72/76] プロンプト管理 ---
router.get('/prompts', adminController.getPrompts);
router.post('/prompts', adminController.createPrompt);               // 新規作成
router.patch('/prompts/:id', adminController.updatePrompt);          // 更新
router.patch('/prompts/:id/activate', adminController.activatePrompt); // 切り替え
router.delete('/prompts/:id', adminController.deletePrompt);         // 削除

// [Issue #114-5] 既存データを書き換える操作は管理者に限定する。
router.post(
  '/product-classification/reclassification-runs',
  validate(productClassificationReclassificationSchema),
  createProductClassificationReclassificationRun
);

router.get('/product-classification/standard-rules', getStandardProductClassificationRules);
router.post('/product-classification/standard-rules/preview', validate(standardProductClassificationRulePreviewSchema), previewStandardProductClassificationRules);
router.post('/product-classification/standard-rules', validate(standardProductClassificationRuleSchema), createStandardProductClassificationRules);
router.patch('/product-classification/standard-rules/:id', validate(standardProductClassificationRuleSchema), updateStandardProductClassificationRules);
router.patch('/product-classification/standard-rules/:id/deactivate', validate(deactivateProductClassificationLearningDataSchema), deactivateStandardProductClassificationRules);

export default router;
