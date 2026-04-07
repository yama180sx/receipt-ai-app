import { ConnectionOptions } from 'bullmq';

/**
 * BullMQ / Redis 接続設定
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // T320環境のDocker内通信のためパスワードは一旦不要ですが、必要に応じて追加
};