# R2オフサイトbackup 隔離復旧演習 runbook

Issue: [#766 Issue #57-4](https://github.com/yama180sx/receipt-ai-app/issues/766)
Parent: [#134 Issue #57](https://github.com/yama180sx/receipt-ai-app/issues/134)

> [!WARNING]
> この資料は、**本番dev／stableを復元する手順ではない**。R2に保存した暗号化backupを、稼働環境とネットワーク・DB・uploadsを共有しない隔離検証環境へ復元するための設計と受入手順である。実演習は、専用root helperの実装・レビュー後に人間が明示承認した場合だけ実施する。

## 1. 目的と完了条件

R2への送信成功だけでは、復旧可能性を証明できない。復旧演習では、同じ世代の`database.sql.gz`、`uploads.tar.gz`、`manifest.json`をクライアント側で復号し、隔離環境に復元して、次を確認する。

- PostgreSQL dumpとuploads archiveが同じ時刻の完了世代である
- manifestの環境・サイズ・SHA-256、gzip、archive構造が一致する
- 隔離PostgreSQLにmigration適用済みのDBを復元できる
- 隔離uploadsに画像を展開できる
- 隔離backend health、ログイン、世帯境界、履歴・明細・画像表示を確認できる
- 未完了解析はValkeyを復元せず、PostgreSQLの台帳を正本として再投入可能な状態を確認できる
- 実測RTO、対象世代時刻、RPOを値そのものではなく記録可能な範囲で残せる

## 2. 安全境界

| 項目 | 演習で許可すること | 禁止すること |
| --- | --- | --- |
| T320 dev/stable | 読み取り専用の状態確認 | DB、uploads、Valkey、container、credential、timer、R2設定の変更 |
| Cloudflare R2 | 暗号化objectの読み取り・復号・manifest照合 | object、bucket、lifecycle rule、tokenの作成・更新・削除 |
| 隔離環境 | 新規DB・新規uploads・隔離containerの作成と削除 | host port公開、既存dev/stableのvolume・network・container名の再利用 |
| 秘密情報 | R2 credentialと、TOTP復号に必要な既存encrypted credentialをroot専用`/run`へ一時配備 | 値・平文ファイル・credentialの永続コピーをGit、Issue、チャット、shell履歴、journal、画面へ表示・保存 |

隔離環境のDB名、container名、volume、network、runtime directoryは`dev`／`stable`と異なる固定接頭辞を使う。hostへのport publishは行わず、画面確認が必要な場合だけSSH local port forwardまたは同一host上の限定経路を使う。

## 3. 現在の実装と不足している機能

現在の`receipt-offsite-verify-{dev,stable}.service`は、R2上の**最新完了世代**を`/run`のroot専用一時領域へ読み戻し、復号後のmanifest SHA-256、gzip、uploads archive構造を検証して一時ファイルを削除する。DB、uploads、Valkey、container、R2 objectを変更しない。

これは送信・復号・artifact整合性の検証として完了している。一方で、隔離DBへ投入するartifactを保持し、隔離Composeを起動し、復元後の画面まで確認するroot helperは未実装である。本runbookを実行可能にする次の実装では、既存の`receipt-restore`を流用して稼働環境を停止してはならない。

## 4. 実装する隔離復旧helperの契約

後続PRで追加するhelper／unitは、次の固定契約を満たす。

1. 引数は`dev`または`stable`、明示確認語、必要なら隔離演習用の固定操作だけを受け入れる。任意path、任意container名、任意ref、平文`.env`は受け入れない。
2. R2 credential、crypt password、crypt saltは環境別encrypted credentialだけから読み取り、temporary rclone configを`/run`に0600で作る。
3. 完了世代の3 artifactだけを読み取り、manifest・SHA-256・gzip・archive構造を確認してから隔離領域へ渡す。
4. TOTPログイン確認に必要なJWT／TOTP暗号鍵は、既存encrypted credentialから隔離runtimeの`/run`へ直接・短時間だけ配備する。別のcredentialファイルとして永続複製せず、ログイン試験後に削除する。Gemini、SMTP、Discord等の外向き連携には検証専用値または明示的な無効化を用い、実利用通知・課金を発生させない。
5. 隔離PostgreSQL、Valkey、uploads、network、container名は専用prefixに固定し、host portをpublishしない。
6. ValkeyのRDBは復元しない。必要な未完了解析だけを、復元済みPostgreSQL台帳から再投入する。
7. live dev/stableのDocker object、`/var/lib/receipt-ai-app/{dev,stable}`、`/mnt/raid_1t/backups/`をwrite対象にしない。
8. 成功・失敗の記録は環境名、対象世代時刻、所要時間、成否だけとし、秘密値・レシート内容・復号データを出力しない。
9. cleanupは隔離専用領域だけを明示確認付きで削除できる。演習失敗時に自動削除やlive環境への自動復元はしない。

## 5. 実演習の開始条件

以下をすべて満たすまで、実復元を開始しない。

- [ ] dev／stableの通常サービス、root管理backup、R2 offsite timerが正常である
- [ ] 演習対象環境、対象世代、実施時間、担当者、確認担当者を明示承認した
- [ ] crypt passwordとcrypt saltを異なる値として、復旧担当者が暗号化パスワードマネージャーから取得可能であることを確認した。値そのものは表示・転記しない
- [ ] 隔離用DB credential、新規Docker namespace、外向き連携を無効化または検証専用にする設定が用意されている。既存JWT／TOTP encrypted credentialはroot専用runtimeへ一時配備するだけで、永続コピーしない
- [ ] host portを公開しない確認方法を決めた
- [ ] 演習で作る隔離データの保持期間と明示cleanup担当者を決めた

## 6. 受入手順

### 6.1 R2世代の取得・検証

1. 隔離復旧helperがR2の完了世代を選択する。
2. DB・uploads・manifestの厳密なartifact集合を確認する。
3. manifestの環境、世代時刻、サイズ、SHA-256を確認する。
4. DB gzipとuploads archiveの安全な構造を確認する。
5. 失敗時は隔離DB・uploadsを作成せず終了する。

### 6.2 隔離環境の復元

1. 専用network、PostgreSQL、Valkey、uploads領域を作成する。いずれもhost portを公開しない。
2. DBを新規隔離databaseへ復元する。
3. uploadsを隔離領域へ展開する。
4. Valkeyを空として起動する。
5. 隔離backendを起動し、migration・healthcheckを確認する。

### 6.3 機能受入

- [ ] backend healthが成功する
- [ ] 対象世代に存在するアカウントで、隔離runtimeへ一時配備したTOTP暗号鍵を用いるログイン確認ができる
- [ ] 他世帯の履歴を検索・参照できない
- [ ] 対象世代までの履歴、明細、合計、レシート画像が整合する
- [ ] 画像パスが隔離uploadsを参照し、live uploadsを参照していない
- [ ] 未完了解析がある場合、DB台帳から再投入候補を確認できる
- [ ] DB、uploads、R2 object、live dev/stableに変更がない

## 7. RPO・RTOの記録

演習終了時に、次だけをIssueまたは運用記録へ残す。秘密値・レシート内容・endpoint・bucket名は残さない。

| 項目 | 記録内容 |
| --- | --- |
| 対象環境 | dev または stable |
| 対象世代 | 日時だけ |
| RPO | 演習開始時点と対象世代の差 |
| RTO | 承認開始から隔離health・受入完了までの所要時間 |
| 成否 | 成功、または失敗した検証段階 |
| cleanup | 隔離領域の保持・削除の判断と担当者 |

crypt復旧キットのpasswordまたはsaltを失うと、R2の暗号化backupは復号できない。このリスクはDB・画像backupを残していても回避できないため、復旧キットの保管場所・アクセス可能な担当者・更新時の手順を別途見直す。

## 8. 次の作業

- 専用root helper・systemd unit・Compose隔離namespaceを実装する
- helperの静的契約テストを追加する
- devを対象に実演習を行い、RTO/RPOを記録する
- stableはdev結果をレビューし、別途明示承認した時間に実施する
- 保持期間は[Issue #57-3](https://github.com/yama180sx/receipt-ai-app/issues/763)で決定する
