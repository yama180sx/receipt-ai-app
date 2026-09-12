CREATE TYPE "AiBudgetReservationStatus" AS ENUM ('RESERVED', 'SETTLED', 'RELEASED', 'EXPIRED');

CREATE TABLE "GlobalAiBudgetManager" (
  "id" SERIAL NOT NULL,
  "memberId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalAiBudgetManager_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GlobalAiBudgetManager_memberId_key" ON "GlobalAiBudgetManager"("memberId");
ALTER TABLE "GlobalAiBudgetManager" ADD CONSTRAINT "GlobalAiBudgetManager_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GlobalAiBudgetSetting" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "monthlyBudgetJpy" DECIMAL(18,6),
  "warningPercent" INTEGER NOT NULL DEFAULT 50,
  "criticalPercent" INTEGER NOT NULL DEFAULT 80,
  "stopPercent" INTEGER NOT NULL DEFAULT 100,
  "isStopped" BOOLEAN NOT NULL DEFAULT false,
  "stoppedReason" VARCHAR(64),
  "stoppedAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalAiBudgetSetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GlobalAiBudgetSetting_singleton" CHECK ("id" = 1)
);

CREATE TABLE "GlobalAiBudgetAudit" (
  "id" SERIAL NOT NULL,
  "actorMemberId" INTEGER,
  "action" VARCHAR(64) NOT NULL,
  "reason" TEXT,
  "beforeValue" JSONB,
  "afterValue" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalAiBudgetAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GlobalAiBudgetAudit_createdAt_idx" ON "GlobalAiBudgetAudit"("createdAt");
ALTER TABLE "GlobalAiBudgetAudit" ADD CONSTRAINT "GlobalAiBudgetAudit_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AiBudgetReservation" (
  "id" SERIAL NOT NULL,
  "purpose" "AiUsagePurpose" NOT NULL,
  "pricingRevisionId" INTEGER NOT NULL,
  "jobKey" TEXT NOT NULL,
  "reservedCostJpy" DECIMAL(18,6) NOT NULL,
  "actualCostJpy" DECIMAL(18,6),
  "status" "AiBudgetReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "settledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiBudgetReservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiBudgetReservation_jobKey_key" ON "AiBudgetReservation"("jobKey");
CREATE INDEX "AiBudgetReservation_status_expiresAt_idx" ON "AiBudgetReservation"("status", "expiresAt");
ALTER TABLE "AiBudgetReservation" ADD CONSTRAINT "AiBudgetReservation_pricingRevisionId_fkey" FOREIGN KEY ("pricingRevisionId") REFERENCES "AiPricingRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
