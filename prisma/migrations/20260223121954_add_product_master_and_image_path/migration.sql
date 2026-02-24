-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "imagePath" TEXT,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "ProductMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "storeName" TEXT,
    "categoryId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaster_name_storeName_key" ON "ProductMaster"("name", "storeName");

-- AddForeignKey
ALTER TABLE "ProductMaster" ADD CONSTRAINT "ProductMaster_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
