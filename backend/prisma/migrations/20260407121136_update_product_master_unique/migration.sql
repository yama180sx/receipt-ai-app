/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `ProductMaster` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,storeName,familyGroupId]` on the table `ProductMaster` will be added. If there are existing duplicate values, this will fail.
  - Made the column `storeName` on table `ProductMaster` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "ProductMaster_familyGroupId_name_storeName_key";

-- AlterTable
ALTER TABLE "ProductMaster" DROP COLUMN "updatedAt",
ALTER COLUMN "storeName" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaster_name_storeName_familyGroupId_key" ON "ProductMaster"("name", "storeName", "familyGroupId");
