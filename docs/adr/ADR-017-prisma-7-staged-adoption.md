# ADR-017: Prisma ORM 7は専用設計と段階受入を経て採用する

Status: Proposed

関連: Issue #138、[ADR-010](./ADR-010-secret-lifecycle-and-runtime-delivery.md)、[ADR-011](./ADR-011-stable-release-promotion-control.md)

## 背景

Issue #138のproduction依存監査では、Prisma 6.19.3へ更新後もPrisma由来のhigh脆弱性が残る。Prisma ORM 7は修正候補だが、単なる依存patchではない。

Prisma ORM 7はESM、driver adapter、`prisma.config.ts`、CLIの環境変数明示読込、Prisma Client生成とmigration実行経路の変更を要求する。現行RecAIptは`prisma-client-js`、schema内の`DATABASE_URL`、root管理secret fileからコンテナ内だけでURLを解決するmigration helper、`new PrismaClient()`を使用している。

stableのDB接続、migration、secret deliveryを依存監査の自動更新で同時に変更すると、利用者データと復旧可能性を検証できない。

## 決定

- Prisma 7は、Issue #138内の専用設計・実装フェーズとして扱い、通常の`npm audit fix`やPrisma 6 patch更新と混在させない。
- `prisma`と`@prisma/client`は同じmajor/minorで更新する。Prisma 7への更新前に、ESM互換のpackage設定・TypeScript設定・全import経路を検証する。
- PostgreSQL driver adapterとconnection pool設定を明示し、既存のtimeout・TLS・接続失敗時の挙動をdevで比較する。
- `prisma.config.ts`はschema、migration、seed、datasourceを定義する。ただしroot管理encrypted credentialやsecret fileを直接読まない。root deploy helperだけがsecret fileから短命の`DATABASE_URL`を解決し、Prisma CLI実行時のコンテナ環境へ渡す。
- Prisma 7のmigration／generate手順は、既存migration履歴やstable DBを変更しないdev検証で確定する。schema差分がない更新で新規migrationを作成しない。
- stable反映は、devでのDB migration、backend health、ログイン／TOTP、既存履歴・画像、解析、通知、backupの受入後に、ADR-011の固定SHA・backup・人間承認を満たす場合だけ行う。

## 結果

- Prisma 6.19.3のpatch更新は、Prisma 7設計を待たずに脆弱性緩和として進められる。
- Prisma 7移行は、DB接続・secret delivery・migrationの受入記録を伴う別PR群になる。
- Prisma 7で解消できない依存監査項目や、frontend Expo由来の項目は、到達可能性・緩和策・更新計画をIssue #138に記録する。
- 本ADRがAcceptedになるまで、Prisma 7をdev／stableへdeployしない。
