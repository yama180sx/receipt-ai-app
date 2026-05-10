import { ConnectionOptions } from 'bullmq';

/**
 * [Issue #69] BullMQ / Redis 接続設定の堅牢化
 * T320環境のDocker内通信(service name: redis)を基本としつつ、
 * 環境変数による柔軟な上書きをサポートします。
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'redis',
  // コンテナ内部のポート(6379)をデフォルトに設定
  port: parseInt(process.env.REDIS_PORT_INTERNAL || '6379', 10), 
  
  // セキュリティ強化用のパスワード対応
  password: process.env.REDIS_PASSWORD || undefined,

  /**
   * BullMQ 特有の重要設定:
   * 接続が切れた際にワーカーがエラーで落ちるのを防ぎ、
   * 再接続を無制限にリトライするように設定します。
   */
  maxRetriesPerRequest: null,
  
  // 接続タイムアウト (30秒)
  connectTimeout: 30000,
};