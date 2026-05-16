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
import adminRoutes from './routes/adminRoutes'; // [Issue #72] 追加

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
 */
const getAllowedOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGIN || '';
  if (rawOrigins.includes(',')) {
    return rawOrigins.split(',').map(o => o.trim());
  }
  if (rawOrigins) return rawOrigins;
  
  if (nodeEnv === 'production') {
    logger.warn('[CORS] CORS_ORIGIN is not defined in production!');
    return false;
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

// 静的ファイルの提供
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

// 2-2. 管理者向けルート [Issue #72]
/**
 * プロンプト管理等のシステム設定は、個別の世帯(Tenant)に依存しないグローバル設定のため、
 * tenantMiddleware を介さず、authMiddleware のみで保護します。
 */
app.use('/api/admin', authMiddleware, adminRoutes);

// 2-3. 認証・テナント必須ルート (業務データアクセス)
const protectedApi = express.Router();
protectedApi.use(authMiddleware);
protectedApi.use(tenantMiddleware);

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