import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors, json, metadata } = winston.format;

/**
 * 環境変数からログレベルを取得
 */
const logLevel = process.env.LOG_LEVEL || 'info';

// ログフォーマット（コンソール用：スタックトレースや詳細を表示）
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }), // エラーオブジェクトのパース
  printf(({ level, message, timestamp, stack, details }) => {
    // details（Zodのバリデーションエラー等）があれば文字列化して表示
    const detailStr = details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${detailStr}`;
  })
);

const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }), // 余分なプロパティをmetadataに集約
    json() // ファイル出力は解析しやすいJSON形式
  ),
  transports: [
    // エラーログ：DailyRotate
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // 全ログ：DailyRotate
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// コンソール出力設定
if (process.env.NODE_ENV !== 'production' || process.env.CONSOLE_LOG === 'true') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: logLevel
  }));
}

export default logger;