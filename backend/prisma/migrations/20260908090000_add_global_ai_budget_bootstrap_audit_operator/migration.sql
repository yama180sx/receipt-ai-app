-- Issue #132: デプロイ時の初期AI予算管理者登録の実行者を、利用者とは分けて監査する。
ALTER TABLE "GlobalAiBudgetAudit"
ADD COLUMN "operatorName" VARCHAR(128);
