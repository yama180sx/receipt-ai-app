# Issue #131-3-2 root管理デプロイ境界

このディレクトリは、T320へ**人間がrootとして**設置する固定ヘルパー、systemd unit、非機密設定、sudoersのテンプレートである。ここに実Secret、実IP、実ポート、暗号化済みcredentialを保存してはならない。

## 目的と境界

- root所有の `/srv/receipt-ai-app/{dev,stable}` だけをruntimeソースとする。
- root unitは公開リポジトリの固定入力だけを取得する。devは`develop`、stableはroot所有`stable.env`の`STABLE_RELEASE_SHA`で承認した完全長コミットSHAとし、runner入力は受け取らない。
- runner／開発ユーザーの `~/dev`、`~/stable`、Actions workspaceはroot unitの入力にしない。
- runnerに許可するのは、sudoersで固定したunit開始だけである。Docker socket、任意のsystemctl操作、任意パス・任意refは許可しない。
- app Secretはsystemd encrypted credentialからruntimeのroot専用世代ディレクトリへコピーする。Git、ワークツリー、`.env`、frontend、runner環境には書かない。デプロイが成功してコンテナを再作成した後にだけ旧世代を削除する。

`docker-compose.runtime.yml` は開発用Composeと併用しない。実行用imageを作り、ユーザー所有ソースのbind mountを、root管理のimageと`/var/lib/receipt-ai-app/{env}`の永続データへ置換する。

## root適用前の確認

以下は **Issue #131-3-3でdevへ移行する時だけ**、人間がrootとして実施する。Issue #131-3-2のPRをマージしただけでは実行しない。

1. 作業ツリー上で `scripts/security/verify-root-deploy-contract.sh` を成功させる。
2. unitテンプレートを `systemd-analyze verify` で確認する。
3. `ops/systemd/config/*.env.example` を基に、root所有・`0600`の `/etc/receipt-ai-app/{dev,stable}.env` を作成する。許可された非機密キー以外を追加しない。
4. root専用の `/etc/receipt-ai-app/credentials/{dev,stable}` に、各環境で別々のencrypted credentialを作成する。平文は端末表示、Git、作業ディレクトリ、shell履歴へ残さない。
5. helper、unit、sudoersをroot所有の所定位置へinstallし、`systemctl daemon-reload`する。
6. 合成credentialでunitの読取り・失敗時の値なしエラーを確認する。
7. `scripts/security/test-runtime-secret-staging.sh` を成功させ、同名ディレクトリへcredentialを誤配置しないことを確認する。
8. 現行devのDB・旧Redis・uploadsを停止時間内にroot管理の永続領域へ移し、dev unitで回帰確認する。成功条件にはbackendコンテナ内部の`/health`応答を含める。
9. dev確認後にだけDocker groupから開発ユーザー／runnerを外し、新しいログインセッションでDocker socketが直接読めないことを確認する。
10. stableは、GitHub `stable` Environmentのrequired reviewer承認と別途承認されたメンテナンス時間が揃った時だけ移行する。`main`へのpushはstableを自動デプロイしない。

## 設置対象

| リポジトリ上のテンプレート | root上の設置先 | 所有者・mode |
| --- | --- | --- |
| `libexec/receipt-deploy` | `/usr/local/libexec/receipt-deploy` | root:root / 0750 |
| `libexec/receipt-backup` | `/usr/local/libexec/receipt-backup` | root:root / 0750 |
| `libexec/receipt-offsite-backup` | `/usr/local/libexec/receipt-offsite-backup` | root:root / 0750 |
| `libexec/receipt-offsite-verify` | `/usr/local/libexec/receipt-offsite-verify` | root:root / 0750 |
| `libexec/receipt-register-offsite-credentials` | `/usr/local/libexec/receipt-register-offsite-credentials` | root:root / 0750 |
| `libexec/receipt-restore` | `/usr/local/libexec/receipt-restore` | root:root / 0750 |
| `libexec/receipt-rotate-invitation-codes` | `/usr/local/libexec/receipt-rotate-invitation-codes` | root:root / 0750 |
| `libexec/receipt-rollback-invitation-codes` | `/usr/local/libexec/receipt-rollback-invitation-codes` | root:root / 0750 |
| `units/*.service`, `units/*.timer` | `/etc/systemd/system/` | root:root / 0644 |
| `config/{dev,stable}.env.example` | `/etc/receipt-ai-app/{dev,stable}.env` | root:root / 0600 |
| `config/offsite-{dev,stable}.env.example` | `/etc/receipt-ai-app/offsite-{dev,stable}.env` | root:root / 0600 |
| `sudoers.d/receipt-deploy` | `/etc/sudoers.d/receipt-deploy` | root:root / 0440 |

credentialの論理名は、deployでは`backend_database_url`、`backend_jwt_secret`、`backend_totp_encryption_key`、`backend_gemini_api_key`、`backend_ai_budget_discord_webhook`、`backend_smtp_user`、`backend_smtp_password`、`backend_smtp_from`、`postgres_password`、backupでは`db_password`、`backup_discord_webhook_url`に固定する。devとstableはcredentialを共有しない。TOTPの暗号化・復号は`backend_totp_encryption_key`だけを使用し、JWT鍵をTOTP用途へ渡さない。

