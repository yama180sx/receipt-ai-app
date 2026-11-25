/** 未確認の解析結果は、登録または破棄されるまで保持する。 */
export const RECEIPT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: false,
  removeOnFail: false,
};
