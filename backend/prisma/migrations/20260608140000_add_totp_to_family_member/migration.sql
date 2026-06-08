-- [Issue #93-5] TOTP 2FA
ALTER TABLE "FamilyMember" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FamilyMember" ADD COLUMN "totpVerifiedAt" TIMESTAMPTZ(3);
