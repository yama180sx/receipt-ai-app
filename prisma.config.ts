import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// .envファイルを明示的に読み込む
dotenv.config();

export default defineConfig({
  datasource: {
    // 環境変数があればそれを使用し、なければ空文字（エラーで止まる）にする
    url: process.env.DATABASE_URL || "",
  },
});