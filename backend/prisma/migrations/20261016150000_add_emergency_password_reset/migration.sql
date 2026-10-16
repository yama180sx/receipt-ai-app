-- Issue #132-2: password再設定で既存JWTを失効し、値を含まない監査を残す。
ALTER TABLE "FamilyMember"
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "EmergencyPasswordResetAudit" (
  "id" SERIAL NOT NULL,
  "resetId" VARCHAR(80) NOT NULL,
  "memberId" INTEGER NOT NULL,
  "familyGroupId" INTEGER NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmergencyPasswordResetAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmergencyPasswordResetAudit_resetId_key"
ON "EmergencyPasswordResetAudit"("resetId");

CREATE INDEX "EmergencyPasswordResetAudit_memberId_createdAt_idx"
ON "EmergencyPasswordResetAudit"("memberId", "createdAt");

CREATE INDEX "EmergencyPasswordResetAudit_familyGroupId_createdAt_idx"
ON "EmergencyPasswordResetAudit"("familyGroupId", "createdAt");
