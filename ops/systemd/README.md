# Issue #131-3-2 root管理デプロイ境界

このディレクトリは、T320へ**人間がrootとして**設置する固定ヘルパー、systemd unit、非機密設定、sudoersのテンプレートである。ここに実Secret、実IP、実ポート、暗号化済みcredentialを保存してはならない。

## 目的と境界

- root所有の `/srv/receipt-ai-app/{dev,stable}` だけをruntimeソースとする。
- root unitは公開リポジトリの固定ref（dev=`develop`、stable=`main`）だけを取得する。
- runner／開発ユーザーの `~/dev`、`~/stable`、Actions workspaceはroot unitの入力にしない。
- runnerに許可するのは、sudoersで固定したunit開始だけである。Docker socket、任意のsystemctl操作、任意パス・任意refは許可しない。
- app Secretはsystemd encrypted credentialからruntimeのroot専用一時ディレクトリへコピーする。Git、ワークツリー、`.env`、frontend、runner環境には書かない。

`docker-compose.runtime.yml` は開発用Composeと併用しない。実行用imageを作り、ユーザー所有ソースのbind mountを、root管理のimageと`/var/lib/receipt-ai-app/{env}`の永続データへ置換する。

## root適用前の確認

以下は **Issue #131-3-3でdevへ移行する時だけ**、人間がrootとして実施する。Issue #131-3-2のPRをマージしただけでは実行しない。

1. 作業ツリー上で `scripts/security/verify-root-deploy-contract.sh` を成功させる。
2. unitテンプレートを `systemd-analyze verify` で確認する。
3. `ops/systemd/config/*.env.example` を基に、root所有・`0600`の `/etc/receipt-ai-app/{dev,stable}.env` を作成する。許可された非機密キー以外を追加しない。
4. root専用の `/etc/receipt-ai-app/credentials/{dev,stable}` に、各環境で別々のencrypted credentialを作成する。平文は端末表示、Git、作業ディレクトリ、shell履歴へ残さない。
5. helper、unit、sudoersをroot所有の所定位置へinstallし、`systemctl daemon-reload`する。
6. 合成credentialでunitの読取り・失敗時の値なしエラーを確認する。
7. 現行devのDB・Redis・uploadsを停止時間内にroot管理の永続領域へ移し、dev unitで回帰確認する。
8. dev確認後にだけDocker groupから開発ユーザー／runnerを外し、新しいログインセッションでDocker socketが直接読めないことを確認する。
9. stableは別途承認されたメンテナンス時間に移行する。

## 設置対象

| リポジトリ上のテンプレート | root上の設置先 | 所有者・mode |
| --- | --- | --- |
| `libexec/receipt-deploy` | `/usr/local/libexec/receipt-deploy` | root:root / 0750 |
| `libexec/receipt-backup` | `/usr/local/libexec/receipt-backup` | root:root / 0750 |
| `units/*.service`, `units/*.timer` | `/etc/systemd/system/` | root:root / 0644 |
| `config/{dev,stable}.env.example` | `/etc/receipt-ai-app/{dev,stable}.env` | root:root / 0600 |
| `sudoers.d/receipt-deploy` | `/etc/sudoers.d/receipt-deploy` | root:root / 0440 |

credentialの論理名は、deployでは`backend_database_url`、`backend_jwt_secret`、`backend_gemini_api_key`、`backend_ai_budget_discord_webhook`、`backend_smtp_user`、`backend_smtp_password`、`backend_smtp_from`、`postgres_password`、backupでは`db_password`、`backup_discord_webhook_url`に固定する。devとstableはcredentialを共有しない。

## ロールバックと停止条件

- dev移行中にDB接続、TOTP、ログイン、レシート解析、通知、バックアップのいずれかが失敗した場合、stableへは進めない。
- データコピー後に不整合が見つかった場合、root管理の新しいデータディレクトリを利用せず、旧Composeと旧データへ戻す。旧Secretを表示・転記しない。
- Docker groupを外す前に、root unitでdevの起動、停止、バックアップ、失敗時の復旧を検証できない場合は停止する。
- stable移行前に、利用者通知、停止時間、復旧担当者、バックアップ取得時刻を人間が承認する。

旧ユーザーcron、`~/stable`、GitHub Actionsの旧Secretは、dev／stableの両方で移行と回帰確認を終えるまで削除しない。廃止はIssue #131-3-3で記録して行う。
