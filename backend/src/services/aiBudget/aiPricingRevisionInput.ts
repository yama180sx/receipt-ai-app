import { AiUsagePurpose } from '@prisma/client';

export type CreateAiPricingRevisionInput = {
  purpose: AiUsagePurpose;
  modelId: string;
  inputPriceJpyPerMillion: string;
  outputPriceJpyPerMillion: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  effectiveFrom: Date;
  sourceUrl: string;
  verifiedAt: Date;
  verifiedBy: string;
};

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name)?.trim();
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

function nonNegativeDecimal(value: string, name: string): string {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) throw new Error(`--${name} must be a non-negative decimal with at most 6 decimal places.`);
  return value;
}

function positiveInteger(value: string, name: string): number {
  if (!/^\d+$/.test(value) || Number(value) <= 0 || !Number.isSafeInteger(Number(value))) throw new Error(`--${name} must be a positive integer.`);
  return Number(value);
}

function isoDate(value: string, name: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`--${name} must be an ISO-8601 timestamp.`);
  return date;
}

function httpsUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error();
    return url.toString();
  } catch {
    throw new Error('--source-url must be an HTTPS URL.');
  }
}

/** デプロイ手順で使う、追記専用単価改定CLIの引数を検証する。 */
export function parseAiPricingRevisionArgs(args: string[]): CreateAiPricingRevisionInput {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!option?.startsWith('--') || value === undefined || value.startsWith('--')) throw new Error('Options must be supplied as --name value pairs.');
    const name = option.slice(2);
    if (values.has(name)) throw new Error(`--${name} must not be specified more than once.`);
    values.set(name, value);
  }
  const purposeValue = required(values, 'purpose');
  const purpose = purposeValue === 'ocr' ? AiUsagePurpose.OCR : purposeValue === 'product-classification' ? AiUsagePurpose.PRODUCT_CLASSIFICATION : undefined;
  if (!purpose) throw new Error('--purpose must be ocr or product-classification.');
  return {
    purpose, modelId: required(values, 'model-id'),
    inputPriceJpyPerMillion: nonNegativeDecimal(required(values, 'input-price-jpy-per-million'), 'input-price-jpy-per-million'),
    outputPriceJpyPerMillion: nonNegativeDecimal(required(values, 'output-price-jpy-per-million'), 'output-price-jpy-per-million'),
    maxInputTokens: positiveInteger(required(values, 'max-input-tokens'), 'max-input-tokens'),
    maxOutputTokens: positiveInteger(required(values, 'max-output-tokens'), 'max-output-tokens'),
    effectiveFrom: isoDate(required(values, 'effective-from'), 'effective-from'), sourceUrl: httpsUrl(required(values, 'source-url')),
    verifiedAt: isoDate(required(values, 'verified-at'), 'verified-at'), verifiedBy: required(values, 'verified-by'),
  };
}
