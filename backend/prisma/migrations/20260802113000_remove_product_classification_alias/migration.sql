-- 「同じ分類用名称にも適用」は完全一致の別名辞書となり、標準ルールの包含検索と役割が重複するため廃止する。
-- 既存の別名と、その別名由来の候補・無効化監査は分類根拠として利用しないため削除する。
DELETE FROM "ProductClassificationCandidate" WHERE "source" = 'alias';
DELETE FROM "ProductClassificationLearningDataAudit" WHERE "learningDataType" = 'alias';
DELETE FROM "ClassificationCorrection" WHERE "scope" = 'same_classification_name';

ALTER TABLE "ClassificationCorrection"
  ALTER COLUMN "scope" TYPE TEXT USING "scope"::TEXT;
DROP TYPE "ClassificationCorrectionScope";
CREATE TYPE "ClassificationCorrectionScope" AS ENUM ('item_only', 'same_ocr_name');
ALTER TABLE "ClassificationCorrection"
  ALTER COLUMN "scope" TYPE "ClassificationCorrectionScope" USING "scope"::"ClassificationCorrectionScope";

ALTER TABLE "ProductClassificationCandidate"
  ALTER COLUMN "source" TYPE TEXT USING "source"::TEXT;
DROP TYPE "ProductClassificationCandidateSource";
CREATE TYPE "ProductClassificationCandidateSource" AS ENUM ('history', 'household_dictionary', 'standard_dictionary');
ALTER TABLE "ProductClassificationCandidate"
  ALTER COLUMN "source" TYPE "ProductClassificationCandidateSource" USING "source"::"ProductClassificationCandidateSource";

ALTER TABLE "ProductClassificationLearningDataAudit"
  ALTER COLUMN "learningDataType" TYPE TEXT USING "learningDataType"::TEXT;
DROP TYPE "ProductClassificationLearningDataType";
CREATE TYPE "ProductClassificationLearningDataType" AS ENUM ('household_dictionary');
ALTER TABLE "ProductClassificationLearningDataAudit"
  ALTER COLUMN "learningDataType" TYPE "ProductClassificationLearningDataType" USING "learningDataType"::"ProductClassificationLearningDataType";

DROP TABLE "ProductClassificationAlias";
