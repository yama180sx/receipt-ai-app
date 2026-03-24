import { Router } from 'express';
import { getCategories, updateItemCategory, getReceipts, deleteReceipt } from '../controllers/receiptController';

const router = Router();

// GET /api/categories
router.get('/categories', getCategories);

// PATCH /api/items/:id/category  <-- App.tsxの指定と完全一致
router.patch('/items/:id/category', updateItemCategory);

// レシート一覧取得 (フィルタリング対応)
router.get('/receipts', getReceipts);

// [Issue #19] レシート削除 (物理ファイル削除フック連動)
router.delete('/receipts/:id', deleteReceipt);

export default router;