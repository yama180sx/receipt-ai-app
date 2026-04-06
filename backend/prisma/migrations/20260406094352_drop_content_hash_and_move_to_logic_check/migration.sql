/*
  Warnings:

  - You are about to drop the column `contentHash` on the `Receipt` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Receipt_contentHash_key";

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "contentHash";
