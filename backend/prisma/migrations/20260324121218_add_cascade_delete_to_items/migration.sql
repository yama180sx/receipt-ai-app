/*
  Warnings:

  - The `rawText` column on the `Receipt` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_receiptId_fkey";

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "rawText",
ADD COLUMN     "rawText" JSONB;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
