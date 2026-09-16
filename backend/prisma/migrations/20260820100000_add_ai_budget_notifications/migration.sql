CREATE TYPE "AiBudgetNotificationChannel" AS ENUM ('DISCORD', 'EMAIL');
CREATE TYPE "AiBudgetNotificationKind" AS ENUM ('THRESHOLD', 'TEST');
CREATE TYPE "AiBudgetNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "GlobalAiBudgetSetting"
  ADD COLUMN "notifyDiscord" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notificationEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "AiBudgetNotificationDelivery" (
  "id" SERIAL NOT NULL,
  "dedupeKey" VARCHAR(512) NOT NULL,
  "kind" "AiBudgetNotificationKind" NOT NULL,
  "month" VARCHAR(7) NOT NULL,
  "thresholdPercent" INTEGER NOT NULL,
  "channel" "AiBudgetNotificationChannel" NOT NULL,
  "recipient" VARCHAR(320) NOT NULL,
  "status" "AiBudgetNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiBudgetNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiBudgetNotificationDelivery_dedupeKey_key"
  ON "AiBudgetNotificationDelivery"("dedupeKey");
CREATE INDEX "AiBudgetNotificationDelivery_status_nextAttemptAt_idx"
  ON "AiBudgetNotificationDelivery"("status", "nextAttemptAt");
CREATE INDEX "AiBudgetNotificationDelivery_month_thresholdPercent_idx"
  ON "AiBudgetNotificationDelivery"("month", "thresholdPercent");
