import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import { getConfiguredReceiptModelId } from '../src/config/geminiModel';
import { loadSecretFiles } from '../src/config/secretFiles';

function requiredPositiveInteger(name: string): number {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function optionalRunCount(): number {
  const raw = process.env.RECEIPT_STABILITY_RUNS ?? '3';
  const runs = Number(raw);
  if (!Number.isSafeInteger(runs) || runs < 2 || runs > 10) {
    throw new Error('RECEIPT_STABILITY_RUNS must be an integer between 2 and 10.');
  }
  return runs;
}

function requiredImagePath(): string {
  const configured = process.env.RECEIPT_STABILITY_IMAGE_PATH;
  if (!configured) throw new Error('RECEIPT_STABILITY_IMAGE_PATH is required.');

  const imagePath = path.resolve(configured);
  if (!fs.existsSync(imagePath)) throw new Error('RECEIPT_STABILITY_IMAGE_PATH does not exist.');
  return imagePath;
}

type CoreFields = {
  storeName: string | null;
  purchaseDate: string | null;
  totalAmount: number | null;
};

function toCoreFields(value: CoreFields): CoreFields {
  return {
    storeName: value.storeName?.trim() ?? null,
    purchaseDate: value.purchaseDate?.trim() ?? null,
    totalAmount: value.totalAmount == null ? null : Math.round(value.totalAmount),
  };
}

async function main() {
  loadSecretFiles();
  const { analyzeReceiptImage } = await import('../src/services/geminiService.js');
  const imagePath = requiredImagePath();
  const familyGroupId = requiredPositiveInteger('RECEIPT_TEST_FAMILY_GROUP_ID');
  const memberId = requiredPositiveInteger('RECEIPT_TEST_MEMBER_ID');
  const runs = optionalRunCount();
  const results: CoreFields[] = [];

  for (let index = 0; index < runs; index += 1) {
    const parsed = await analyzeReceiptImage(imagePath, memberId, familyGroupId);
    results.push(toCoreFields(parsed));
  }

  const variants = new Map<string, number>();
  for (const result of results) {
    const key = JSON.stringify(result);
    variants.set(key, (variants.get(key) ?? 0) + 1);
  }

  // 画像本文・明細・APIキーは表示しない。共有時はこの集計だけで比較できる。
  console.log(JSON.stringify({
    modelId: getConfiguredReceiptModelId(),
    runs,
    stable: variants.size === 1,
    uniqueCoreFieldSets: variants.size,
    variants: [...variants.entries()].map(([key, count]) => ({ count, coreFields: JSON.parse(key) })),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Receipt stability evaluation failed.');
  process.exitCode = 1;
});
