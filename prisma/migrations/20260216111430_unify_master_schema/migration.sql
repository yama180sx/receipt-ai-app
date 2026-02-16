/*
  Warnings:

  - Made the column `name` on table `Item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price` on table `Item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quantity` on table `Item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `storeName` on table `Receipt` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rawText` on table `Receipt` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "keywords" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "price" SET NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Receipt" ALTER COLUMN "date" DROP DEFAULT,
ALTER COLUMN "storeName" SET NOT NULL,
ALTER COLUMN "rawText" SET NOT NULL;

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "officialName" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_officialName_key" ON "Store"("officialName");
