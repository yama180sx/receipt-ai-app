import express from 'express';
import { getCategories } from '../controllers/categoryController';

const router = express.Router();

// GET /api/categories (カテゴリー一覧取得)
router.get('/', getCategories);

export default router;
