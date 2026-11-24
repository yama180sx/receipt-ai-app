-- 同一の元画像を同一世帯内で再解析・重複保存しないための非公開 SHA-256 照合キー。
-- NULL は既存レコードおよび手動登録を表し、PostgreSQL の UNIQUE 制約では複数保持できる。
ALTER TABLE "ReceiptAnalysisJob" ADD COLUMN "imageHash" CHAR(64);
ALTER TABLE "Receipt" ADD COLUMN "imageHash" CHAR(64);

CREATE UNIQUE INDEX "ReceiptAnalysisJob_familyGroupId_imageHash_key"
  ON "ReceiptAnalysisJob"("familyGroupId", "imageHash");
CREATE UNIQUE INDEX "Receipt_familyGroupId_imageHash_key"
  ON "Receipt"("familyGroupId", "imageHash");
