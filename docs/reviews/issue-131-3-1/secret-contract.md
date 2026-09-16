# Issue #131-3-1 サービス別 Secret 読取り契約

GitHub Issue: [#673](https://github.com/yama180sx/receipt-ai-app/issues/673)<br>
内部管理番号: Issue #131-3-1<br>
親 Issue: Issue #131-3（#666）

## 1. 適用方法

`docker-compose.yml` は既存の `.env` 経路を維持する基底定義とする。新しい配布経路は root 管理 unit だけが、次の override を追加して起動する。

```bash
docker compose -f docker-compose.yml -f docker-compose.secrets.yml <固定された操作>
```

`RECAIPT_SECRETS_DIR` は root 管理 unit が作成する一時ディレクトリであり、開発者・GitHub runner・作業ディレクトリから読めない。第1段階では実際のホスト設定・credentialを変更しない。第2段階で unit と権限境界を実装し、第3段階でdev／stableへ移行する。

`docker-compose.secrets.yml` はDocker Composeの `!override` タグを使い、dbの旧 `POSTGRES_PASSWORD` を `POSTGRES_PASSWORD_FILE` に完全置換する。第2段階のroot管理unitでは、この構文を扱えるDocker Composeを前提条件として確認する。

## 2. サービス別の読取り契約

| 論理Secret | 読取り主体 | コンテナ内の経路または注入先 | 備考 |
| --- | --- | --- | --- |
| backend database URL | backend | `/run/secrets/backend_database_url` → `DATABASE_URL_FILE` | DB passwordを含む接続文字列はbackendだけが読む |
| PostgreSQL password | db | `/run/secrets/postgres_password` → `POSTGRES_PASSWORD_FILE` | PostgreSQL公式イメージの`_FILE`契約を使う |
| JWT signing key | backend | `/run/secrets/backend_jwt_secret` → `JWT_SECRET_FILE` | #131-4で鍵更新を扱う |
| Gemini API key | backend | `/run/secrets/backend_gemini_api_key` → `GEMINI_API_KEY_FILE` | frontendへ渡さない |
| AI budget Discord Webhook | backend | `/run/secrets/backend_ai_budget_discord_webhook` → `AI_BUDGET_DISCORD_WEBHOOK_URL_FILE` | backupには渡さない |
| SMTP user/password/from | backend | `/run/secrets/backend_smtp_*` → 各`*_FILE` | host/port/TLSは制限付き設定として別経路 |
| backup DB password | backup root管理unit | `RECAIPT_BACKUP_SECRET_DIR/db_password` | backend／dbとは別の論理ファイル |
| backup Discord Webhook | backup root管理unit | `RECAIPT_BACKUP_SECRET_DIR/backup_discord_webhook_url` | backendへ渡さない |

TOTP暗号鍵のファイル契約はbackendの読取り層だけ先行実装する。実際の専用鍵の作成・配布・再暗号化は Issue #131-4 で行うため、この段階のCompose必須Secretには含めない。

## 3. backend の読取り順序

1. 起動エントリ `server.ts` が `.env` を読む。
2. `*_FILE` が設定されている論理Secretだけを、依存モジュールの import 前に読み込む。
3. 読み込んだ値を既存の `process.env.<NAME>` 契約へ渡す。
4. Prisma、JWT、Gemini、Worker等の実行時モジュールを動的 import する。

値、値の断片、secret file pathはログ・例外・診断へ出力しない。`*_FILE` が設定されていて読取り不能または空の場合は、論理名だけを含む起動失敗とする。

## 4. frontend とバックアップ

- frontendとfrontend-devにはSecretを配布しない。`EXPO_PUBLIC_API_TOKEN` は削除する。
- backupは `RECAIPT_BACKUP_SECRET_DIR` が与えられた場合にだけ、そこからDB passwordとWebhookを読む。未指定時の`.env`読取りは段階移行中の後方互換であり、Issue #131-3-3で廃止する。
- `backend/.dockerignore` は `.env` と `.env.*` をDocker build contextから除外する。
- `backend/.env.example` の `*_FILE` はコメント例に留め、通常のローカル開発で存在しない `/run/secrets` を読もうとしないようにする。

## 5. 検証と停止条件

- backend設定層は合成値で単体テストし、エラー文字列へ値を含まないことを確認する。
- Compose overrideは合成ファイルと非秘密の環境設定だけで構文確認する。実際の `.env` を使った `docker compose config` は実施しない。
- 実秘密値、`.env.secret`、GitHub Secretsの読取りが必要になった場合、作業を停止して第2／3段階の人間承認へ戻す。
