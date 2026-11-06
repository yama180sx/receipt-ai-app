# Issue #152: コンテナイメージdigest更新運用

この資料は、RecAIptが採用するコンテナイメージの更新候補を確認し、検証済みのmanifest digestだけを段階的に採用するための運用手順である。設計判断は[ADR-018](../../adr/ADR-018-container-image-provenance-and-pinning.md)を正とする。ここに記録するのは採用したtag・digestと検証結果だけであり、秘密値、接続先、利用者データ、レシート内容は記録しない。

## 1. 対象と固定範囲

対象はアプリのbuild/runtimeで利用する次の公式イメージである。

| 用途 | 採用tag | 固定方法 |
|---|---|---|
| backend・development build用Metro | Node.js 22 slim | tag + manifest digest |
| Web build | Node.js 22 alpine | tag + manifest digest |
| Web runtime | Nginx stable alpine | tag + manifest digest |
| DB | PostgreSQL 18 | tag + manifest digest |
| queue store・隔離受入runtime | Valkey 8.1 alpine | tag + manifest digest |

`Dockerfile*` のすべての `FROM` と、通常・production Composeのすべての `image:` はtagとsha256 manifest digestを併記する。固定値の具体値はソースと `test-container-image-pinning-contract.sh` を正とする。CIの結合テスト用PostgreSQL serviceは本番runtimeではないため、この固定範囲には含めない。CI側の更新はテスト基盤変更として別途判断する。

## 2. 定期確認と候補の起票

- 毎月最初の作業日に、運用担当者が各公式供給元のsecurity advisory、対象tagのサポート状態、公開manifestを確認する。
- 緊急の供給元脆弱性情報を受けた場合は次の定期確認を待たず、影響範囲と候補digestを含むIssueを起票する。
- 候補は、公式供給元、tag、manifest digest、AMD64とARM64の両platform、ライセンス、更新理由を確認してから採用候補とする。単一platformのimage digestは採用しない。
- digestの確認・更新・デプロイは自動化しない。候補ごとに人間が確認し、`develop`向けPRで変更する。

## 3. PRで行う変更と静的確認

1. 更新理由・供給元確認・候補tag/digestをIssueへ記録する。脆弱性番号を記録してよいが、接続先や秘密値は記録しない。
2. 対象Dockerfile、Compose、隔離runtimeで共有するイメージ定数を同じ候補へ更新する。
3. `scripts/security/test-container-image-pinning-contract.sh` の期待値を更新する。可変tagだけの `FROM` / `image:` を混入させない。
4. `bash scripts/security/test-container-image-pinning-contract.sh`、既存Compose契約テスト、backend / frontend test、Docker buildを実行する。
5. PRは必ず `develop` 宛てにする。digest値だけの変更でも `main` へ直接PRを作成しない。

## 4. 受入と昇格

| 段階 | 必須確認 | 停止条件 |
|---|---|---|
| T320 dev | 事前backup、root管理deploy、DB/Valkey health、Webログイン・履歴・詳細・画像、test-only解析・保存、事後backup | build、health、認証、解析、backupのいずれかが失敗 |
| T320 stable | develop→mainリリースPR、承認済み固定SHA、事前backup、CD Pipeline、同じ主要機能、事後backup | dev未受入、SHA不一致、またはstableの受入失敗 |
| KAGOYA | stableと同じrelease候補でCompose再build、health、WebとAndroid development buildで認証・解析・保存、事後backup | stable未受入、認証・解析・保存の回帰 |

stable反映はGitHub Actionsの承認済みrelease操作だけを使う。T320 dev、stable、KAGOYAへ未検証digestを直接反映しない。KAGOYAは将来の家族向け本番環境として扱い、Webだけで完了にせずAndroid development buildも受入対象とする。

## 5. release記録とrollback

release記録には、アプリcommit SHA、前後のtag/digest組、各段階の受入結果、backup結果、rollback判断を残す。digest値・commit SHAは記録してよいが、秘密値・接続先・利用者データは記録しない。

回帰時は、問題のdigestをその場で置換しない。

1. stableは新規反映を停止し、直前に受入済みのアプリSHAとtag/digest組へ戻すrelease PRを作る。
2. stableでは事前backup後、承認済み固定SHAを使うCD Pipelineで反映し、health・主要画面・backupを再確認する。
3. devとKAGOYAは原因調査を継続できるが、利用者データや秘密値をIssue・PR・ログへ出さない。
4. DB migrationを伴う変更はdigest更新とは別のrollback条件を持つ。DBを復元・変更するかは、対象Issueで明示的に判断する。

## 6. 今回の基準線

Issue #152で、上記の固定範囲をdigest化し、T320 dev、T320 stable、KAGOYAのWeb受入を完了した。KAGOYAのAndroid development buildとGemini解析・保存も後続の受入で確認済みである。次回以降はこの手順を候補ごとに適用し、既存digestを推測で更新しない。
