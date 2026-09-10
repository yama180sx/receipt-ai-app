import dotenv from 'dotenv';
import { loadSecretFiles } from './config/secretFiles';

try {
  dotenv.config();
  loadSecretFiles();

  // Workerを含む実行時依存は、秘密ファイルを解決してから読み込む。
  // テストはserver.tsをimportせず、vitest.setup.tsで明示的な合成設定を渡す。
  void import('./serverRuntime.js').catch(() => {
    process.stderr.write('Fatal startup configuration error\n');
    process.exitCode = 1;
  });
} catch {
  process.stderr.write('Fatal startup configuration error\n');
  process.exitCode = 1;
}
