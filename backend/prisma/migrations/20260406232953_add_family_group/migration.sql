/*
  Warnings:

  - A unique constraint covering the columns `[name,familyGroupId]` on the table `FamilyMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[familyGroupId,name,storeName]` on the table `ProductMaster` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `familyGroupId` to the `FamilyMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `familyGroupId` to the `ProductMaster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `familyGroupId` to the `Receipt` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FamilyMember_name_key";

-- DropIndex
DROP INDEX "ProductMaster_name_storeName_key";

-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN     "familyGroupId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ProductMaster" ADD COLUMN     "familyGroupId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "familyGroupId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "FamilyGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyGroup_inviteCode_key" ON "FamilyGroup"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_name_familyGroupId_key" ON "FamilyMember"("name", "familyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaster_familyGroupId_name_storeName_key" ON "ProductMaster"("familyGroupId", "name", "storeName");

-- CreateIndex
CREATE INDEX "Receipt_familyGroupId_date_idx" ON "Receipt"("familyGroupId", "date");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaster" ADD CONSTRAINT "ProductMaster_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
