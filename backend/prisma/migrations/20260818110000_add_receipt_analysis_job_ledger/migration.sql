CREATE TYPE "ReceiptAnalysisJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'AWAITING_CONFIRMATION', 'FAILED');

CREATE TABLE "ReceiptAnalysisJob" (
  "id" TEXT NOT NULL,
  "familyGroupId" INTEGER NOT NULL,
  "memberId" INTEGER NOT NULL,
  "imagePath" TEXT NOT NULL,
  "status" "ReceiptAnalysisJobStatus" NOT NULL DEFAULT 'QUEUED',
  "failureCode" TEXT,
  "failureReason" TEXT,
  "manualRetryCount" INTEGER NOT NULL DEFAULT 0,
  "lastEnqueuedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ReceiptAnalysisJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceiptAnalysisJob_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReceiptAnalysisJob_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReceiptAnalysisJob_familyGroupId_memberId_createdAt_idx" ON "ReceiptAnalysisJob"("familyGroupId", "memberId", "createdAt");
CREATE INDEX "ReceiptAnalysisJob_status_updatedAt_idx" ON "ReceiptAnalysisJob"("status", "updatedAt");
