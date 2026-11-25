import 'dotenv/config';
import fs from 'node:fs';
import { loadSecretFiles } from '../src/config/secretFiles';
import { getConfiguredReceiptModelId } from '../src/config/geminiModel';
import { parseExpectedReceipt, type ExpectedReceipt } from '../src/services/receipt/receiptDiagnosticReport';
import { runReceiptDiagnostics } from '../src/services/receipt/receiptDiagnosticRunner';
import { getHttpStatusFromError } from '../src/utils/httpError';
import { AppError } from '../src/utils/appError';

function positiveInteger(name: string): number {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function readExpected(): ExpectedReceipt | undefined {
  const file = process.env.RECEIPT_DIAGNOSTIC_EXPECTED_PATH;
  if (!file) return undefined;
  try {
    if (fs.statSync(file).size > 1_000_000) throw new Error('too large');
    return parseExpectedReceipt(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    throw new Error('Expected receipt file is unavailable or invalid.');
  }
}

function readDiagnosticPrompt(): string | undefined {
  const file = process.env.RECEIPT_DIAGNOSTIC_PROMPT_PATH;
  if (!file) return undefined;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 50_000) throw new Error('invalid file');
    const prompt = fs.readFileSync(file, 'utf8');
    if (!prompt.trim()) throw new Error('empty file');
    return prompt;
  } catch {
    throw new Error('Diagnostic prompt file is unavailable or invalid.');
  }
}

async function main() {
  const imagePath = process.env.RECEIPT_DIAGNOSTIC_IMAGE_PATH;
  if (!imagePath || !fs.existsSync(imagePath)) throw new Error('Diagnostic image is unavailable.');
  const familyGroupId = positiveInteger('RECEIPT_TEST_FAMILY_GROUP_ID');
  const memberId = positiveInteger('RECEIPT_TEST_MEMBER_ID');
  const runs = Number(process.env.RECEIPT_DIAGNOSTIC_RUNS ?? '3');
  if (!Number.isSafeInteger(runs) || runs < 1 || runs > 5) throw new Error('Diagnostic runs must be between 1 and 5.');
  const expected = readExpected();
  const promptOverride = readDiagnosticPrompt();
  const showValues = process.env.RECEIPT_DIAGNOSTIC_SHOW_VALUES === '1';
  loadSecretFiles();
  const [{ analyzeReceiptImage, ReceiptArithmeticError }, { prisma }] = await Promise.all([
    import('../src/services/geminiService.js'),
    import('../src/utils/prismaClient.js'),
  ]);
  try {
    const member = await prisma.familyMember.findFirst({ where: { id: memberId, familyGroupId }, select: { id: true } });
    if (!member) throw new Error('Diagnostic member is not in the selected household.');
    const report = await runReceiptDiagnostics({
      runs, expected, showValues,
      analyze: (observer) => analyzeReceiptImage(imagePath, memberId, familyGroupId, observer, promptOverride),
      classify: (error) => {
        if (error instanceof ReceiptArithmeticError) return 'arithmetic_mismatch';
        if (error instanceof AppError && error.code === 'AI_BUDGET_STOPPED') return 'budget_stopped';
        if (error instanceof AppError && error.code === 'AI_BUDGET_CONFIGURATION_UNAVAILABLE') return 'configuration_unavailable';
        const status = getHttpStatusFromError(error);
        return status === 429 ? 'rate_limited' : status && status >= 500 ? 'service_unavailable' : 'analysis_error';
      },
    });
    console.log(JSON.stringify({ modelId: getConfiguredReceiptModelId(), ...report }, null, 2));
    if (report.trials.some((trial) => trial.status !== 'success')) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('Receipt diagnostics failed. Check the diagnostic configuration and permissions.');
  process.exitCode = 1;
});
