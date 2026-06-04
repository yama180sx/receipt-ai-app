import dotenv from 'dotenv';

dotenv.config();

// Worker は本番・開発サーバー起動時のみ（テストでは import しない）
import './workers/receiptWorker';

import { createApp } from './app';
import logger from './utils/logger';

const app = createApp();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const nodeEnv = process.env.NODE_ENV || 'development';

const rawOrigins = process.env.CORS_ORIGIN || '';
const allowedOrigins = rawOrigins.includes(',')
  ? rawOrigins.split(',').map((o) => o.trim())
  : rawOrigins || (nodeEnv === 'production' ? false : true);

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on [${nodeEnv}] mode`);
  logger.info(`🔗 URL: http://${host}:${port}`);
  logger.info(`🌐 CORS: ${JSON.stringify(allowedOrigins)}`);
});
