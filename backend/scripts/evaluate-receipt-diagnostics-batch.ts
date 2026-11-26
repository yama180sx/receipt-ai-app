import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { loadSecretFiles } from '../src/config/secretFiles';
import { getConfiguredReceiptModelId } from '../src/config/geminiModel';
import { runReceiptDiagnosticBatch } from '../src/services/receipt/receiptDiagnosticBatch';
import { listBatchImages, writePrivateBatchJson } from '../src/services/receipt/receiptDiagnosticBatchFiles';
import { runReceiptDiagnostics } from '../src/services/receipt/receiptDiagnosticRunner';
import { getHttpStatusFromError } from '../src/utils/httpError';
import { AppError } from '../src/utils/appError';

function positiveInteger(name: string): number {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid diagnostic configuration.');
  return value;
}

function readPrompt(): string | undefined {
  const file = process.env.RECEIPT_DIAGNOSTIC_PROMPT_PATH;
  if (!file) return undefined;
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 50_000) throw new Error('Invalid diagnostic prompt.');
  const prompt = fs.readFileSync(file, 'utf8');
  if (!prompt.trim()) throw new Error('Invalid diagnostic prompt.');
  return prompt;
}

async function main() {
  const directory = process.env.RECEIPT_BATCH_IMAGE_DIR;
  if (!directory) throw new Error('Invalid batch directory.');
  const expectedCount = positiveInteger('RECEIPT_BATCH_EXPECTED_COUNT');
  const familyGroupId = positiveInteger('RECEIPT_TEST_FAMILY_GROUP_ID');
  const memberId = positiveInteger('RECEIPT_TEST_MEMBER_ID');
  const valuesOption = process.env.RECEIPT_BATCH_SAVE_VALUES ?? '0';
  if (valuesOption !== '0' && valuesOption !== '1') throw new Error('Invalid private output option.');
  const showValues = valuesOption === '1';
  const files = listBatchImages(directory, expectedCount);
  const promptOverride = readPrompt();
  loadSecretFiles();
  const [{ analyzeReceiptImage, ReceiptArithmeticError }, { prisma }] = await Promise.all([
    import('../src/services/geminiService.js'),
    import('../src/utils/prismaClient.js'),
  ]);
  try {
    const member = await prisma.familyMember.findFirst({ where: { id: memberId, familyGroupId }, select: { id: true } });
    if (!member) throw new Error('Invalid diagnostic member.');
    const resultDirectory = fs.mkdtempSync('/tmp/receipt-diagnostic-batch-');
    fs.chmodSync(resultDirectory, 0o700);
    // パスだけを先に表示する。実値や元ファイル名は非公開ディレクトリ内だけに記録する。
    console.log(JSON.stringify({ resultDirectory, expectedCount, valuesSaved: showValues }));
    writePrivateBatchJson(resultDirectory, 'batch.json', { expectedCount, valuesSaved: showValues, modelId: getConfiguredReceiptModelId(), files: files.map((file) => path.basename(file)) });
    const summary = await runReceiptDiagnosticBatch({
      files,
      analyze: async (imagePath) => runReceiptDiagnostics({
        runs: 1, showValues,
        analyze: (observer) => analyzeReceiptImage(imagePath, memberId, familyGroupId, observer, promptOverride),
        classify: (error) => {
          if (error instanceof ReceiptArithmeticError) return 'arithmetic_mismatch';
          if (error instanceof AppError && error.code === 'AI_BUDGET_STOPPED') return 'budget_stopped';
          if (error instanceof AppError && error.code === 'AI_BUDGET_CONFIGURATION_UNAVAILABLE') return 'configuration_unavailable';
          const status = getHttpStatusFromError(error);
          return status === 429 ? 'rate_limited' : status && status >= 500 ? 'service_unavailable' : 'analysis_error';
        },
      }),
      save: (index, file, result) => {
        const name = `result-${String(index + 1).padStart(3, '0')}.json`;
        writePrivateBatchJson(resultDirectory, name, { sourceFile: path.basename(file), modelId: getConfiguredReceiptModelId(), ...result });
      },
      progress: (index, total, status) => console.log(`processed ${index}/${total}: ${status}`),
    });
    console.log(JSON.stringify(summary));
    if (summary.reviewRequired || summary.stoppedEarly) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('Batch diagnostics failed. Check configuration, input count, permissions and available space.');
  process.exitCode = 1;
});
