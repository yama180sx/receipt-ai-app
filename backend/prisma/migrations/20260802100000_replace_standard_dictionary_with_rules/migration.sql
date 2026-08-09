-- Issue #114-7: 完全一致の標準辞書を、管理可能な包含分類ルールへ置換する。
-- 既存の StandardProductDictionary はユーザー承認済みの初期化対象であり、移行コピーは行わない。
CREATE TYPE "StandardProductClassificationRuleAuditAction" AS ENUM (
  'created',
  'updated',
  'deactivated'
);

CREATE TABLE "StandardProductClassificationRule" (
  "id" SERIAL NOT NULL,
  "normalizedKeyword" TEXT NOT NULL,
  "standardCategoryId" INTEGER NOT NULL,
  "productTypeId" INTEGER NOT NULL,
  "priority" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByMemberId" INTEGER,
  "updatedByMemberId" INTEGER,
  "lastChangeReason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StandardProductClassificationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StandardProductClassificationRuleAudit" (
  "id" SERIAL NOT NULL,
  "ruleId" INTEGER NOT NULL,
  "action" "StandardProductClassificationRuleAuditAction" NOT NULL,
  "actorMemberId" INTEGER,
  "normalizedKeyword" TEXT NOT NULL,
  "productTypeId" INTEGER NOT NULL,
  "productTypeName" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StandardProductClassificationRuleAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StandardProductClassificationRule_normalizedKeyword_productTypeId_key"
  ON "StandardProductClassificationRule"("normalizedKeyword", "productTypeId");
CREATE INDEX "StandardProductClassificationRule_isActive_priority_idx"
  ON "StandardProductClassificationRule"("isActive", "priority");
CREATE INDEX "StandardProductClassificationRule_productTypeId_idx"
  ON "StandardProductClassificationRule"("productTypeId");
CREATE INDEX "StandardProductClassificationRuleAudit_ruleId_createdAt_idx"
  ON "StandardProductClassificationRuleAudit"("ruleId", "createdAt");
CREATE INDEX "StandardProductClassificationRuleAudit_actorMemberId_idx"
  ON "StandardProductClassificationRuleAudit"("actorMemberId");

ALTER TABLE "StandardProductClassificationRule"
  ADD CONSTRAINT "StandardProductClassificationRule_standardCategoryId_fkey"
  FOREIGN KEY ("standardCategoryId") REFERENCES "StandardCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StandardProductClassificationRule"
  ADD CONSTRAINT "StandardProductClassificationRule_productTypeId_fkey"
  FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StandardProductClassificationRule"
  ADD CONSTRAINT "StandardProductClassificationRule_createdByMemberId_fkey"
  FOREIGN KEY ("createdByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StandardProductClassificationRule"
  ADD CONSTRAINT "StandardProductClassificationRule_updatedByMemberId_fkey"
  FOREIGN KEY ("updatedByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StandardProductClassificationRuleAudit"
  ADD CONSTRAINT "StandardProductClassificationRuleAudit_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "StandardProductClassificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StandardProductClassificationRuleAudit"
  ADD CONSTRAINT "StandardProductClassificationRuleAudit_actorMemberId_fkey"
  FOREIGN KEY ("actorMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "StandardProductDictionary";
