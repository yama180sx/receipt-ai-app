import { Router } from 'express';
import * as adminController from '../controllers/adminController';

const router = Router();

// プロンプト管理
router.get('/prompts', adminController.getPrompts);

// ★修正: フロントエンドの apiClient.patch('/admin/prompts', { key: ... }) と一致させるため :key を削除
router.patch('/prompts', adminController.updatePrompt);

export default router;