import dotenv from 'dotenv';
import { loadSecretFiles } from './config/secretFiles';
import { getStartupFailureCode } from './config/startupDiagnostics';

function reportStartupFailure(error: unknown): void {
  const code = getStartupFailureCode(error);
  process.stderr.write(`Fatal startup configuration error [${code}]\n`);
}

try {
  dotenv.config();
  loadSecretFiles();

  // Workerを含む実行時依存は、秘密ファイルを解決してから読み込む。
  // テストはserver.tsをimportせず、vitest.setup.tsで明示的な合成設定を渡す。
  void import('./serverRuntime.js').catch((error: unknown) => {
    reportStartupFailure(error);
    process.exitCode = 1;
  });
} catch (error: unknown) {
  reportStartupFailure(error);
  process.exitCode = 1;
}
