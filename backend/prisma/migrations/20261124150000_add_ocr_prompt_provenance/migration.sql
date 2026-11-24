-- OCR結果の品質比較用。プロンプト本文は保存せず、世帯別テンプレートの識別子・版・SHA-256だけを残す。
ALTER TABLE "ApiUsageLog" ADD COLUMN "promptTemplateId" INTEGER;
ALTER TABLE "ApiUsageLog" ADD COLUMN "promptTemplateVersion" INTEGER;
ALTER TABLE "ApiUsageLog" ADD COLUMN "promptFingerprint" CHAR(64);

CREATE INDEX "ApiUsageLog_modelId_promptTemplateId_promptTemplateVersion_idx"
  ON "ApiUsageLog"("modelId", "promptTemplateId", "promptTemplateVersion");
