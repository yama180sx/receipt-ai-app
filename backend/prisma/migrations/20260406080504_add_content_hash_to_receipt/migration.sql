/*
  Warnings:

  - A unique constraint covering the columns `[contentHash]` on the table `Receipt` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_contentHash_key" ON "Receipt"("contentHash");
