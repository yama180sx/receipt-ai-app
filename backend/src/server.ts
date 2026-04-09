import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sharp from 'sharp'; 

// --- [Issue #43] BullMQ & Redis ---
import { receiptQueue } from './queues/receiptQueue';
import './workers/receiptWorker'; 

// --- ユーティリティ & ミドルウェア ---
import logger from './utils/logger';
import { prisma } from './utils/prismaClient'; 
import { authMiddleware } from './middleware/authMiddleware'; 
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { getFamilyGroupId, getMemberId } from './utils/context';

// --- ルーター ---
import authRoutes from './routes/authRoutes'; // ★追加: ログイン用
import receiptRoutes from './routes/receiptRoutes';
import productMasterRoutes from './routes/productMasterRoutes'; 
import categoryRoutes from './routes/categoryRoutes';

// --- エラーハンドリング ---
import { AppError } from './utils/appError';
import { errorHandler } from './middleware/errorHandler';
import { validate } from './middleware/validate';
import { uploadReceiptSchema } from './schemas/receiptSchema';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0'; 

// --- 1. 基本ミドルウェア設定 ---
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-member-id'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- 2. [Issue #52] ルート登録：認証の「境界線」を定義 ---

/**
 * A. 認証不要ルート (Public API)
 * ログインエンドポイントなどは、authMiddleware の前に定義します。
 */
app.use('/api/auth', authRoutes);

/**
 * B. 認証・世帯分離ミドルウェアの適用
 * これ以降に登録される /api 配下の全ルートに、一括でガードを適用します。
 */
app.use('/api', authMiddleware, tenantMiddleware);

/**
 * C. 認証済みルート (Protected API)
 * ここに登録するルートは、有効な JWT がなければ到達できません。
 */
app.use('/api/categories', categoryRoutes);
app.use('/api/product-master', productMasterRoutes);
app.use('/api', receiptRoutes);

// --- 3. ストレージ設定 ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * 📂 [Issue #43 & #45 & #51] レシートアップロード
 */
app.post(
  '/api/receipts/upload', 
  upload.single('image'), 
  validate(uploadReceiptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file as Express.Multer.File; 
      if (!file) throw new AppError('画像がアップロードされていません。', 400);

      const familyGroupId = getFamilyGroupId();
      const memberId = getMemberId(); 

      if (!memberId || !familyGroupId) {
        throw new AppError('認証コンテキストが不正です。', 401);
      }

      const timestamp = Date.now();
      const baseFileName = `receipt-${timestamp}-${Math.round(Math.random() * 1e9)}`;
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

// --- 4. エラーハンドリング ---
app.use((req, res, next) => next(new AppError(`Not Found - ${req.originalUrl}`, 404)));
app.use(errorHandler);

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});