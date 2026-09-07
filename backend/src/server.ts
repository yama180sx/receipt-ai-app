import dotenv from 'dotenv';

dotenv.config();

// Worker は本番・開発サーバー起動時のみ（テストでは import しない）
import './workers/receiptWorker';
import './workers/aiBudgetNotificationWorker';
import { recoverReceiptAnalysisJobs } from './services/receiptJobService';
import { receiptQueue } from './queues/receiptQueue';
import { expireBudgetReservations } from './repositories/globalAiBudgetRepository';
import { enqueuePendingAiBudgetNotifications } from './services/aiBudget/aiBudgetNotificationService';

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

const recoverQueuedJobs = (force = false) => recoverReceiptAnalysisJobs(force).catch((error) => {
  logger.error(`キュー台帳の復旧確認に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
});

// 起動時・接続復帰時に全件照合し、定期照合は取り逃し対策として上限付きで行う。
recoverQueuedJobs(true);
void receiptQueue.client.then((connection) => connection.on('ready', () => recoverQueuedJobs(true)));
setInterval(recoverQueuedJobs, 10 * 60_000).unref();

const recoverExpiredAiBudgetReservations = () => expireBudgetReservations().catch((error) => {
  logger.error(`AI予算予約の期限切れ回収に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
});
recoverExpiredAiBudgetReservations();
setInterval(recoverExpiredAiBudgetReservations, 60_000).unref();

const recoverPendingAiBudgetNotifications = () => enqueuePendingAiBudgetNotifications().catch((error) => {
  logger.error(`AI予算通知の回復に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
});
recoverPendingAiBudgetNotifications();
setInterval(recoverPendingAiBudgetNotifications, 60_000).unref();
