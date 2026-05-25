-- CreateTable
CREATE TABLE "SettlementTransfer" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "fromMemberId" INTEGER NOT NULL,
    "toMemberId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "settledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SettlementTransfer_month_idx" ON "SettlementTransfer"("month");

-- CreateIndex
CREATE INDEX "SettlementTransfer_fromMemberId_idx" ON "SettlementTransfer"("fromMemberId");

-- CreateIndex
CREATE INDEX "SettlementTransfer_toMemberId_idx" ON "SettlementTransfer"("toMemberId");

-- AddForeignKey
ALTER TABLE "SettlementTransfer" ADD CONSTRAINT "SettlementTransfer_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementTransfer" ADD CONSTRAINT "SettlementTransfer_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
