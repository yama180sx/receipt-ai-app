-- Issue #131-7: 招待コードの値を保存しないroot専用再発行監査。
CREATE TYPE "InvitationCodeRotationStatus" AS ENUM ('SUCCEEDED', 'FAILED');
CREATE TYPE "InvitationCodeRotationAction" AS ENUM ('ROTATED', 'ROLLED_BACK');

CREATE TABLE "InvitationCodeRotationAudit" (
  "id" SERIAL NOT NULL,
  "rotationId" VARCHAR(80) NOT NULL,
  "action" "InvitationCodeRotationAction" NOT NULL,
  "status" "InvitationCodeRotationStatus" NOT NULL,
  "targetCount" INTEGER NOT NULL,
  "rotatedCount" INTEGER NOT NULL,
  "failedCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvitationCodeRotationAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvitationCodeRotationAudit_rotationId_action_key"
ON "InvitationCodeRotationAudit"("rotationId", "action");

CREATE INDEX "InvitationCodeRotationAudit_createdAt_idx"
ON "InvitationCodeRotationAudit"("createdAt");
