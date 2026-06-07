-- [Issue #93-4] マスタテーブルに familyGroupId を追加し世帯分離する

-- 1. カラム追加（nullable）
ALTER TABLE "Category" ADD COLUMN "familyGroupId" INTEGER;
ALTER TABLE "Store" ADD COLUMN "familyGroupId" INTEGER;
ALTER TABLE "PromptTemplate" ADD COLUMN "familyGroupId" INTEGER;
ALTER TABLE "SettlementTransfer" ADD COLUMN "familyGroupId" INTEGER;

-- 2. 既存データを第1世帯に紐付け
UPDATE "Category" SET "familyGroupId" = 1 WHERE "familyGroupId" IS NULL;
UPDATE "Store" SET "familyGroupId" = 1 WHERE "familyGroupId" IS NULL;
UPDATE "PromptTemplate" SET "familyGroupId" = 1 WHERE "familyGroupId" IS NULL;
UPDATE "SettlementTransfer" st
SET "familyGroupId" = fm."familyGroupId"
FROM "FamilyMember" fm
WHERE st."fromMemberId" = fm.id AND st."familyGroupId" IS NULL;

-- 3. NOT NULL + FK
ALTER TABLE "Category" ALTER COLUMN "familyGroupId" SET NOT NULL;
ALTER TABLE "Store" ALTER COLUMN "familyGroupId" SET NOT NULL;
ALTER TABLE "PromptTemplate" ALTER COLUMN "familyGroupId" SET NOT NULL;
ALTER TABLE "SettlementTransfer" ALTER COLUMN "familyGroupId" SET NOT NULL;

ALTER TABLE "Category" ADD CONSTRAINT "Category_familyGroupId_fkey"
  FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_familyGroupId_fkey"
  FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_familyGroupId_fkey"
  FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementTransfer" ADD CONSTRAINT "SettlementTransfer_familyGroupId_fkey"
  FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. ユニーク制約の差し替え
DROP INDEX IF EXISTS "Category_name_key";
ALTER TABLE "Category" ADD CONSTRAINT "Category_name_familyGroupId_key" UNIQUE ("name", "familyGroupId");

DROP INDEX IF EXISTS "Store_officialName_key";
ALTER TABLE "Store" ADD CONSTRAINT "Store_officialName_familyGroupId_key" UNIQUE ("officialName", "familyGroupId");

-- 5. インデックス
CREATE INDEX "Category_familyGroupId_idx" ON "Category"("familyGroupId");
CREATE INDEX "Store_familyGroupId_idx" ON "Store"("familyGroupId");
CREATE INDEX "PromptTemplate_familyGroupId_key_isActive_idx" ON "PromptTemplate"("familyGroupId", "key", "isActive");
CREATE INDEX "SettlementTransfer_familyGroupId_idx" ON "SettlementTransfer"("familyGroupId");

DROP INDEX IF EXISTS "PromptTemplate_key_isActive_idx";
