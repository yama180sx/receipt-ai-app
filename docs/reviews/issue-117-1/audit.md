# Issue #117-1 不要資産・依存関係・旧資料・運用手順 監査記録

GitHub Issue: [#616](https://github.com/yama180sx/receipt-ai-app/issues/616)
内部管理番号: Issue #117-1
親Issue: Issue #117（#612）
監査日: 2026-08-09

## 1. 目的と範囲

現行の as-built、OpenAPI、Prisma schema、実装、Docker、CI、運用スクリプトを照合し、削除・統合・更新を検討すべき資産を候補化する。

本記録は監査結果であり、候補の削除・依存パッケージ更新・DB操作・stable環境への反映は行わない。後続の削除は Issue #117-2、as-built資料の照合・更新は Issue #117-4 で扱う。

## 2. 監査基準

判断の優先順位は Accepted ADR、最新の確定機能仕様、共通規約、as-built資料、履歴・監査資料とした。

- 公開APIの正本: `docs/openapi/openapi.yaml`
- 現行DBモデルの正本: `backend/prisma/schema.prisma`
- 実行経路: `package.json` scripts、Docker Compose、GitHub Actions、cron登録元、import参照
- 運用参照: `docs/design/operations.md`、`docs/db-operations.md`、`docs/restore-manual.md`
- 履歴資料の扱い: `docs/README.md` の分類を優先する

## 3. 結論サマリー

| 区分 | 件数 | 方針 |
| --- | ---: | --- |
| 削除候補 | 6 | Issue #117-2で、個別検証後にのみ削除する |
| 要判断 | 6 | 実運用・データ・依存解決への影響を人間が確認するまで維持する |
| 維持 | 4分類 | 実行経路または履歴・復旧要件があるため削除しない |
| as-built更新候補 | 4分類 | Issue #117-4で実装正本と照合して更新する |

## 4. 削除候補

| 対象 | 根拠 | 影響・注意点 | 後続時の検証 |
| --- | --- | --- | --- |
| `backend/scripts/test-db-save.ts` | package script、CI、Docker、docsから実行参照がない。現行`saveParsedReceipt`の必要引数と一致しない。 | 手動DB保存試験の導線がなくなる。 | Backend型チェック、unit、integration test。 |
| `backend/scripts/test-integration.ts` | package script、CI、Docker、docsから実行参照がない。現行にない`processAndSaveReceipt`を参照する。 | 旧手動統合試験の導線がなくなる。 | Backend型チェック、unit、integration test。 |
| `backend/scripts/test-admin-api.ts` | package script、CI、Docker、docsから実行参照がない。固定IDと`as any`に依存する旧手動試験。 | 管理APIの手動確認は回帰チェック・integration testへ寄せる。 | Backend型チェック、admin関連integration test。 |
| `backend/scripts/generate-token.ts` | package script、CI、Docker、docsから実行参照がない。現行JWT payloadが必要とする`familyGroupId`・`role`を与えない。 | 手動トークン発行の旧導線がなくなる。 | Backend型チェック、認証integration test。 |
| `backend/scripts/list-models.ts` | package script、CI、Docker、docsから実行参照がない。モデル一覧ではなく、旧固定モデルへの取得試験のみ。 | Geminiの手動疎通手段がなくなる。 | 実Geminiを呼ばないunit test、必要なら別途承認済み手順を整備。 |
| Backend依存 `axios` | `backend/package.json`にあるが、Backendの実装・test・scriptからimport参照がない。 | `package-lock.json`が更新される。 | `npm install`後、Backend型チェック、unit、integration、Docker build。 |

## 5. 要判断の候補

| 対象 | 根拠 | 判断に必要なこと | stable／DBへの影響 |
| --- | --- | --- | --- |
| `backend/prisma/seed-prompts.ts` | `seed.ts`がPromptTemplateを生成する。package script・実行参照がない。 | 過去の手動prompt投入をまだ使うか確認する。 | DB書込みを行うため、無確認の削除・実行は禁止。 |
| `backend/scripts/cleanup-storage.ts` | 呼出元がないが、Receiptとuploadsを削除する。世帯単位ではなく日付で横断削除する。 | 保持期間ポリシー、cron・手動実行の実態、安全な世帯境界設計の要否。 | 既存DB・画像を不可逆に削除し得る。バックアップと承認が必須。 |
| `backend/scripts/resize-past-images.ts` | 呼出元がない。一回限りの既存画像直接更新処理。 | 旧画像の残存・変換要否、バックアップ済みか。 | uploadsを直接更新する。stableでは承認・バックアップ必須。 |
| `scripts/notify.sh` | 実行参照がない。`backup.sh`がDiscord通知を内包しており重複する。 | 手動障害通知テンプレートとして使っているか。 | 外部通知・秘密情報の管理方針に関わる。削除前に利用実態を確認。 |
| Backend依存 `ts-node-dev` | `backend:dev`でのみ使用。Composeと通常開発は`npm run dev`（tsx）を使用する。 | 開発者が`backend:dev`を使っていないか。 | DB影響なし。削除時はscriptとlockfileを同時に整理。 |
| Backend依存 `ioredis`、`@types/sharp` | 直接importは見つからないが、BullMQの接続実装・型解決に影響し得る。 | lockfile依存、BullMQ/TypeScriptの実行・型解決を確認する。 | Redis接続またはビルドに影響する可能性があるため、単純な未使用判定はしない。 |

## 6. 維持する資産

| 対象 | 維持根拠 |
| --- | --- |
| `setup-env.sh` | 環境変数生成と、`scripts/backup.sh`を呼ぶcron登録元。 |
| `scripts/backup.sh` | DB・uploadsバックアップ、世代管理、通知を担う現行運用資産。 |
| `backend/prisma/migrations/` | stableの`prisma migrate deploy`とDB復旧に必要な履歴。過去のProductMaster migrationも削除しない。 |
| `docs/specs/`、`docs/refactor/`、`docs/reviews/`、`docs/MILESTONE_PHASE1.md` | `docs/README.md`で監査・履歴・設計起源として明確に分類されている。正本ではないが、削除対象ではない。 |

## 7. as-built資料・運用資料の更新候補

これらは削除Issueに混在させず、Issue #117-4で正本との照合・更新を行う。

| 対象 | 現行実装との不整合 | 正とする根拠 |
| --- | --- | --- |
| `docs/design/ai-pipeline.md`、`api-spec.md`、`database-schema.md`、`domain-model.md`、`frontend-screens.md`、`architecture.md` | 廃止済み`ProductMaster`、旧repository・route・画面の記述が残る。 | ADR-003、`schema.prisma`、OpenAPI、`backend/src/app.ts`、`frontend/app/`。 |
| `docs/testing/regression-checklist.md` | ProductMaster画面の手動回帰項目が残る。 | 現行Frontend routeとOpenAPIに対象画面・APIがない。 |
| `docs/restore-manual.md` | stable復旧手順の作業ディレクトリが`~/dev/receipt-ai-app`となっている。 | `docs/design/operations.md`はstableを`~/stable/receipt-ai-app`としている。 |
| `docs/db-operations.md` | `prisma:reset-receipt-data`が認証情報を保持する実装なのに、一部説明がユーザーデータ全消失と読める。 | `backend/prisma/reset-receipt-data-preserve-auth.ts`。 |
| `backend/src/utils/expressRouteCollector.ts` | 既定probe pathに廃止済み`/api/product-master`が残る。 | OpenAPI・実routeに該当APIがない。Issue #117-2で低リスク候補として扱う。 |

## 8. DB、バックアップ、復旧、stable運用への影響

- 本Issueではmigration作成・適用、seed、reset、cleanup、画像変換を実行しない。
- migration履歴はstableの`prisma migrate deploy`と復旧の前提であり、削除候補に含めない。
- `cleanup-storage.ts`、`resize-past-images.ts`、Prisma seed/resetは既存データへ作用するため、後続で扱う場合もdevでの検証、バックアップ、対象環境の承認を必須とする。
- `setup-env.sh`と`backup.sh`はcronバックアップの経路であり、後続Issueでも削除・変更しない。
- GitHub ActionsのdeployはDB・Redisを起動してmigrationを適用し、永続volumeとuploadsをrsync対象外にしている。この挙動を変える提案は本Issueの範囲外とする。

## 9. 後続Issueへの引継ぎ

### Issue #117-2

承認済みの低リスク候補だけを、一候補または意味の近い小単位で削除する。各変更後に次を実行する。

```bash
cd backend && npx tsc --noEmit
cd backend && npm test
cd backend && npm run check:openapi
cd backend && npm run test:integration
cd frontend && npx tsc --noEmit
cd frontend && npm test
cd frontend && npm run check:api
docker compose config
git diff --check
```

`lint`と`build`のnpm scriptは未定義である。依存削除時は該当packageで`npm install`を行い、lockfileを意図的に更新する。

### Issue #117-4

OpenAPI、Prisma schema、実route、Frontend routesを現行根拠として、ProductMaster関連のas-built資料、運用資料、回帰チェックを更新する。履歴資料・migration履歴を現行仕様へ書き換えたり削除したりしない。

## 10. 停止条件

後続作業では、次の場合に変更を停止して人間へ確認する。

1. DB migration、既存データ削除、バックアップ対象の変更が必要になった場合。
2. 公開API、認証・TOTP、世帯分離、BullMQ／Redisの実行挙動に影響する場合。
3. stableで利用中のcron、手動手順、外部通知を削除する可能性が出た場合。
4. Accepted ADR、OpenAPI、Prisma schema、最新機能仕様の間に新たな矛盾が見つかった場合。

## 11. 監査完了判定

Issue #117-1の受け入れ条件に対し、削除候補、維持根拠、要判断事項、DB・バックアップ・復旧・stableへの影響を本記録に残した。本Issueでは候補の削除・変更を行っていない。
