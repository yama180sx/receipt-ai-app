import { Router } from 'express';
import * as adminController from '../controllers/adminController';

const router = Router();

// プロンプト管理
router.get('/prompts', adminController.getPrompts);
router.patch('/prompts/:key', adminController.updatePrompt);

export default router;