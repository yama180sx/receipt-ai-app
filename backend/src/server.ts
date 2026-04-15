import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// --- [Issue #43] BullMQ & Redis ---
import './workers/receiptWorker'; 

// --- ユーティリティ & ミドルウェア ---
import logger from './utils/logger';
import { authMiddleware } from './middleware/authMiddleware'; 
import { tenantMiddleware } from './middleware/tenantMiddleware';

// --- ルーター ---
import authRoutes from './routes/authRoutes'; 
import receiptRoutes from './routes/receiptRoutes';
import productMasterRoutes from './routes/productMasterRoutes'; 
import categoryRoutes from './routes/categoryRoutes';

// --- エラーハンドリング ---
import { AppError } from './utils/appError';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0'; 

// --- 1. 基本ミドルウェア設定 ---
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-member-id'],
  credentials: true
}));

app.use(express.json());

// 静的ファイルの提供
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// --- 2. ルート登録 ---

// 認証なしルート
app.use('/api/auth', authRoutes);

/**
 * [重要] 認証・テナント必須ルート
 * ここで一括適用せず、各ルーターに任せるか、あるいはパスを指定して適用します。
 * 今回はコンテキスト消失を防ぐため、receiptRoutes側で個別に制御できるようにします。
 */
app.use('/api', receiptRoutes);
app.use('/api/categories', authMiddleware, tenantMiddleware, categoryRoutes);
app.use('/api/product-master', authMiddleware, tenantMiddleware, productMasterRoutes);

// 404 & Error Handler
app.use((req, res, next) => next(new AppError(`Not Found - ${req.originalUrl}`, 404)));
app.use(errorHandler);

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});