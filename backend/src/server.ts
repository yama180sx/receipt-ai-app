import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sharp from 'sharp'; 

import { processAndSaveReceipt } from './services/receiptService';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';

// --- ルーターのインポート ---
import receiptRoutes from './routes/receiptRoutes';
import productMasterRoutes from './routes/productMasterRoutes'; 
import categoryRoutes from './routes/categoryRoutes'; // ★ 追加

// --- Issue #40: エラーハンドリング・標準化 ---
import { AppError } from './utils/appError';
import { errorHandler } from './middlewares/errorHandler';
import { validate } from './middlewares/validate';
import { uploadReceiptSchema } from './schemas/receiptSchema';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0'; 
const prisma = new PrismaClient();

// --- CORS 制限 ---
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

// --- ルート登録の整理 ---
// インラインで書いていたハンドラーを各ルーターへ委譲します
app.use('/api/categories', categoryRoutes);      // /api/categories/*
app.use('/api/product-master', productMasterRoutes); // /api/product-master/*
app.use('/api', receiptRoutes);                  // /api/receipts/*, /api/receipt-items/*

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * 📂 レシートアップロード & 解析 (この特殊な処理のみ server.ts に残すか、receiptRoutes に移動)
 */
app.post(
  '/api/receipts/upload', 
  upload.single('image'), 
  validate(uploadReceiptSchema),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('画像がアップロードされていません。', 400);

      const { memberId } = req.body;

      const memberExists = await prisma.familyMember.findUnique({
        where: { id: memberId }
      });

      if (!memberExists) {
        throw new AppError('指定された世帯IDが存在しません。', 400);
      }

      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const baseFileName = `receipt-${timestamp}-${randomSuffix}`;
      const imagePath = path.join(uploadDir, `${baseFileName}.webp`);

      await sharp(req.file.buffer, { failOnError: false })
        .rotate() 
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }) 
        .webp({ quality: 75, effort: 6 }) 
        .toFile(imagePath);

      const result = await processAndSaveReceipt(memberId, imagePath);

      // Issue #40 形式でレスポンス
      res.status(200).json({
        success: true,
        message: '解析および保存が完了しました。',
        data: result
      });
      
    } catch (error: any) {
      if (error.message === 'DUPLICATE_RECEIPT_DETECTED') {
        return next(new AppError('このレシートは既に登録されています。', 409, { code: 'DUPLICATE_RECEIPT' }));
      }
      next(error);
    }
  }
);

/**
 * 404 ハンドラー
 */
app.use((req, res, next) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
});

/**
 * 📂 グローバルエラーハンドラー (必ず最後に配置)
 */
app.use(errorHandler);

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});