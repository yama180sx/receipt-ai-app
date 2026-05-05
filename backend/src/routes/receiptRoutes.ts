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
  updateReceipt, 
  deleteReceipt, 
  getLatestReceipt, 
  updateItemCategory,
  getMonthlyStats,
  getJobStatus,
  getAdvancedStats,
  commitReceipt 
} from '../controllers/receiptController';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

/**
 * レシートアップロード (非同期解析ジョブ投入)
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

      await sharp(file.buffer)
        .rotate()
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toFile(imagePath);

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

// --- 共通認証・テナントミドルウェア ---
router.use(authMiddleware, tenantMiddleware);

router.get('/receipts', getReceipts);
router.get('/receipts/latest', getLatestReceipt);
router.get('/receipts/status/:jobId', getJobStatus);
router.get('/stats/monthly', getMonthlyStats);
router.get('/stats/advanced', getAdvancedStats);
router.post('/receipts', createReceipt);
router.delete('/receipts/:id', deleteReceipt);

// Issue #67: 単価・数量（小数対応）を含むレシート全体の更新
router.patch('/receipts/:id', updateReceipt);

router.patch('/receipts/items/:id', updateItemCategory);
router.post('/receipts/commit', commitReceipt);

export default router;