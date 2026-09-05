# Issue起票用メモ: 環境固有設定の分離とT320デプロイの安全化

作成日: 2026-09-05
対象リポジトリ: `yama180sx/receipt-ai-app`

## このメモの用途

本メモは、開発PC上で確認した未コミット差分と、T320への影響範囲を整理したものです。内容を基に [#653 Issue #129](https://github.com/yama180sx/receipt-ai-app/issues/653) を起票済みである。下記の「起票本文案」は記録用として残す。

## 確認した作業ツリーの状態

確認時点で、`main` は `origin/main` と一致しており、未コミット変更は以下のGit追跡ファイルだけでした。

| ファイル | Git管理 | 未コミット変更 |
|---|---:|---:|
| `docker-compose.yml` | はい | はい |
| `scripts/backup.sh` | はい | はい |
| `setup-env.sh` | はい | はい |

この時点ではコミットもpushもされていないため、GitHubおよびT320へは未反映です。

## T320へ反映される経路

`.github/workflows/deploy.yml` は `main` へのpushで実行される。

1. T320セルフホステッドrunner（`[self-hosted, linux, t320]`）がコードをcheckoutする
2. `~/stable/receipt-ai-app` へ `rsync --delete` で同期する
3. stable用`.env`をGitHub Secrets / Variablesから生成する
4. DB・Redisを起動してPrisma migrationを実行する
5. `docker compose up -d --build --remove-orphans` を実行する

したがって、対象ファイルを`main`へpushするとT320のstable環境へ反映される。

## 現在の未コミット差分と影響

### `docker-compose.yml`

- backendの `${BACKEND_PORT}:3000` 公開を削除
- PostgreSQLの `${DB_PORT}:5432` 公開を削除
- Redisの `${REDIS_PORT}:6379` 公開を削除

影響:

- T320のホストからbackend API（例: `http://T320_IP:3000`）へ直接到達できなくなる
- DB / Redisのホスト公開もなくなる
- frontendのNginx経由の`/api`は、Compose内部ネットワークを使うため維持される想定
- Expo、監視、手動運用、外部クライアントが直接backendポートを利用していないか確認が必要

### `scripts/backup.sh`

- stableバックアップ先を`/mnt/raid_1t/backups/receipt-app`から`/mnt/receipt-backups/receipt-app`へ変更
- Discord Webhook URLを空文字列にして通知を無効化

影響:

- stableのcronは`~/stable/receipt-ai-app/scripts/backup.sh stable`を実行するため、次回デプロイ後には新しい保存先が使われる
- 新保存先が未マウント・未作成・書込み不可なら、バックアップが失敗する
- Discord通知が届かなくなる
- 既存の運用資料・復旧手順は`/mnt/raid_1t/backups/receipt-app`を前提としており、不整合になる

### `setup-env.sh`

- `HOST_IP`を`192.168.1.32`から`192.168.1.30`へ変更

影響:

- T320で`./setup-env.sh stable`を手動実行した場合に反映される
- 通常のGitHub Actions stableデプロイでは、workflowがGitHub Secretsの`HOST_IP`を使って`.env`を生成するため、この変更単独ではstableデプロイへ反映されない
- IPをGit管理ファイルへ固定する方式は、マシン／環境ごとの差異に向かない

## T320での事前確認コマンド（読み取り中心）

```bash
cd ~/stable/receipt-ai-app

# 稼働中コンテナと、ホストへ公開しているポート
docker compose ps
docker ps --format 'table {{.Names}}\t{{.Ports}}'

# 現在のbackend直接アクセスの有無
curl -sS -o /dev/null -w 'localhost:3000 -> HTTP %{http_code}\n' http://localhost:3000/health

# 旧・新バックアップ先、容量
ls -ld /mnt/raid_1t/backups/receipt-app /mnt/receipt-backups/receipt-app 2>&1
df -h /mnt/raid_1t /mnt/receipt-backups 2>&1

# 実際に登録済みのstableバックアップcron
crontab -l | grep 'backup.sh stable'

# T320が現在使うIP
grep '^HOST_IP=' .env
```

## 方針

コードに含める「共通のサービス定義」と、サーバー／環境にのみ属する値を分離する。

| 種別 | Git管理 | 環境ごとの設定先 |
|---|---|---|
| Composeサービス・内部ネットワーク | `docker-compose.yml` | 不要 |
| 開発時のみ必要なAPI / DB / Redis公開 | `docker-compose.dev.yml`等 | dev起動時のみ適用 |
| T320のIP・公開ポート | 直接固定しない | GitHub Secrets / Variables、ローカルのGit管理外設定 |
| バックアップ保存先 | 直接固定しない | `BACKUP_DIR`環境変数 |
| Discord Webhook | 絶対に含めない | GitHub SecretまたはT320の秘密設定 |
| DBパスワード・JWT・AIキー | 絶対に含めない | GitHub SecretまたはGit管理外の秘密設定 |

`docker-compose.yml`は本番共通の安全な定義とし、開発PCでだけ必要なポート公開をCompose overrideへ分離する。T320のstable値はGitHub ActionsがSecrets / Variablesから注入し、ローカルはGit管理外の`.env.secret`等から与える。

## セキュリティ上の注意

過去の`backup.sh`にはDiscord Webhook URLが記録されていた。公開リポジトリ化を検討する場合、そのWebhookがまだ有効ならDiscord側で失効・再発行する。

## 起票本文案

### タイトル

```text
infra: 環境固有設定をGit管理コードから分離し、T320デプロイを安全化する
```

### 本文

```markdown
## 背景

公開運用を見据え、T320 固有のネットワーク・保存先・通知設定をGit管理下のコードへ直接固定しない構成にする。

現状、以下の運用値が `docker-compose.yml`、`setup-env.sh`、`scripts/backup.sh` に混在している。

- backend / PostgreSQL / Redis のホスト公開ポート
- T320 の LAN IP
- stable バックアップ保存先
- Discord Webhook
- stable / dev ごとの環境差分

`main` への push はGitHub ActionsによりT320へ自動デプロイされるため、ローカル環境向けの変更が本番へ意図せず反映されるリスクがある。

## 目的

Git管理するサービス定義と、マシン・環境ごとの設定／秘密情報を分離し、安全にコミット・デプロイできるようにする。

## 対応案

- [ ] `docker-compose.yml` を本番共通の最小・安全な構成に整理する
  - backend / DB / Redis は原則ホスト公開しない
  - frontend のみ必要な公開ポートを持つ
- [ ] 開発環境だけのポート公開は `docker-compose.dev.yml` 等のCompose overrideへ分離する
- [ ] `HOST_IP` をハードコードせず、ローカルはGit管理外の設定、stableはGitHub Secrets / Variablesから注入する
- [ ] `BACKUP_DIR` を `scripts/backup.sh` に固定せず、環境変数として注入する
- [ ] Discord WebhookをGit管理対象から除外し、GitHub SecretまたはT320の秘密設定から注入する
- [ ] 過去にコードへ記録されたDiscord Webhookが有効なら、Discord側で失効・再発行する
- [ ] `.env.example`、`setup-env.sh`、GitHub Actions、運用／復旧資料を新構成と整合させる
- [ ] T320で、バックアップ保存先の存在・書込み権限・空き容量、cron、Web/Expo/APIの接続を確認する

## 受け入れ条件

- T320固有のIP・マウント先・通知先・秘密情報を変更しても、Git管理ファイルの編集を必要としない
- `main` デプロイ後もstableのWeb利用、バックアップ、cronが正常に動作する
- 開発環境では必要なデバッグ用ポートを明示的なoverrideでのみ公開できる
- 公開リポジトリに秘密情報・有効なWebhook URLが含まれない
```

## GitHub起票時の補足

Issueは [#653 Issue #129](https://github.com/yama180sx/receipt-ai-app/issues/653) として作成済みである。実装はIssue #128のMacBook構築作業と分離し、T320・開発・公開環境への影響を確認してから着手する。
