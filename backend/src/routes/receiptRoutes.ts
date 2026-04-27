import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import { receiptQueue } from '../queues/receiptQueue';
import logger from '../utils/logger';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { getFamilyGroupId, getMemberId } from '../utils/context';
import { validate } from '../middleware/validate';
import { uploadReceiptSchema } from '../schemas/receiptSchema';
import { AppError } from '../utils/appError';

import { 
  getReceipts, 
  createReceipt, 
  deleteReceipt, 
  getLatestReceipt, 
  updateItemCategory,
  getMonthlyStats,
  getJobStatus,
  getAdvancedStats,
  commitReceipt // [Issue #49-8] 追加
} from '../controllers/receiptController';

const router = express.Router();

// Sharpで処理するためメモリ上に保存
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB制限
});

/**
 * [Issue #46 修正] 非同期アップロード
 * コンテキスト消失を防ぐため、multerの後に auth/tenant ミドルウェアを配置します。
 */
router.post(
  '/receipts/upload',
  upload.single('image'), // 1. ファイルをパース（非同期境界）
  authMiddleware,         // 2. ユーザー認証
  tenantMiddleware,       // 3. テナントコンテキスト開始
  validate(uploadReceiptSchema), // 4. スキーマ検証
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) throw new AppError('画像がアップロードされていません。', 400);

      const familyGroupId = getFamilyGroupId();
      const memberId = getMemberId();

      if (!familyGroupId || !memberId) {
        throw new AppError('テナントコンテキストが設定されていません。', 401);
      }

      const timestamp = Date.now();
      const baseFileName = `receipt-${timestamp}-${Math.round(Math.random() * 1e9)}`;
      const uploadDir = 'uploads';
      const imagePath = path.join(uploadDir, `${baseFileName}.webp`);

      // 画像処理: WebP変換とリサイズ
      await sharp(file.buffer)
        .rotate()
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toFile(imagePath);

      // キュー登録 (Issue #49-8 により、Workerは解析のみを行う)
      const job = await receiptQueue.add('analyze-receipt', {
        memberId: memberId,
        familyGroupId: familyGroupId,
        imagePath: imagePath,
      });

      logger.info(`[Queue] 解析ジョブ登録: ID ${job.id} (世帯: ${familyGroupId}, 会員: ${memberId})`);

      res.status(202).json({
        success: true,
        data: { jobId: job.id, status: 'queued' }
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- 共通ミドルウェア適用ルート ---
router.use(authMiddleware, tenantMiddleware);

router.get('/receipts', getReceipts);
router.get('/receipts/latest', getLatestReceipt);
router.get('/receipts/status/:jobId', getJobStatus);
router.get('/stats/monthly', getMonthlyStats);
router.get('/stats/advanced', getAdvancedStats);
router.post('/receipts', createReceipt);
router.delete('/receipts/:id', deleteReceipt);
router.patch('/receipt-items/:id', updateItemCategory);

/**
 * [Issue #49-8] 解析結果の確定保存
 * AI解析後、ユーザーが確認・修正したデータをDBに永続化します。
 */
router.post('/receipts/commit', commitReceipt);

export default router;