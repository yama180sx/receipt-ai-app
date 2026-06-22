import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * DB 結合テスト用。TOTP 状態を書き換える auth テストと他ドメインが並列だと競合するため直列実行。
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/__tests__/integration/**/*.integration.test.ts'],
      fileParallelism: false,
    },
  })
);
