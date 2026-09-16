CREATE TYPE "AiUsagePurpose" AS ENUM ('ocr', 'product_classification');

CREATE TABLE "AiPricingRevision" (
  "id" SERIAL NOT NULL,
  "purpose" "AiUsagePurpose" NOT NULL,
  "modelId" TEXT NOT NULL,
  "inputPriceJpyPerMillion" DECIMAL(18,6) NOT NULL,
  "outputPriceJpyPerMillion" DECIMAL(18,6) NOT NULL,
  "maxInputTokens" INTEGER NOT NULL,
  "maxOutputTokens" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "verifiedAt" TIMESTAMPTZ(3) NOT NULL,
  "verifiedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiPricingRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiPricingRevision_purpose_modelId_effectiveFrom_key"
  ON "AiPricingRevision"("purpose", "modelId", "effectiveFrom");
CREATE INDEX "AiPricingRevision_purpose_modelId_effectiveFrom_idx"
  ON "AiPricingRevision"("purpose", "modelId", "effectiveFrom");

ALTER TABLE "ApiUsageLog" ADD COLUMN "pricingRevisionId" INTEGER;
ALTER TABLE "ProductClassificationAiRun" ADD COLUMN "pricingRevisionId" INTEGER;

ALTER TABLE "ApiUsageLog"
  ADD CONSTRAINT "ApiUsageLog_pricingRevisionId_fkey"
  FOREIGN KEY ("pricingRevisionId") REFERENCES "AiPricingRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductClassificationAiRun"
  ADD CONSTRAINT "ProductClassificationAiRun_pricingRevisionId_fkey"
  FOREIGN KEY ("pricingRevisionId") REFERENCES "AiPricingRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
