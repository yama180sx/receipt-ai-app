import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// --- [Issue #43] BullMQ & Redis Worker ---
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

/**
 * [Issue #49-5] CORS設定の高度化
 * 運用環境(8080)と開発環境(8081)の両方のオリジンを許可するため、
 * 環境変数をカンマ区切りでパースして配列化します。
 */
const rawOrigins = process.env.CORS_ORIGIN || '';
const allowedOrigins = rawOrigins.includes(',') 
  ? rawOrigins.split(',').map(o => o.trim())
  : rawOrigins || true; // 環境変数が空の場合は全許可(開発時フォールバック)

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-member-id'],
  credentials: true
}));

app.use(express.json());

// 静的ファイルの提供 (レシート画像等)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// --- 2. ルート登録 ---

// ヘルスチェック (NginxやDockerからの監視用)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 認証なしルート
app.use('/api/auth', authRoutes);

/**
 * 認証・テナント必須ルート
 * ミドルウェアの順序: 認証 -> テナントコンテキスト設定
 */
app.use('/api', receiptRoutes);
app.use('/api/categories', authMiddleware, tenantMiddleware, categoryRoutes);
app.use('/api/product-master', authMiddleware, tenantMiddleware, productMasterRoutes);

// --- 3. エラーハンドリング ---

// 404 Handler
app.use((req, res, next) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
});

// Global Error Handler
app.use(errorHandler);

// --- 4. サーバー起動 ---

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
  logger.info(`[CORS] Allowed Origins: ${JSON.stringify(allowedOrigins)}`);
});