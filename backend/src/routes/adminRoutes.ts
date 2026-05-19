import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { isAdmin } from '../middleware/authMiddleware';

const router = Router();

// ★ [Issue #73] 全ての管理者ルートを isAdmin ミドルウェアで保護する
// これにより、このルーター配下の全エンドポイントは「ログイン済 かつ role === 'ADMIN'」でないとアクセスできなくなります
router.use(isAdmin);

// --- [Issue #73] AIコスト統計管理 ---
router.get('/stats', adminController.getCostStats);

// --- [Issue #72] プロンプト管理 ---
router.get('/prompts', adminController.getPrompts);

// フロントエンドの apiClient.patch('/admin/prompts', { key: ... }) と一致させるため :key なし
router.patch('/prompts', adminController.updatePrompt);

export default router;