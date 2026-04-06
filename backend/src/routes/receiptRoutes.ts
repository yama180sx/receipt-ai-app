import express from 'express';
import { 
  getReceipts, 
  createReceipt, 
  deleteReceipt, 
  getLatestReceipt, 
  updateItemCategory,
  getMonthlyStats,
  getJobStatus // ★ [Issue #43] 追加
} from '../controllers/receiptController';

const router = express.Router();

// --- 取得系 ---

// GET /api/receipts (全件取得)
router.get('/receipts', getReceipts);

// GET /api/receipts/latest (最新1件)
router.get('/receipts/latest', getLatestReceipt);

// GET /api/stats/monthly (月別統計)
router.get('/stats/monthly', getMonthlyStats);

// --- [Issue #43] 非同期ジョブ管理 ---

// GET /api/receipts/status/:jobId (解析ジョブの状態確認)
router.get('/receipts/status/:jobId', getJobStatus);

// --- 更新・削除・作成系 ---

// POST /api/receipts (手動登録)
router.post('/receipts', createReceipt);

// DELETE /api/receipts/:id (削除)
router.delete('/receipts/:id', deleteReceipt);

// PATCH /api/receipt-items/:id (明細カテゴリ修正)
router.patch('/receipt-items/:id', updateItemCategory);

export default router;