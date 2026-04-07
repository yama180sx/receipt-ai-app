import express from 'express';
import multer from 'multer';
import { 
  getReceipts, 
  createReceipt, 
  deleteReceipt, 
  getLatestReceipt, 
  updateItemCategory,
  getMonthlyStats,
  getJobStatus,      // [Issue #43] ステータス確認
  uploadReceipt,     // [Issue #43] 非同期アップロード
  getAdvancedStats   // 高度な統計
} from '../controllers/receiptController';

const router = express.Router();

/**
 * [Issue #43] Multer設定
 * アップロードされた画像を一時的に uploads/ ディレクトリに保存します
 */
const upload = multer({ dest: 'uploads/' });

// --- [Issue #43] 非同期解析フロー ---

/**
 * POST /api/receipts/upload
 * 1. upload.single('image'): Multipartデータを解析しファイルを保存
 * 2. uploadReceipt: ジョブをキュー(BullMQ)に追加
 */
router.post('/receipts/upload', upload.single('image'), uploadReceipt);

// GET /api/receipts/status/:jobId (解析ジョブの状態確認)
router.get('/receipts/status/:jobId', getJobStatus);


// --- [Issue #45] データ取得系 (世帯分離対応済) ---

// GET /api/receipts (全件取得)
router.get('/receipts', getReceipts);

// GET /api/receipts/latest (最新1件)
router.get('/receipts/latest', getLatestReceipt);

// GET /api/stats/monthly (月別統計)
router.get('/stats/monthly', getMonthlyStats);

// GET /api/stats/advanced (トレンド分析)
router.get('/stats/advanced', getAdvancedStats);


// --- 更新・削除・手動作成系 ---

// POST /api/receipts (手動登録用)
router.post('/receipts', createReceipt);

// DELETE /api/receipts/:id (削除)
router.delete('/receipts/:id', deleteReceipt);

// PATCH /api/receipt-items/:id (明細カテゴリ修正)
router.patch('/receipt-items/:id', updateItemCategory);

export default router;