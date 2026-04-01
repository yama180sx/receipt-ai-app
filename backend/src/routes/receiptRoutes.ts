import { Router } from 'express';
import { 
  getCategories, 
  updateItemCategory, 
  getReceipts, 
  deleteReceipt 
} from '../controllers/receiptController';
import { authMiddleware } from '../middlewares/auth'; // 認証ミドルウェアをインポート

const router = Router();

/**
 * 全てのエンドポイントに authMiddleware を適用し、
 * 有効なJWTトークンがないリクエストを遮断します。
 */

// GET /api/categories
router.get('/categories', authMiddleware, getCategories);

// PATCH /api/items/:id/category
router.patch('/items/:id/category', authMiddleware, updateItemCategory);

// レシート一覧取得 (フィルタリング対応)
router.get('/receipts', authMiddleware, getReceipts);

// [Issue #19] レシート削除 (物理ファイル削除フック連動)
router.delete('/receipts/:id', authMiddleware, deleteReceipt);

export default router;