CREATE TYPE "ProductClassificationAiRunStatus" AS ENUM (
  'succeeded',
  'invalid_response',
  'provider_error',
  'persistence_error'
);

CREATE TABLE "ProductClassificationAiRun" (
  "id" SERIAL NOT NULL,
  "familyGroupId" INTEGER NOT NULL,
  "receiptId" INTEGER,
  "modelId" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "candidatesTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "targetItemCount" INTEGER NOT NULL,
  "classifiedCount" INTEGER NOT NULL DEFAULT 0,
  "needsReviewCount" INTEGER NOT NULL DEFAULT 0,
  "unreturnedCount" INTEGER NOT NULL DEFAULT 0,
  "status" "ProductClassificationAiRunStatus" NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductClassificationAiRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductClassificationAiRun_familyGroupId_createdAt_idx"
  ON "ProductClassificationAiRun"("familyGroupId", "createdAt");
CREATE INDEX "ProductClassificationAiRun_receiptId_idx"
  ON "ProductClassificationAiRun"("receiptId");
ALTER TABLE "ProductClassificationAiRun"
  ADD CONSTRAINT "ProductClassificationAiRun_familyGroupId_fkey"
  FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductClassificationAiRun"
  ADD CONSTRAINT "ProductClassificationAiRun_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
