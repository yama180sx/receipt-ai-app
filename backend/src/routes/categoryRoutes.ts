import express from 'express';
import { 
  getCategories, 
  createCategory, 
  deleteCategory, 
  optimizeKeywords // [Issue #48] 追加
} from '../controllers/categoryController';

const router = express.Router();

// GET /api/categories (カテゴリー一覧取得)
router.get('/', getCategories);

// POST /api/categories (カテゴリー新規追加)
router.post('/', createCategory);

// DELETE /api/categories/:id (カテゴリー削除)
router.delete('/:id', deleteCategory);

/**
 * [Issue #48] カテゴリーキーワードの統計的最適化
 * POST /api/categories/optimize
 */
router.post('/optimize', optimizeKeywords);

export default router;