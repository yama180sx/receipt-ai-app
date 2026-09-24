import dotenv from 'dotenv';
import { loadSecretFiles } from './config/secretFiles';
import { getStartupFailureCode } from './config/startupDiagnostics';

function reportStartupFailure(error: unknown): void {
  process.stderr.write(`Fatal isolated restore startup configuration error [${getStartupFailureCode(error)}]\n`);
}

try {
  dotenv.config();
  loadSecretFiles();

  // 隔離復旧ではworkerを一切importしない。これにより復元済み台帳の再投入、
  // Gemini呼出し、AI予算通知の配送を発生させず、health/auth APIだけを提供する。
  void import('./isolatedRestoreServerRuntime.js').catch((error: unknown) => {
    reportStartupFailure(error);
    process.exitCode = 1;
  });
} catch (error: unknown) {
  reportStartupFailure(error);
  process.exitCode = 1;
}
