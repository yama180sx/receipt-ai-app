import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { authMiddleware } from './middleware/authMiddleware';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import authRoutes from './routes/authRoutes';
import receiptRoutes from './routes/receiptRoutes';
import productMasterRoutes from './routes/productMasterRoutes';
import categoryRoutes from './routes/categoryRoutes';
import adminRoutes from './routes/adminRoutes';
import statsRoutes from './routes/statsRoutes';
import { AppError } from './utils/appError';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

/**
 * Express アプリ本体（Supertest / 本番起動で共有）。
 * BullMQ Worker の起動は server.ts の責務。
 */
export function createApp() {
  const app = express();
  const nodeEnv = process.env.NODE_ENV || 'development';

  const getAllowedOrigins = () => {
    const rawOrigins = process.env.CORS_ORIGIN || '';
    if (rawOrigins.includes(',')) {
      return rawOrigins.split(',').map((o) => o.trim());
    }
    if (rawOrigins) return rawOrigins;
    if (nodeEnv === 'production') {
      logger.warn('[CORS] CORS_ORIGIN is not defined in production!');
      return false;
    }
    return true;
  };

  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-member-id'],
      credentials: true,
    })
  );

  app.use(express.json());

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      env: nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  // [Issue #93-4] Admin API も tenantMiddleware で世帯スコープを強制
  app.use('/api/admin', authMiddleware, tenantMiddleware, adminRoutes);
  app.use('/api/admin', (req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Admin Route Not Found - ${req.method} ${req.originalUrl}`, 404));
  });

  const protectedApi = express.Router();
  protectedApi.use(authMiddleware);
  protectedApi.use(tenantMiddleware);
  protectedApi.use('/', receiptRoutes);
  protectedApi.use('/categories', categoryRoutes);
  protectedApi.use('/product-master', productMasterRoutes);
  protectedApi.use('/stats', statsRoutes);

  app.use('/api', protectedApi);

  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Not Found - ${req.originalUrl}`, 404));
  });

  app.use(errorHandler);

  return app;
}
