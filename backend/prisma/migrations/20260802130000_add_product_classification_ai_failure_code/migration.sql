-- 分類AIの失敗を、秘密値を含まない固定コードで監査する。
ALTER TABLE "ProductClassificationAiRun"
  ADD COLUMN "failureCode" VARCHAR(64);
