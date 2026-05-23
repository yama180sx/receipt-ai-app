import express from 'express';
import { getSettlementStatus } from '../controllers/statsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

// 共通認証・テナントミドルウェア
router.use(authMiddleware, tenantMiddleware);

// ★ Issue #78: 月間精算ステータスの取得
router.get('/settlement', getSettlementStatus);

export default router;