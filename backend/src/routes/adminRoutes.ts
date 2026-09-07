import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { isAdmin } from '../middleware/authMiddleware';
import { requireGlobalAiBudgetManager } from '../middleware/globalAiBudgetManagerMiddleware';
import {
  createProductClassificationReclassificationRun,
  createStandardProductClassificationRules,
  deactivateStandardProductClassificationRules,
  getStandardProductClassificationRules,
  previewStandardProductClassificationRules,
  updateStandardProductClassificationRules,
} from '../controllers/productClassificationController';
import { validate } from '../middleware/validate';
import { aiBudgetTestNotificationSchema, deactivateProductClassificationLearningDataSchema, globalAiBudgetManagerSchema, globalAiBudgetReasonSchema, productClassificationReclassificationSchema, standardProductClassificationRulePreviewSchema, standardProductClassificationRuleSchema, updateGlobalAiBudgetSchema } from '../schemas/receiptSchema';

const router = Router();

// ★ [Issue #73] 全ての管理者ルートを isAdmin ミドルウェアで保護する
// これにより、このルーター配下の全エンドポイントは「ログイン済 かつ role === 'ADMIN'」でないとアクセスできなくなります
router.use(isAdmin);

// --- [Issue #73] AIコスト統計管理 ---
router.get('/stats', adminController.getCostStats);

// Issue #124: 通常の世帯ADMINではなく、TOTP有効な全体AI予算管理者だけに開放する。
router.get('/ai-budget', requireGlobalAiBudgetManager, adminController.getGlobalAiBudget);
router.put('/ai-budget', requireGlobalAiBudgetManager, validate(updateGlobalAiBudgetSchema), adminController.updateGlobalAiBudget);
router.post('/ai-budget/notifications/test', requireGlobalAiBudgetManager, validate(aiBudgetTestNotificationSchema), adminController.testGlobalAiBudgetNotification);
router.get('/ai-budget/notifications', requireGlobalAiBudgetManager, adminController.listGlobalAiBudgetNotificationDeliveries);
router.post('/ai-budget/resume', requireGlobalAiBudgetManager, validate(globalAiBudgetReasonSchema), adminController.resumeGlobalAiBudget);
router.get('/ai-budget/managers', requireGlobalAiBudgetManager, adminController.listGlobalAiBudgetManagers);
router.post('/ai-budget/managers', requireGlobalAiBudgetManager, validate(globalAiBudgetManagerSchema), adminController.addGlobalAiBudgetManager);
router.delete('/ai-budget/managers/:memberId', requireGlobalAiBudgetManager, validate(globalAiBudgetReasonSchema), adminController.removeGlobalAiBudgetManager);

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
