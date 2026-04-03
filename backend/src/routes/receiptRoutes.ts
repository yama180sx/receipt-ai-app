import { Router } from 'express';
import { 
  getCategories, 
  updateItemCategory, 
  getReceipts, 
  deleteReceipt,
  getLatestReceipt // ← 追加
} from '../controllers/receiptController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// GET /api/categories
router.get('/categories', authMiddleware, getCategories);

// PATCH /api/items/:id/category
router.patch('/items/:id/category', authMiddleware, updateItemCategory);

// --- [Issue #35] 最新レシート取得を追加 ---
// ※ /receipts/:id 形式のルートより上に記述してください
router.get('/receipts/latest', authMiddleware, getLatestReceipt);

// レシート一覧取得 (フィルタリング対応)
router.get('/receipts', authMiddleware, getReceipts);

// [Issue #19] レシート削除
router.delete('/receipts/:id', authMiddleware, deleteReceipt);

export default router;