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
  commitReceipt 
} from '../controllers/receiptController';

const router = express.Router();

// Sharp処理用にメモリストレージを使用
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * レシートアップロード (非同期解析ジョブ投入)
 * ミドルウェアの順序: ファイルパース -> 認証 -> テナント設定 -> バリデーション
 */
router.post(
  '/receipts/upload',
  upload.single('image'),
  authMiddleware,
  tenantMiddleware,
  validate(uploadReceiptSchema),
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

      // WebP変換とリサイズ処理
      await sharp(file.buffer)
        .rotate()
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toFile(imagePath);

      // 解析ジョブをキューに追加 (Issue #49-8: 解析のみ実行)
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

// --- 共通認証・テナントミドルウェアを適用 ---
router.use(authMiddleware, tenantMiddleware);

router.get('/receipts', getReceipts);
router.get('/receipts/latest', getLatestReceipt);
router.get('/receipts/status/:jobId', getJobStatus);
router.get('/stats/monthly', getMonthlyStats);
router.get('/stats/advanced', getAdvancedStats);
router.post('/receipts', createReceipt);
router.delete('/receipts/:id', deleteReceipt);

/**
 * [FIX] カテゴリ更新エンドポイント
 * フロントエンドからの PATCH /api/receipts/items/:id リクエストに対応させるため
 * 旧 /receipt-items/:id から /receipts/items/:id へ変更
 */
router.patch('/receipts/items/:id', updateItemCategory);

/**
 * [Issue #49-8] 解析結果の確定保存
 * ユーザーがフロントエンドで確認・修正した内容をDBへ永続化する
 */
router.post('/receipts/commit', commitReceipt);

export default router;