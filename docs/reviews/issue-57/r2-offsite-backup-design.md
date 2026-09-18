# Issue #57: Cloudflare R2オフサイトバックアップ・DR設計

関連: [GitHub #134](https://github.com/yama180sx/receipt-ai-app/issues/134)
設計判断: [ADR-014](../../adr/ADR-014-cloudflare-r2-offsite-backup.md)

> この資料はIssue #57の**実装前設計**である。現行のas-built backupはローカルRAIDへの7日保管だけであり、R2への転送・R2 credential・オフサイト復旧helperはまだ存在しない。

## 1. 目的と完了条件

クラウド主系、T320、自宅LANのどれかが利用不能でも、PostgreSQLとレシート画像を同一時点へ戻せるようにする。R2は主系DBではなく、暗号化されたオフサイト復旧セットの保管先である。

完了とみなすのは、単にR2にファイルがある時ではない。次を満たした時である。

1. DB、uploads、manifestが暗号化され、同じ復旧世代としてR2へ保管される。
2. R2への書込みは主系からの送信接続だけで完結し、T320を外部公開しない。
3. 隔離環境でmanifest・hash・archive構造を検証した上で、DBとuploadsを復旧できる。
4. RPO/RTO、保持、通知、鍵管理、失敗時の判断が値を出さず運用できる。

## 2. 構成

```text
root-managed local backup
  ├─ db_backup_<timestamp>.sql.gz
  └─ uploads_backup_<timestamp>.tar.gz
             │ validate + hash + encrypted manifest
             ▼
  root-managed offsite helper ── outbound HTTPS/S3 only ──> R2 private bucket
                                                        (rclone crypt ciphertext)

OCI primary ── outbound pull not required ──> R2
T320 secondary <── outbound HTTPS/S3 only ── R2
```

OCIが主系になった後はOCIがR2へ書込み、T320はR2から二次コピーを取得する。T320へpushする経路、T320の受信待受、OCIとT320のDB二重書込みは作らない。

## 3. R2リソースと権限

| 項目 | dev | stable | 共通ルール |
|---|---|---|---|
| bucket | 専用private bucket | 専用private bucket | bucket名はGitや資料へ固定しない |
| access key | dev専用 | stable専用 | 対象bucketのObject Read/Writeだけ |
| crypt鍵 | dev専用 | stable専用 | 内容・ファイル名・ディレクトリ名を暗号化 |
| 保管先 | crypt remoteの専用root | crypt remoteの専用root | raw remoteを日常操作に使わない |

R2管理画面の公開bucket、パブリックURL、Workers経由の公開アクセスは有効化しない。access keyにはアカウント設定・課金・他bucketの管理権限を与えない。

## 4. 復旧セット形式

### 4.1 一世代の内容

ローカルbackup成功後に、root専用staging領域で次を生成する。`timestamp`は既存のDB／uploads archiveが共有する時刻と一致しなければならない。

| 論理artifact | 作成元 | 検証 |
|---|---|---|
| DB archive | `db_backup_<timestamp>.sql.gz` | `gzip -t`、SHA-256 |
| uploads archive | `uploads_backup_<timestamp>.tar.gz` | `tar -tzf`、危険なpath・非通常entry拒否、SHA-256 |
| manifest | helperが生成 | schema、環境、時刻、artifact名・サイズ・SHA-256、release/migration情報 |

manifestは暗号化対象であり、R2 raw bucketには平文で置かない。manifestに含めてよいのは復旧検証に必要な非秘密情報だけである。DB接続文字列、認証情報、Webhook、メールアドレス、招待コード、TOTP、レシート本文や画像内容を含めない。

### 4.2 送信順と整合性

1. 対になるローカルDB／uploads archiveだけを選ぶ。
2. 両archiveを検証し、SHA-256と非秘密metadataを含むmanifestをroot専用stagingへ作る。
3. DB archiveとuploads archiveをcrypt remoteへ`copy`する。
4. 転送後にremote上のartifactを照合する。
5. manifestを**最後**に送る。manifestがある世代だけを完了世代とする。

`rclone sync`は使用しない。転送元の誤認や一時障害で正しいR2世代を削除し得るためである。manifestのない中断世代は復元対象外とし、48時間後も残る場合は通知して人間が確認する。

## 5. 保持・費用・通知

初期値は実データ量の測定前の安全な出発点である。実装前に最新7日分のlocal archiveのサイズを**合計値だけ**で確認し、10 GB-month無料枠と照合する。

| 環境 | RPO | R2保持 | ローカル保持 | ねらい |
|---|---:|---:|---:|---|
| stable | 24時間 | 完了世代を35日 | 7日 | 月次の復旧余地を確保 |
| dev | 24時間 | 完了世代を14日 | 7日 | 検証データの増加を抑える |

- 保存量が8 GiB-monthを越える見込み、またはR2利用料・請求設定に異常がある場合は、新規の保持延長を停止して人間へ通知する。既存の完了世代を自動で大量削除しない。
- 成功通知には環境、復旧世代の作成可否、合計バイト数、経過時間、保持処理の結果だけを含める。artifact名、R2 endpoint、bucket、資格情報、hash、レシート情報を通知しない。
- 失敗通知は`local backup success / offsite copy failed`を区別する。R2不調でローカルbackupを削除したり、アプリ停止へ連鎖させたりしない。
- R2 Standardは月10 GB-monthと操作枠が無料で、egressは無料である。保持容量が無料枠を超える場合に備え、Cloudflare側の請求・利用状況の確認担当を決める。[公式料金](https://developers.cloudflare.com/r2/pricing/)

## 6. 秘密情報と復旧キット

### 6.1 root管理encrypted credential

環境ごとに、S3 access key ID、S3 secret access key、rclone crypt password、rclone crypt saltを別logical credentialとして登録する。rclone config全体を平文ファイルとして永続化しない。offsite helperはsystemdの`LoadCredentialEncrypted`で一時runtimeへだけ受け取り、終了時に消える領域で設定を組み立てる。

credentialの論理名・ファイル所有者・modeは実装PRで`ops/systemd/README.md`とsystemd unitを正本として確定する。値、URL、bucket名、暗号鍵をIssue、PR、端末貼付け、ログ、バックアップ、Gitに記録しない。

### 6.2 人間が保持する復旧キット

次を、R2・T320・OCIのいずれか単独の障害で失わない場所に保管する。

- crypt鍵の再構成に必要な情報と保管場所
- R2アカウント復旧手順と担当者
- 現行releaseを取得するGitHubリポジトリの識別情報
- 復旧手順書の版と、直近の復旧演習の日時・結果

復旧キットへ秘密値をそのまま書く場合は、暗号化パスワードマネージャまたは管理者が管理する暗号化媒体だけを使用する。値をこのリポジトリへ置かない。

## 7. 復旧手順の設計

### 7.1 隔離演習

1. 人間が対象環境、世代、停止時間、復旧担当者を承認する。
2. crypt remoteから専用staging領域へ一世代だけ取得する。実稼働`/var/lib/receipt-ai-app/{env}`へ直接取得しない。
3. manifest schema、対象環境、artifactの対応、SHA-256、gzip、tarの安全性を検証する。
4. 隔離DB／隔離uploadsへ復元し、login、世帯境界、履歴・明細・画像、統計・精算、未完了解析の台帳再投入を確認する。
5. 実測開始・終了時刻、復旧世代、成功可否、検証結果、失われ得る期間を値なしで記録する。

### 7.2 実障害

実障害での本番上書きは、隔離検証済みの世代だけを対象にする。既存の[復旧手順書](../../restore-manual.md)と同様に、事前backup、停止、明示confirm、復旧後受入確認を必須とする。offsite archiveを既存restore helperへ安全に引き渡す専用helperを実装し、`docker compose`や平文`.env`を直接使用しない。

ValkeyのRDBは復旧セットに含めない。PostgreSQL `ReceiptAnalysisJob`台帳とuploadsを正本として、既存のValkey台帳復旧経路で未完了解析を再投入する。

## 8. 実装フェーズと受入確認

| フェーズ | 内容 | 人間の判断・確認 |
|---|---|---|
| 0 | Cloudflareアカウント、請求監視、private bucket、環境別keyを準備 | アカウント所有者、請求上限、復旧キット保管先 |
| 1 | devでoffsite backup helper・manifest・通知を実装 | credential登録は値を表示せずに実施 |
| 2 | devのR2 uploadと隔離restore演習 | DB・画像・ログイン・台帳復旧を確認 |
| 3 | stableへ適用し、R2 uploadと隔離restore演習 | 停止時間、利用者連絡、作業／復旧担当者を承認 |
| 4 | OCI主系からR2へ送信、T320の送信接続only二次コピーを実装 | OCI稼働後に実機で検証 |
| 5 | 四半期ごとのstable復旧演習と月次のR2容量確認 | RPO/RTO実績、保持・費用を見直す |

最低限の自動検証は、manifest生成／検証、archive組合せ拒否、hash不一致拒否、credential未設定拒否、`rclone sync`不使用、raw remoteへの平文送信防止を含める。実R2接続と復旧は環境資格情報を要する手動受入確認とする。

## 9. 未決定事項

実装開始前に人間が決める事項は次だけである。

1. Cloudflareアカウント所有者と課金通知の受信先
2. crypt復旧キットの保管方式・保管責任者
3. 初回35日／14日の保持量が無料枠・許容費用に収まらない場合の保持日数
4. stable隔離復旧演習の停止時間と確認担当者

それ以外の接続方式、暗号化、artifact形式、検証順序は本資料とADR-014に従う。
