import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * [Issue #25] 環境変数からログレベルを取得
 * デフォルトは 'info'。開発時は .env で 'debug' に設定可能。
 */
const logLevel = process.env.LOG_LEVEL || 'info';

// ログフォーマット（コンソール用：人間が読みやすい形式）
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const logger = winston.createLogger({
  level: logLevel, // ★ ここを環境変数に連動
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // エラーログ（常に error レベルのみ）
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // 全ログ（指定した logLevel に基づく）
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// コンソール出力の判定
// Docker環境や開発環境では標準出力(stdout)が重要なため、productionでも出力するように調整
if (process.env.NODE_ENV !== 'production' || process.env.CONSOLE_LOG === 'true') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: logLevel // コンソールも指定レベルに合わせる
  }));
}

export default logger;