import express from 'express';
import { 
  getReceipts, 
  createReceipt, 
  deleteReceipt, 
  getLatestReceipt, 
  updateItemCategory,
  getMonthlyStats // ★ 追加
} from '../controllers/receiptController';

const router = express.Router();

// GET /api/receipts
router.get('/receipts', getReceipts);

// GET /api/receipts/latest
router.get('/receipts/latest', getLatestReceipt);

// GET /api/stats/monthly ★ これが 404 の原因でした
router.get('/stats/monthly', getMonthlyStats);

// POST /api/receipts
router.post('/receipts', createReceipt);

// DELETE /api/receipts/:id
router.delete('/receipts/:id', deleteReceipt);

// PATCH /api/receipt-items/:id
router.patch('/receipt-items/:id', updateItemCategory);

export default router;