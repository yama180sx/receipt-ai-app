import { PrismaClient } from '@prisma/client';
import { parseAiPricingRevisionArgs } from '../src/services/aiBudget/aiPricingRevisionInput';

const usage = 'Usage: npm run ai-pricing:add -- --purpose ocr|product-classification --model-id MODEL_ID --input-price-jpy-per-million AMOUNT --output-price-jpy-per-million AMOUNT --max-input-tokens COUNT --max-output-tokens COUNT --effective-from ISO_TIMESTAMP --source-url HTTPS_URL --verified-at ISO_TIMESTAMP --verified-by OPERATOR';

async function main() {
  const input = parseAiPricingRevisionArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const created = await prisma.aiPricingRevision.create({ data: input });
    console.log(JSON.stringify({ id: created.id, purpose: created.purpose, modelId: created.modelId, effectiveFrom: created.effectiveFrom.toISOString() }));
  } finally { await prisma.$disconnect(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : usage);
  console.error(usage);
  process.exitCode = 1;
});
