import { getErrorMessage, isRetryableHttpError } from './httpError';

/**
 * 指数バックオフを用いたリトライラッパー
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000 // 初期待ち時間（ミリ秒）
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries <= 0 || !isRetryableHttpError(error)) {
      throw error;
    }

    console.warn(`⚠️ APIエラー発生。リトライします... (残り ${retries} 回) : ${getErrorMessage(error)}`);

    // 指数バックオフ: 1s -> 2s -> 4s と待ち時間を倍増させる
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}
