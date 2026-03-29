import express from 'express';
import { getCategories, createCategory, deleteCategory } from '../controllers/categoryController';

const router = express.Router();

router.get('/', getCategories);    // GET /api/categories
router.post('/', createCategory);   // POST /api/categories
router.delete('/:id', deleteCategory); // DELETE /api/categories/:id

export default router;