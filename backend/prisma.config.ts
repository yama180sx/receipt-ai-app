import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `prisma generate` はDBへ接続しない。root管理runtimeでは、deploy helperが
// migration実行時だけDATABASE_URLを短命のコンテナ環境変数として渡す。
const generateOnlyDatabaseUrl = 'postgresql://prisma:prisma@localhost:5432/prisma';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? generateOnlyDatabaseUrl,
  },
});
