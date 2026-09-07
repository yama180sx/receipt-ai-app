import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const AI_BUDGET_NOTIFICATION_QUEUE_NAME = 'ai-budget-notification';
const queue = new Queue(AI_BUDGET_NOTIFICATION_QUEUE_NAME, { connection: redisConnection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: { age: 86400 }, removeOnFail: false } });
export async function enqueueAiBudgetNotification(deliveryId: number) { await queue.add('deliver', { deliveryId }, { jobId: `ai-budget-notification-${deliveryId}` }); }
