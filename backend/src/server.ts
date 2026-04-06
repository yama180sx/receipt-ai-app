import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sharp from 'sharp'; 

// --- [Issue #43] BullMQ & Redis インポート ---
import { receiptQueue } from './queues/receiptQueue';
import './workers/receiptWorker'; // Workerをインポートしてプロセスを起動

// --- ユーティリティ・シングルトン ---
import logger from './utils/logger';
import { prisma } from './utils/prismaClient'; // シングルトン版を使用

// --- ルーター ---
import receiptRoutes from './routes/receiptRoutes';
import productMasterRoutes from './routes/productMasterRoutes'; 
import categoryRoutes from './routes/categoryRoutes';

// --- エラーハンドリング ---
import { AppError } from './utils/appError';
import { errorHandler } from './middlewares/errorHandler';
import { validate } from './middlewares/validate';
import { uploadReceiptSchema } from './schemas/receiptSchema';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0'; 

// --- CORS 設定 ---
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS Blocked]: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
 * 📂 [Issue #43] レシートアップロード & 非同期ジョブ受付
 */
app.post(
  '/api/receipts/upload', 
  upload.single('image'), 
  validate(uploadReceiptSchema),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('画像がアップロードされていません。', 400);

      const { memberId } = req.body;
      const parsedMemberId = parseInt(memberId, 10);

      // 同期チェック: 世帯メンバーの存在確認
      const memberExists = await prisma.familyMember.findUnique({
        where: { id: parsedMemberId }
      });

      if (!memberExists) {
        throw new AppError('指定された世帯IDが存在しません。', 400);
      }

      // 1. 画像加工 (Sharp) - これは高速なので同期的に処理し、ディスクへ保存
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const baseFileName = `receipt-${timestamp}-${randomSuffix}`;
      const imagePath = path.join(uploadDir, `${baseFileName}.webp`);

      await sharp(req.file.buffer, { failOnError: false })
        .rotate() 
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }) 
        .webp({ quality: 75, effort: 6 }) 
        .toFile(imagePath);

      // 2. [Issue #43] ジョブキューに投入
      // 重いGemini解析と保存処理は Worker が T320 のバックグラウンドで行う
      const job = await receiptQueue.add('analyze-receipt', {
        memberId: parsedMemberId,
        imagePath: imagePath,
      });

      logger.info(`[Queue] ジョブを登録しました: ID ${job.id} (Member: ${parsedMemberId})`);

      // 3. 即座に応答（202 Accepted）
      res.status(202).json({
        success: true,
        message: '解析リクエストを受け付けました。バックグラウンドで処理を開始します。',
        data: {
          jobId: job.id,
          status: 'queued'
        }
      });
      
    } catch (error: any) {
      next(error);
    }
  }
);

// 404 ハンドラー
app.use((req, res, next) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
});

// グローバルエラーハンドラー
app.use(errorHandler);

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});