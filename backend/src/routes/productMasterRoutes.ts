import { Router } from 'express';
import { 
  getProductMasters, 
  updateProductMaster, 
  deleteProductMaster,
  mergeStoreNames // 店舗名統合用
} from '../controllers/productMasterController';
import { tenantMiddleware } from '../middleware/tenantMiddleware'; // 世帯分離用

const router = Router();

/**
 * [Issue #45] 世帯分離コンテキストの適用
 * 開発中の JWT 期限切れ回避のため、authMiddleware は一時的に除外しています。
 */
router.use(tenantMiddleware);

// 一覧取得（クエリで品名・店舗名の検索に対応）
router.get('/', getProductMasters);

// 単一更新
router.patch('/:id', updateProductMaster);

// 削除
router.delete('/:id', deleteProductMaster);

// 店舗名の統合（エイリアス整理）
router.post('/merge-stores', mergeStoreNames);

export default router;