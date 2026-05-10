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
const nodeEnv = process.env.NODE_ENV || 'development';

// --- 1. 基本ミドルウェア設定 ---

/**
 * [Issue #49-5] CORS設定の堅牢化
 * 開発環境(8081)と運用環境(80)が混在するT320環境に対応。
 */
const getAllowedOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGIN || '';
  if (rawOrigins.includes(',')) {
    return rawOrigins.split(',').map(o => o.trim());
  }
  if (rawOrigins) return rawOrigins;
  
  // 本番環境でオリジン未設定の場合は警告を出し、開発時は true (全許可)
  if (nodeEnv === 'production') {
    logger.warn('[CORS] CORS_ORIGIN is not defined in production!');
    return false; // 安全のため不許可に倒す
  }
  return true;
};

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-member-id'],
  credentials: true
}));

app.use(express.json());

// 静的ファイルの提供 (マウントされた uploads ディレクトリ)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// --- 2. ルート登録 ---

// ヘルスチェック
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    env: nodeEnv,
    timestamp: new Date().toISOString() 
  });
});

// 2-1. 認証なしルート
app.use('/api/auth', authRoutes);

// 2-2. 認証・テナント必須ルート (共通ミドルウェアの一括適用)
/**
 * [Issue #69] /api 配下の全ルートを確実に保護。
 * 修正：receiptRoutes は内部で /receipts や /stats を定義しているため、
 * ベースパスを '/' にしてマウントします。
 */
const protectedApi = express.Router();
protectedApi.use(authMiddleware);
protectedApi.use(tenantMiddleware);

// パス解決の不整合を修正
protectedApi.use('/', receiptRoutes); 
protectedApi.use('/categories', categoryRoutes);
protectedApi.use('/product-master', productMasterRoutes);

app.use('/api', protectedApi);

// --- 3. エラーハンドリング ---

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
});

// Global Error Handler
app.use(errorHandler);

// --- 4. サーバー起動 ---

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on [${nodeEnv}] mode`);
  logger.info(`🔗 URL: http://${host}:${port}`);
  logger.info(`🌐 CORS: ${JSON.stringify(allowedOrigins)}`);
});