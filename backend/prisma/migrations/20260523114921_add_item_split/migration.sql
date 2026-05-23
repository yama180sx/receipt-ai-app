-- CreateTable
CREATE TABLE "ItemSplit" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "familyMemberId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemSplit_itemId_idx" ON "ItemSplit"("itemId");

-- CreateIndex
CREATE INDEX "ItemSplit_familyMemberId_idx" ON "ItemSplit"("familyMemberId");

-- AddForeignKey
ALTER TABLE "ItemSplit" ADD CONSTRAINT "ItemSplit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSplit" ADD CONSTRAINT "ItemSplit_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
