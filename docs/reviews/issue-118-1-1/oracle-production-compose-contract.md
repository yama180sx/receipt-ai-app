# Issue #118-1-1: Oracle ARM64 限定公開用Compose契約

作成日: 2026-09-16
対象: `docker-compose.production.yml`

## 1. 目的と非目的

このComposeは、Oracle Cloud Always Free Ampere A1を含むARM64 Linuxで、RecAIptを**限定公開できるか検証するための最小本番構成**である。

対象は、backend、Web frontend、PostgreSQL、Valkeyだけである。既存T320のdev/stable root管理runtimeを変更・置換しない。

次はこのIssueの対象外であり、Composeを実行しただけでは実現しない。

- OCIアカウント、VCN、NSG、DNS、独自ドメイン、TLS証明書の作成
- インターネット公開または利用者データの移送
- オフサイトバックアップの実装（Issue #57）
- 招待コード・ログイン・TOTPのレート制限など一般公開向け対策

## 2. 構成

```text
Internet
  -> HTTPS reverse proxy（後続のOCI公開フェーズ）
      -> frontend:80
          -> backend:3000 (/api)
              -> db:5432       [private network]
              -> redis:6379    [Valkey、private network]
```

Composeは`frontend`だけに`127.0.0.1:${WEB_PORT}:80`をbindする。backend、db、Valkey（サービス名`redis`）にはhost portを定義しない。限定公開前はSSH port forwardでだけ確認し、TLS終端前に、このportをインターネットへ直接公開してはならない。

`private` networkはinternal networkであり、dbとValkeyはbackendだけが利用する。backendはGemini、SMTP、Discordへ外向き通信を行うため、frontendと共有する`edge` networkにも接続する。

## 3. ARM64ビルド契約

- backendは`backend/Dockerfile.runtime`で対象ホスト上に`npm ci`、`prisma generate`を実行する。x64で作成した`node_modules`は持ち込まない。
- frontendは`frontend/Dockerfile.web`で対象ホスト上にExpo Webをbuildする。
- ValkeyはAMD64/ARM64を含むmanifestの完全digestを使用する。
- PostgreSQL、Node、Nginxは公式multi-architecture imageを使用する。OCI実機でbuild・起動・Prisma migration・レシート解析まで確認するまでは互換性を確定しない。

## 4. 永続データと秘密情報

| 対象 | 必須ホストパス変数 | コンテナ内パス | 備考 |
| --- | --- | --- | --- |
| uploads | `RECAIPT_UPLOADS_DIR` | `/app/uploads` | 画像の正本。バックアップ対象。 |
| PostgreSQL | `RECAIPT_PGDATA_DIR` | `/var/lib/postgresql` | DB正本。バックアップ対象。 |
| Valkey | `RECAIPT_QUEUE_DATA_DIR` | `/data` | 派生キュー。喪失時はDB台帳から復元可能。 |

秘密値は`docker-compose.secrets.yml`の論理名で、host上の一時`RECAIPT_SECRETS_DIR`からCompose Secretとして対象サービスへだけ渡す。T320のencrypted credentialをOCIへコピーしない。OCI側ではOCI Vault等のSecret管理から、同じ論理名の一時ファイルをroot専用で生成する設計にする。

## 5. 実機検証の合格条件

1. A1 ARM64上で`docker compose ... build`が成功する。
2. dbとValkeyのhealthcheck、backend `/health`、Prisma migrationが成功する。
3. TOTPログイン、レシート登録・解析・確認、通知を確認する。
4. DB dumpとuploads archiveを別保管先へ作成し、復元手順を一度確認する。
5. hostの公開portがfrontendだけであり、OCI NSGでもHTTPS以外を公開しないことを確認する。

## 6. 実行前の静的確認

```bash
bash scripts/security/test-production-compose-contract.sh
```

このテストはダミーの空Secretファイルだけで`docker compose config`を検証する。実credential、Docker daemon、OCI資源は操作しない。
