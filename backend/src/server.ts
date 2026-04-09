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
import { authMiddleware } from './middleware/authMiddleware'; // ★追加
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { getFamilyGroupId, getMemberId } from './utils/context';

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

// --- 1. 基本ミドルウェア設定 ---
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-member-id'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- 2. [Issue #51] 認証 & 世帯分離ミドルウェアの適用 ---
/**
 * /api 配下の全ルートに対し、以下の順序で適用します。
 * 1. authMiddleware: トークンを検証し、誰であるか(user)を特定。
 * 2. tenantMiddleware: 特定されたユーザーから世帯(tenant)を確定。
 * * ※ 今後「ログイン」や「ユーザー登録」などの認証不要ルートを作る場合は、
 * app.use('/api/auth', authRoutes) のように、このガードの前に定義します。
 */
app.use('/api', authMiddleware, tenantMiddleware);

// --- 3. ルート登録 (これ以降の /api はすべて認証済みとなる) ---
app.use('/api/categories', categoryRoutes);
app.use('/api/product-master', productMasterRoutes);
app.use('/api', receiptRoutes);

// --- 4. ストレージ設定 ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * 📂 [Issue #43 & #45 & #51] レシートアップロード
 * ミドルウェアにより既に memberId と familyGroupId は確定済みです。
 */
app.post(
  '/api/receipts/upload', 
  upload.single('image'), 
  validate(uploadReceiptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file as Express.Multer.File; 
      if (!file) throw new AppError('画像がアップロードされていません。', 400);

      // ★[Issue #51] コンテキストから安全にIDを取得
      // クライアントからの req.body.memberId よりも、認証済みのコンテキストを優先
      const familyGroupId = getFamilyGroupId();
      const memberId = getMemberId(); 

      if (!memberId || !familyGroupId) {
        throw new AppError('認証コンテキストが不正です。再度ログインしてください。', 401);
      }

      // 1. 画像加工 (T320のパワーを活かしたWebP変換)
      const timestamp = Date.now();
      const baseFileName = `receipt-${timestamp}-${Math.round(Math.random() * 1e9)}`;
      const imagePath = path.join(uploadDir, `${baseFileName}.webp`);

      await sharp(file.buffer)
        .rotate() 
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }) 
        .webp({ quality: 75, effort: 6 }) 
        .toFile(imagePath);

      // 2. ジョブキューに情報を渡す
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

// --- 5. エラーハンドリング ---
app.use((req, res, next) => next(new AppError(`Not Found - ${req.originalUrl}`, 404)));
app.use(errorHandler);

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});