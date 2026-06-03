import express from 'express';
import {
  getSettlementStatus,
  addSettlementTransfer,
  deleteSettlementTransfer,
} from '../controllers/statsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

// 共通認証・テナントミドルウェア
router.use(authMiddleware, tenantMiddleware);

// 月間精算ステータスの取得
router.get('/settlement', getSettlementStatus);

// ★ [Issue #81] 送金履歴の追加
router.post('/settlement/transfers', addSettlementTransfer);
router.delete('/settlement/transfers/:id', deleteSettlementTransfer);

export default router;