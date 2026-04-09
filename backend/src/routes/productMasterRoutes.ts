import { Router } from 'express';
import { 
  getProductMasters, 
  updateProductMaster, 
  deleteProductMaster,
  mergeStoreNames 
} from '../controllers/productMasterController';

// ★[Issue #51] server.ts で一括適用したため、ここでの個別の tenantMiddleware は削除しました

const router = Router();

// 一覧取得（クエリで品名・店舗名の検索に対応）
router.get('/', getProductMasters);

// 単一更新
router.patch('/:id', updateProductMaster);

// 削除
router.delete('/:id', deleteProductMaster);

// 店舗名の統合（エイリアス整理）
router.post('/merge-stores', mergeStoreNames);

export default router;