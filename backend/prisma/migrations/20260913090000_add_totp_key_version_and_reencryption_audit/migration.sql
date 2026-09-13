-- Issue #131-4: JWT署名鍵とTOTP暗号鍵を分離し、既存暗号文を安全に移行する。
ALTER TABLE "FamilyMember" ADD COLUMN "totpKeyVersion" VARCHAR(32);

-- 既存の暗号文は Issue #131-4 より前のJWT由来鍵で暗号化されている。
UPDATE "FamilyMember"
SET "totpKeyVersion" = 'totp-old-v1'
WHERE "totpSecret" IS NOT NULL;

ALTER TABLE "FamilyMember"
ADD CONSTRAINT "FamilyMember_totp_secret_key_version_consistency"
CHECK (
  ("totpSecret" IS NULL AND "totpKeyVersion" IS NULL)
  OR ("totpSecret" IS NOT NULL AND "totpKeyVersion" IS NOT NULL)
);

-- 値そのものを保存しない、root専用再暗号化CLIの集計監査。
CREATE TABLE "TotpSecretReencryptionAudit" (
  "id" SERIAL NOT NULL,
  "operatorName" VARCHAR(128) NOT NULL,
  "reason" TEXT NOT NULL,
  "sourceKeyVersion" VARCHAR(32) NOT NULL,
  "targetKeyVersion" VARCHAR(32) NOT NULL,
  "candidateCount" INTEGER NOT NULL,
  "reencryptedCount" INTEGER NOT NULL,
  "failedCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TotpSecretReencryptionAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TotpSecretReencryptionAudit_createdAt_idx"
ON "TotpSecretReencryptionAudit"("createdAt");
