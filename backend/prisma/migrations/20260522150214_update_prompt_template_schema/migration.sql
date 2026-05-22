-- DropIndex
DROP INDEX "PromptTemplate_key_key";

-- AlterTable
ALTER TABLE "PromptTemplate" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'デフォルトプロンプト',
ALTER COLUMN "isActive" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "PromptTemplate_key_isActive_idx" ON "PromptTemplate"("key", "isActive");
