-- Issue #114-5: 世帯単位で既存明細を再分類した実行条件・結果・明細変更を監査する。
CREATE TYPE "ProductClassificationReclassificationRunStatus" AS ENUM (
  'completed',
  'partial_failure'
);

CREATE TYPE "ProductClassificationReclassificationItemOutcome" AS ENUM (
  'updated',
  'unchanged',
  'failed'
);

CREATE TABLE "ProductClassificationReclassificationRun" (
  "id" SERIAL NOT NULL,
  "familyGroupId" INTEGER NOT NULL,
  "actorMemberId" INTEGER NOT NULL,
  "targetStatuses" "ProductTypeStatus"[] NOT NULL,
  "startDate" TIMESTAMPTZ(3),
  "endDate" TIMESTAMPTZ(3),
  "limit" INTEGER NOT NULL,
  "selectedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "unchangedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "status" "ProductClassificationReclassificationRunStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),

  CONSTRAINT "ProductClassificationReclassificationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductClassificationReclassificationItemAudit" (
  "id" SERIAL NOT NULL,
  "runId" INTEGER NOT NULL,
  "itemId" INTEGER NOT NULL,
  "outcome" "ProductClassificationReclassificationItemOutcome" NOT NULL,
  "previousCategoryId" INTEGER,
  "nextCategoryId" INTEGER,
  "previousStandardCategoryId" INTEGER,
  "nextStandardCategoryId" INTEGER,
  "previousProductTypeId" INTEGER,
  "nextProductTypeId" INTEGER,
  "previousProductTypeStatus" "ProductTypeStatus" NOT NULL,
  "nextProductTypeStatus" "ProductTypeStatus" NOT NULL,
  "previousClassificationSource" "ClassificationSource",
  "nextClassificationSource" "ClassificationSource",
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductClassificationReclassificationItemAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductClassificationReclassificationItemAudit_runId_itemId_key"
  ON "ProductClassificationReclassificationItemAudit"("runId", "itemId");
CREATE INDEX "ProductClassificationReclassificationRun_familyGroupId_createdAt_idx"
  ON "ProductClassificationReclassificationRun"("familyGroupId", "createdAt");
CREATE INDEX "ProductClassificationReclassificationRun_actorMemberId_idx"
  ON "ProductClassificationReclassificationRun"("actorMemberId");
CREATE INDEX "ProductClassificationReclassificationItemAudit_itemId_idx"
  ON "ProductClassificationReclassificationItemAudit"("itemId");
CREATE INDEX "ProductClassificationReclassificationItemAudit_outcome_idx"
  ON "ProductClassificationReclassificationItemAudit"("outcome");

ALTER TABLE "ProductClassificationReclassificationRun"
  ADD CONSTRAINT "ProductClassificationReclassificationRun_familyGroupId_fkey"
  FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductClassificationReclassificationRun"
  ADD CONSTRAINT "ProductClassificationReclassificationRun_actorMemberId_fkey"
  FOREIGN KEY ("actorMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductClassificationReclassificationItemAudit"
  ADD CONSTRAINT "ProductClassificationReclassificationItemAudit_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "ProductClassificationReclassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductClassificationReclassificationItemAudit"
  ADD CONSTRAINT "ProductClassificationReclassificationItemAudit_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
