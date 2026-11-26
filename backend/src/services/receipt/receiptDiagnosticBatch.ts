type BatchResult = { trials: Array<{ status: string }>; [key: string]: unknown };

/** 順次実行し、失敗の種類に応じて残りを止める。画像名や診断内容はログに出さない。 */
export async function runReceiptDiagnosticBatch(input: {
  files: string[];
  analyze: (file: string) => Promise<BatchResult>;
  save: (index: number, file: string, result: BatchResult) => void;
  progress?: (index: number, total: number, status: string) => void;
}) {
  let completed = 0;
  let reviewRequired = 0;
  let stoppedReason: string | null = null;
  for (let index = 0; index < input.files.length; index += 1) {
    const result = await input.analyze(input.files[index]);
    const status = result.trials[0]?.status ?? 'analysis_error';
    input.save(index, input.files[index], result);
    completed += 1;
    if (status !== 'success') reviewRequired += 1;
    input.progress?.(completed, input.files.length, status);
    if (status !== 'success' && status !== 'incomplete' && status !== 'arithmetic_mismatch') {
      stoppedReason = status;
      break;
    }
  }
  return { requested: input.files.length, completed, reviewRequired, stoppedEarly: completed < input.files.length, stoppedReason };
}
