import { Router } from 'express';
import { 
  getProductMasters, 
  updateProductMaster, 
  deleteProductMaster,
  mergeStoreNames // 店舗名統合用
} from '../controllers/productMasterController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 全て認証必須
router.use(authMiddleware);

// 一覧取得（クエリで品名・店舗名の検索に対応させる）
router.get('/', getProductMasters);

// 単一更新
router.patch('/:id', updateProductMaster);

// 削除
router.delete('/:id', deleteProductMaster);

// 店舗名の統合（エイリアス整理）
router.post('/merge-stores', mergeStoreNames);

export default router;