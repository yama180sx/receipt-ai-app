ALTER TABLE "Category" ADD COLUMN "isAdjustment" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Category_familyGroupId_isAdjustment_idx" ON "Category"("familyGroupId", "isAdjustment");
