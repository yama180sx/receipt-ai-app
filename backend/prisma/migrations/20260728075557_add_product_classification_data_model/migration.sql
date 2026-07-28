-- CreateEnum
CREATE TYPE "ProductTypeStatus" AS ENUM ('classified', 'needs_review', 'unclassified', 'outside_initial_scope', 'not_applicable');

-- CreateEnum
CREATE TYPE "ClassificationSource" AS ENUM ('history', 'household_dictionary', 'standard_dictionary', 'similarity', 'ai', 'manual');

-- CreateEnum
CREATE TYPE "ClassificationConfidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "ClassificationCorrectionScope" AS ENUM ('item_only', 'same_ocr_name', 'same_classification_name');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "classificationConfidence" "ClassificationConfidence",
ADD COLUMN     "classificationSource" "ClassificationSource",
ADD COLUMN     "productTypeId" INTEGER,
ADD COLUMN     "productTypeStatus" "ProductTypeStatus" NOT NULL DEFAULT 'unclassified',
ADD COLUMN     "standardCategoryId" INTEGER;

-- CreateTable
CREATE TABLE "StandardCategory" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,

    CONSTRAINT "StandardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardCategoryId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardProductDictionary" (
    "id" SERIAL NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "standardCategoryId" INTEGER NOT NULL,
    "productTypeId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StandardProductDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdProductDictionary" (
    "id" SERIAL NOT NULL,
    "familyGroupId" INTEGER NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "productTypeId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HouseholdProductDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductClassificationHistory" (
    "id" SERIAL NOT NULL,
    "familyGroupId" INTEGER NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "productTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductClassificationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductClassificationAlias" (
    "id" SERIAL NOT NULL,
    "familyGroupId" INTEGER NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "productTypeId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductClassificationAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationCorrection" (
    "id" SERIAL NOT NULL,
    "familyGroupId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "actorMemberId" INTEGER,
    "previousProductTypeId" INTEGER,
    "nextProductTypeId" INTEGER,
    "scope" "ClassificationCorrectionScope" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StandardCategory_code_key" ON "StandardCategory"("code");

-- CreateIndex
CREATE INDEX "StandardCategory_parentId_displayOrder_idx" ON "StandardCategory"("parentId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StandardCategory_parentId_name_key" ON "StandardCategory"("parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_code_key" ON "ProductType"("code");

-- CreateIndex
CREATE INDEX "ProductType_standardCategoryId_displayOrder_idx" ON "ProductType"("standardCategoryId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_standardCategoryId_name_key" ON "ProductType"("standardCategoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StandardProductDictionary_normalizedName_key" ON "StandardProductDictionary"("normalizedName");

-- CreateIndex
CREATE INDEX "StandardProductDictionary_standardCategoryId_idx" ON "StandardProductDictionary"("standardCategoryId");

-- CreateIndex
CREATE INDEX "StandardProductDictionary_productTypeId_idx" ON "StandardProductDictionary"("productTypeId");

-- CreateIndex
CREATE INDEX "HouseholdProductDictionary_productTypeId_idx" ON "HouseholdProductDictionary"("productTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdProductDictionary_familyGroupId_normalizedName_key" ON "HouseholdProductDictionary"("familyGroupId", "normalizedName");

-- CreateIndex
CREATE INDEX "ProductClassificationHistory_productTypeId_idx" ON "ProductClassificationHistory"("productTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductClassificationHistory_familyGroupId_normalizedName_key" ON "ProductClassificationHistory"("familyGroupId", "normalizedName");

-- CreateIndex
CREATE INDEX "ProductClassificationAlias_productTypeId_idx" ON "ProductClassificationAlias"("productTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductClassificationAlias_familyGroupId_normalizedName_key" ON "ProductClassificationAlias"("familyGroupId", "normalizedName");

-- CreateIndex
CREATE INDEX "ClassificationCorrection_familyGroupId_createdAt_idx" ON "ClassificationCorrection"("familyGroupId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassificationCorrection_itemId_idx" ON "ClassificationCorrection"("itemId");

-- CreateIndex
CREATE INDEX "ClassificationCorrection_actorMemberId_idx" ON "ClassificationCorrection"("actorMemberId");

-- CreateIndex
CREATE INDEX "Item_standardCategoryId_idx" ON "Item"("standardCategoryId");

-- CreateIndex
CREATE INDEX "Item_productTypeId_idx" ON "Item"("productTypeId");

-- CreateIndex
CREATE INDEX "Item_productTypeStatus_idx" ON "Item"("productTypeStatus");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_standardCategoryId_fkey" FOREIGN KEY ("standardCategoryId") REFERENCES "StandardCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardCategory" ADD CONSTRAINT "StandardCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StandardCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_standardCategoryId_fkey" FOREIGN KEY ("standardCategoryId") REFERENCES "StandardCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardProductDictionary" ADD CONSTRAINT "StandardProductDictionary_standardCategoryId_fkey" FOREIGN KEY ("standardCategoryId") REFERENCES "StandardCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardProductDictionary" ADD CONSTRAINT "StandardProductDictionary_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdProductDictionary" ADD CONSTRAINT "HouseholdProductDictionary_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdProductDictionary" ADD CONSTRAINT "HouseholdProductDictionary_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductClassificationHistory" ADD CONSTRAINT "ProductClassificationHistory_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductClassificationHistory" ADD CONSTRAINT "ProductClassificationHistory_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductClassificationAlias" ADD CONSTRAINT "ProductClassificationAlias_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductClassificationAlias" ADD CONSTRAINT "ProductClassificationAlias_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCorrection" ADD CONSTRAINT "ClassificationCorrection_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCorrection" ADD CONSTRAINT "ClassificationCorrection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCorrection" ADD CONSTRAINT "ClassificationCorrection_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCorrection" ADD CONSTRAINT "ClassificationCorrection_previousProductTypeId_fkey" FOREIGN KEY ("previousProductTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCorrection" ADD CONSTRAINT "ClassificationCorrection_nextProductTypeId_fkey" FOREIGN KEY ("nextProductTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
