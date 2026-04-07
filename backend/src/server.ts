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

// --- ユーティリティ ---
import logger from './utils/logger';
import { prisma } from './utils/prismaClient'; 
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { getFamilyGroupId } from './utils/context';

// --- ルーター ---
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

// --- CORS 設定 (x-member-id ヘッダーを許可) ---
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-member-id'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- [Issue #45] 世帯分離ミドルウェアを適用 ---
// ルーティングの前に配置し、すべての API でコンテキストを有効化します
app.use(tenantMiddleware);

// --- ルート登録 ---
app.use('/api/categories', categoryRoutes);
app.use('/api/product-master', productMasterRoutes);
app.use('/api', receiptRoutes);

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * 📂 [Issue #43 & #45] レシートアップロード (Sharp + Job Queue)
 */
app.post(
  '/api/receipts/upload', 
  upload.single('image'), 
  validate(uploadReceiptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Multer の型定義波線回避
      const file = req.file as Express.Multer.File; 
      if (!file) throw new AppError('画像がアップロードされていません。', 400);

      const { memberId } = req.body;
      const parsedMemberId = parseInt(memberId, 10);
      
      // コンテキストから世帯IDを取得
      const familyGroupId = getFamilyGroupId();

      // 世帯メンバーの存在確認
      const memberExists = await prisma.familyMember.findUnique({
        where: { id: parsedMemberId }
      });

      if (!memberExists) throw new AppError('指定されたメンバーが存在しません。', 400);

      // 1. 画像加工 (T320のCPUパワーを活かしてWebP変換)
      const timestamp = Date.now();
      const baseFileName = `receipt-${timestamp}-${Math.round(Math.random() * 1e9)}`;
      const imagePath = path.join(uploadDir, `${baseFileName}.webp`);

      await sharp(file.buffer)
        .rotate() 
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }) 
        .webp({ quality: 75, effort: 6 }) 
        .toFile(imagePath);

      // 2. [Issue #45] ジョブキューに familyGroupId も渡す
      // これにより、バックグラウンドの Worker が正しい世帯に保存できます
      const job = await receiptQueue.add('analyze-receipt', {
        memberId: parsedMemberId,
        familyGroupId: familyGroupId, // ★追加
        imagePath: imagePath,
      });

      logger.info(`[Queue] 解析ジョブ登録: ID ${job.id} (世帯: ${familyGroupId})`);

      res.status(202).json({
        success: true,
        data: { jobId: job.id, status: 'queued' }
      });
      
    } catch (error) {
      next(error);
    }
  }
);

// 404 ハンドラー
app.use((req, res, next) => next(new AppError(`Not Found - ${req.originalUrl}`, 404)));

// グローバルエラーハンドラー
app.use(errorHandler);

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});