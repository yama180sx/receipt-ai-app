import { Router } from 'express';
import { getCategories, updateItemCategory, getReceipts } from '../controllers/receiptController';


const router = Router();

// GET /api/categories
router.get('/categories', getCategories);

// PATCH /api/items/:id/category  <-- App.tsxの指定と完全一致
router.patch('/items/:id/category', updateItemCategory);

// レシート一覧取得 (フィルタリング対応)
router.get('/receipts', getReceipts);

export default router;