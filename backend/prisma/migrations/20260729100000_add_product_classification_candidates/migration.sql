-- Issue #111-2: 類似候補を明細単位で保持し、後続の確認UI・分類AIから再利用する。
CREATE TYPE "ProductClassificationCandidateSource" AS ENUM (
  'history',
  'household_dictionary',
  'alias',
  'standard_dictionary'
);

CREATE TABLE "ProductClassificationCandidate" (
  "id" SERIAL NOT NULL,
  "itemId" INTEGER NOT NULL,
  "productTypeId" INTEGER NOT NULL,
  "source" "ProductClassificationCandidateSource" NOT NULL,
  "matchedNormalizedName" TEXT NOT NULL,
  "similarity" DOUBLE PRECISION NOT NULL,
  "rank" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductClassificationCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductClassificationCandidate_itemId_productTypeId_key"
  ON "ProductClassificationCandidate"("itemId", "productTypeId");

CREATE UNIQUE INDEX "ProductClassificationCandidate_itemId_rank_key"
  ON "ProductClassificationCandidate"("itemId", "rank");

CREATE INDEX "ProductClassificationCandidate_productTypeId_idx"
  ON "ProductClassificationCandidate"("productTypeId");

ALTER TABLE "ProductClassificationCandidate"
  ADD CONSTRAINT "ProductClassificationCandidate_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductClassificationCandidate"
  ADD CONSTRAINT "ProductClassificationCandidate_productTypeId_fkey"
  FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