Cloudflare R2オフサイトbackupは`r2_access_key_id`、`r2_secret_access_key`、`rclone_crypt_password`、`rclone_crypt_salt`を環境別encrypted credentialとして使用する。後者2つはrcloneの`obscure`形式で登録し、平文のcrypt鍵・rclone設定ファイルを永続化しない。R2 endpointとbucket名は秘密値ではないが、root所有`offsite-{env}.env`だけへ置き、Git・Issue・通知へ実値を記録しない。

R2のS3互換APIは、新規objectへのupload直後にrcloneの追加`HEAD`へ501を返すことがある。そのためoffsite backup helperは`no_head = true`でpost-upload HEADだけを抑止する。crypt remoteではlocalと共通hashを比較できないため、送信直後は`rclone check --download`でremoteを復号しながらlocal artifactと実データを照合する。これは送信成功だけを復旧可能性と扱うものではない。manifestは最後に送信し、別の`receipt-offsite-verify-{env}.service`が復号後のmanifest SHA-256、gzip、uploads archive構造を検証する。

R2 credentialの初回登録は、root所有で設置した`receipt-register-offsite-credentials {dev|stable}`だけを使う。このhelperは4値を非表示入力で受け取り、`rclone obscure -`の標準入力と`systemd-creds encrypt`の標準入力だけを経由してencrypted credentialにする。既存credentialは上書きしない。入力前にcrypt passwordとcrypt saltを異なる値として暗号化された復旧キットへ保管し、値自体を端末表示・Git・Issue・shell履歴へ残さない。

R2読み戻し検証は`receipt-offsite-verify-{dev,stable}.service`を手動起動する。helperはcrypt remote上の最新の**完了世代**（`database.sql.gz`、`uploads.tar.gz`、`manifest.json`が厳密にそろう世代）だけを`/run`配下のroot専用一時領域へ読み戻す。manifestの環境・時刻・サイズ・SHA-256、gzip、uploads archive構造を検査し、終了時に一時ファイルとrclone設定を削除する。DB、uploads、Valkey、コンテナ、R2上のobjectは変更しない。復元操作ではなく、オフサイトバックアップが復号・検証できることを確かめるための手動検査である。

deploy unitは`RuntimeDirectoryPreserve=yes`で、稼働中コンテナが参照する最新世代を同一boot中は保持する。host再起動後にもroot管理コンテナを復旧する運用にする場合は、devでの回帰確認後に人間が`receipt-deploy-*.service`をenableし、Docker起動後に固定refから再デプロイされることを確認する。enableはテンプレートの変更だけでは有効化されない。

deployはDBとValkey（サービス名`redis`）を現在の秘密ファイル世代で強制再作成してからhealthcheckを待つ。これは失効した`/run`上のbind mountを持つ旧DBコンテナを起動しないためであり、`/var/lib/receipt-ai-app/{env}`の永続データは削除しない。

root管理backupは`/var/lib/receipt-ai-app/{env}/uploads`をアーカイブする。DBまたはuploadsのどちらかが失敗した場合、通知後に非0で終了するためsystemdは成功扱いにしない。

## 緊急復旧

DB・uploadsの復旧は、通常運用の操作ではない。対象環境、対象バックアップ時刻、停止時間、作業担当者、復旧担当者を人間が承認したメンテナンス時間にだけ実施する。詳細な開始条件と受入確認は[docs/restore-manual.md](../../docs/restore-manual.md)を正とする。

root管理restore helperは、固定した`dev`または`stable`、バックアップの時刻形式、明示確認語だけを受け取る。任意パス・任意コンテナ名・平文`.env`を受け取らない。実行前に新しいroot管理backupを作成し、DB dumpとuploads archiveを検査する。復元後はValkeyを空にし、PostgreSQLの`ReceiptAnalysisJob`台帳から未完了ジョブを復旧する。

途中失敗時は自動ロールバックやコンテナ再開をしない。復旧担当者が停止状態、事前backup、退避済みuploadsを確認して次の判断を行う。helperが退避する`uploads`は明示承認なしに削除しない。

## ロールバックと停止条件

- dev移行中にDB接続、TOTP、ログイン、レシート解析、通知、バックアップのいずれかが失敗した場合、stableへは進めない。
- データコピー後に不整合が見つかった場合、root管理の新しいデータディレクトリを利用せず、旧Composeと旧データへ戻す。旧Secretを表示・転記しない。
- Docker groupを外す前に、root unitでdevの起動、停止、バックアップ、失敗時の復旧を検証できない場合は停止する。
- stable移行前に、利用者通知、停止時間、復旧担当者、バックアップ取得時刻を人間が承認する。

旧ユーザーcron、`~/stable`、GitHub Actionsの旧Secretは、dev／stableの両方で移行と回帰確認を終えるまで削除しない。廃止はIssue #131-3-3で記録して行う。
