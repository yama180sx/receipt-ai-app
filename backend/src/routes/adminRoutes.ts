import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { isAdmin } from '../middleware/authMiddleware';
import { createProductClassificationReclassificationRun } from '../controllers/productClassificationController';
import { validate } from '../middleware/validate';
import { productClassificationReclassificationSchema } from '../schemas/receiptSchema';

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

export default router;
