# Issue #117-2 不要資産整理 実施・検証記録

GitHub Issue: [#617](https://github.com/yama180sx/receipt-ai-app/issues/617)
内部管理番号: Issue #117-2
親Issue: Issue #117（#612）
実施日: 2026-08-09

## 1. 実施範囲と承認

Issue #117-1の監査記録を根拠に、次の低リスク候補について人間の承認を得て整理した。

- 旧手動スクリプト5件の削除
  - `backend/scripts/test-db-save.ts`
  - `backend/scripts/test-integration.ts`
  - `backend/scripts/test-admin-api.ts`
  - `backend/scripts/generate-token.ts`
  - `backend/scripts/list-models.ts`
- Backend直接依存`axios`の削除
- `backend/src/utils/expressRouteCollector.ts`の既定probeから、廃止済み`/api/product-master`を削除

監査記録、OpenAPI、実Route、ADR-003を照合し、上記以外の候補は変更していない。

## 2. 変更内容

| 対象 | 内容 | 根拠 |
| --- | --- | --- |
| 旧手動スクリプト5件 | 削除 | package script、Docker、CI、運用文書、通常アプリのいずれからも実行参照がなく、現行実装とも不整合だった。 |
| `backend/package.json` | `axios`直接依存を削除 | Backend実装・テスト・スクリプトにimport参照がない。Frontendの`axios`は変更していない。 |
| `backend/package-lock.json` | `axios`と専用の孤立依存を削除し、dev依存の印を再計算 | `npm uninstall axios --save`の結果。 |
| `expressRouteCollector.ts` | `/api/product-master`の既定probeを削除 | ADR-003で廃止済みであり、OpenAPI・実Routeにも存在しない。 |

## 3. 変更していない範囲

- 公開API、OpenAPI、Frontend画面、認証・TOTP、`familyGroupId`によるテナント分離
- Prisma schema、migration、seed、既存DBデータ、uploads
- BullMQ、Redis、Docker Compose、CI/CD設定、バックアップ・復旧・cron資産
- `ts-node-dev`、`ioredis`、`@types/sharp`、DBやuploadsに作用するスクリプト
- as-built資料のProductMaster記述。資料照合・更新はIssue #117-4で扱う。

## 4. 検証結果

| 確認 | コマンドまたは方法 | 結果 |
| --- | --- | --- |
| 依存再現 | `cd backend && npm ci` | 成功。更新済みlockfileから355パッケージを再現できた。 |
| Backend型チェック | `cd backend && npx tsc --noEmit` | 成功。 |
| Backend通常テスト | `cd backend && npm test` | 成功。44ファイル・148テスト成功、DBを必要とする6ファイル・48テストは設定どおりskip。 |
| OpenAPI drift検証 | `cd backend && npm run check:openapi` | 成功。4ファイル・5テスト成功。 |
| Prisma schema検証 | `cd backend && npx prisma validate` | 成功。 |
| Prisma Client生成 | `cd backend && npx prisma generate` | 成功。 |
| Frontend型チェック | `cd frontend && npx tsc --noEmit` | 成功。 |
| Frontend単体テスト | `cd frontend && npm test` | 成功。16ファイル・72テスト成功。 |
| Frontend OpenAPI生成型確認 | `cd frontend && npm run check:api` | 成功。生成型の差分なし。 |
| Docker Compose設定 | `docker compose config` | 成功。 |
| Git差分の空白・競合確認 | `git diff --check` | 成功。 |

`lint`および`build`のnpm scriptはBackend/Frontendとも未定義のため、実行していない。

## 5. 実行しなかった検証と理由

DB結合テスト（`npm run test:integration`）は実行しなかった。このテストは既存DBのテスト用メンバーのパスワード・TOTP状態を更新し、テスト用レシートも作成する。今回の受け入れ条件である既存データへの意図しない変更を避けるため、共有開発DBでは実行しない。

CIでは使い捨てPostgreSQLにmigrationとseedを適用して同コマンドを実行するため、DB結合テストはCIで確認する。Dockerイメージbuildは、Backend Dockerfileが依存インストールを行わないため、依存再現の確認としては`npm ci`を優先した。

## 6. 補足

`npm ci`は既存依存について18件の脆弱性通知を出力した。今回のIssueは承認済みの不要依存整理に限定され、依存更新はスコープ外のため対応していない。
