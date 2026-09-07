import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { AI_BUDGET_NOTIFICATION_QUEUE_NAME } from '../queues/aiBudgetNotificationQueue';
import { deliverAiBudgetNotification } from '../services/aiBudget/aiBudgetNotificationService';

export default new Worker(AI_BUDGET_NOTIFICATION_QUEUE_NAME, async (job) => deliverAiBudgetNotification(job.data.deliveryId), { connection: redisConnection, concurrency: 2 });
