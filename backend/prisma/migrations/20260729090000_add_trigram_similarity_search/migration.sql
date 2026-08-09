-- Issue #111-1: 商品分類候補検索と履歴検索で共有する pg_trgm 基盤
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Receipt"
  ADD COLUMN "normalizedStoreName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Item"
  ADD COLUMN "normalizedName" TEXT NOT NULL DEFAULT '';

-- 既存データはDBで可能な範囲の小文字化・空白整理を行う。
-- NFKCを含む完全な正規化は、以後アプリケーションの getCleanText で保存する。
UPDATE "Receipt"
SET "normalizedStoreName" = lower(trim(regexp_replace("storeName", '\s+', ' ', 'g')))
WHERE "normalizedStoreName" = '';

UPDATE "Item"
SET "normalizedName" = lower(trim(regexp_replace("name", '\s+', ' ', 'g')))
WHERE "normalizedName" = '';

CREATE INDEX "Receipt_normalizedStoreName_trgm_idx"
  ON "Receipt" USING GIN ("normalizedStoreName" gin_trgm_ops);

CREATE INDEX "Item_normalizedName_trgm_idx"
  ON "Item" USING GIN ("normalizedName" gin_trgm_ops);

CREATE INDEX "StandardProductDictionary_normalizedName_trgm_idx"
  ON "StandardProductDictionary" USING GIN ("normalizedName" gin_trgm_ops);

CREATE INDEX "HouseholdProductDictionary_normalizedName_trgm_idx"
  ON "HouseholdProductDictionary" USING GIN ("normalizedName" gin_trgm_ops);

CREATE INDEX "ProductClassificationHistory_normalizedName_trgm_idx"
  ON "ProductClassificationHistory" USING GIN ("normalizedName" gin_trgm_ops);

CREATE INDEX "ProductClassificationAlias_normalizedName_trgm_idx"
  ON "ProductClassificationAlias" USING GIN ("normalizedName" gin_trgm_ops);
