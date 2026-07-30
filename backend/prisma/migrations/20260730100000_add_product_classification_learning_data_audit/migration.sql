-- Issue #113-3: 世帯別学習データの無効化理由・対象世帯を保持する監査ログ。
CREATE TYPE "ProductClassificationLearningDataType" AS ENUM (
  'household_dictionary',
  'alias'
);

CREATE TABLE "ProductClassificationLearningDataAudit" (
  "id" SERIAL NOT NULL,
  "familyGroupId" INTEGER NOT NULL,
  "actorMemberId" INTEGER,
  "learningDataType" "ProductClassificationLearningDataType" NOT NULL,
  "learningDataId" INTEGER NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "productTypeId" INTEGER NOT NULL,
  "productTypeName" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductClassificationLearningDataAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductClassificationLearningDataAudit_familyGroupId_createdAt_idx"
  ON "ProductClassificationLearningDataAudit"("familyGroupId", "createdAt");

CREATE INDEX "ProductClassificationLearningDataAudit_learningDataType_learningDataId_idx"
  ON "ProductClassificationLearningDataAudit"("learningDataType", "learningDataId");

ALTER TABLE "ProductClassificationLearningDataAudit"
  ADD CONSTRAINT "ProductClassificationLearningDataAudit_familyGroupId_fkey"
  FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductClassificationLearningDataAudit"
  ADD CONSTRAINT "ProductClassificationLearningDataAudit_actorMemberId_fkey"
  FOREIGN KEY ("actorMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
