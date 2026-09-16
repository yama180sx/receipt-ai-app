# Issue #118-1-2: Oracle A1 ARM64 非公開実機検証手順

作成日: 2026-09-16

## 1. 目的と安全境界

この手順は、Oracle Cloud Always Free Ampere A1上でRecAIptの最小本番ComposeがARM64として動作するかを確認する。**利用者公開、実利用データの移送、DNS、TLSは行わない。**

検証対象は新規の空PostgreSQL、検証専用uploads、検証専用credentialに限定する。T320 dev/stableのDB、uploads、encrypted credential、`stable.env`をOCIへ複写してはならない。

アプリのWeb portは`127.0.0.1`だけにbindする。画面確認にはOCI Bastionまたは接続元IPを限定したSSHを使い、SSH local port forwardを利用する。

## 2. 作成前の人間チェック

- [ ] OCI Consoleのhome regionでA1容量を確保できることを確認した。Always Free A1の容量不足時は、待機またはAvailability Domain変更を選び、課金リソースへ切り替えない。
- [ ] 新しいSSH鍵ペアを検証専用に作成した。秘密鍵はGit・チャット・OCI VMへ置かない。
- [ ] 管理経路はOCI Bastionを第一候補にした。暫定的にPublic IPを使う場合でも、NSGのTCP 22は作業PCの現在のグローバルIP CIDRだけに限定する。
- [ ] NSGとSecurity Listの両方を確認し、`0.0.0.0/0`からのTCP 22、80、443、3000、5432、6379を許可していない。
- [ ] まだ80/443の受信ルールを追加していない。
- [ ] A1上で使用するGemini API key、SMTP、Discord、JWT、TOTP、DB passwordはすべて**検証専用に新規発行**する方針を決めた。値を手順書、端末履歴、Git、チャットへ記録しない。

OCIではSecurity Listより個別VNICへ適用できるNSGが推奨される。Bastionを使う場合、A1 UbuntuではManaged SSHではなくport-forwarding sessionを選ぶ。

## 3. OCI Consoleで作成するもの

人間がOCI Consoleから以下を作成する。ここではOCID、IPアドレス、鍵パス、秘密値を貼り付けない。

1. home regionに検証専用compartmentを作成する。
2. VCNとprivate subnetを作成し、A1 VMは可能ならPublic IPなしで配置する。
3. OCI Bastionを作成し、作業PCのグローバルIP CIDRだけをallowlistへ登録する。
4. Ubuntu ARM64またはOracle Linux ARM64のA1 VMを作成する。Always Freeの合計上限を超えないshapeを選ぶ。
5. 対象VM用NSGを作成する。受信はBastionからのTCP 22だけとし、TCP 80、443、3000、5432、6379は追加しない。
6. OS更新とDocker導入に必要な外向き通信を、NAT Gateway等で許可する。不要な受信ルールは追加しない。

Public IPを使う暫定方式では、Bastionの代わりにTCP 22を作業PCの単一CIDRへ限定する。検証完了後はPublic IPまたはTCP 22受信ルールを削除する。

## 4. VMへの接続と事前確認

OCI Consoleが表示するBastion用のSSHコマンドを使用する。Bastionの接続コマンドはConsoleからコピーし、鍵・OCID・IPをこの手順書やチャットへ転記しない。

VMに接続後、次だけを確認する。

```bash
uname -m
getconf LONG_BIT
docker --version
docker compose version
```

合格値は`aarch64`または`arm64`、`64`、DockerとDocker Composeのバージョン表示である。Docker未導入なら、使用するOS公式手順に従って導入する。Docker socketへの恒久的な一般ユーザー権限付与はせず、必要な管理操作だけ`sudo`で行う。

## 5. ソースと永続ディレクトリ

検証用の空ディレクトリをroot管理で作る。既存T320パスをマウント・共有しない。

```bash
sudo install -d -o root -g root -m 0750 /srv/receipt-ai-app/oracle-validation
sudo install -d -o root -g root -m 0750 /var/lib/receipt-ai-app/oracle-validation/uploads
sudo install -d -o root -g root -m 0700 /var/lib/receipt-ai-app/oracle-validation/pgdata
sudo install -d -o root -g root -m 0700 /var/lib/receipt-ai-app/oracle-validation/valkeydata
sudo chown 1000:1000 /var/lib/receipt-ai-app/oracle-validation/uploads
sudo chown 999:root /var/lib/receipt-ai-app/oracle-validation/pgdata /var/lib/receipt-ai-app/oracle-validation/valkeydata
```

次に、PR #734を含む承認済みdevelopコミットを取得する。検証対象の完全長SHAは人間が確認して選び、作業記録には値ではなく「承認済みdevelop SHA」とだけ残してもよい。

```bash
sudo git clone https://github.com/yama180sx/receipt-ai-app.git /srv/receipt-ai-app/oracle-validation/app
sudo git -C /srv/receipt-ai-app/oracle-validation/app checkout --detach <approved-develop-full-sha>
sudo git -C /srv/receipt-ai-app/oracle-validation/app status --short
```

`status --short`が空であることを確認する。`<approved-develop-full-sha>`には秘密値を入れない。

## 6. 検証専用の設定・credential

`docker-compose.production.yml`は次の9個のSecret論理名を必要とする。

| 用途 | Compose Secret名 | 方針 |
| --- | --- | --- |
| DB接続URL | `backend_database_url` | 検証用DB passwordで作成する。 |
| JWT | `backend_jwt_secret` | 検証専用に新規生成する。 |
| TOTP鍵 | `backend_totp_encryption_key` | 検証専用に新規生成する。 |
| Gemini | `backend_gemini_api_key` | 検証専用のGoogle Cloud project/keyを作る。 |
| AI予算Discord | `backend_ai_budget_discord_webhook` | 検証専用通知先を使う。 |
| SMTP user/password/from | `backend_smtp_user` / `backend_smtp_password` / `backend_smtp_from` | 検証専用の送信設定を使う。 |
| PostgreSQL初期password | `postgres_password` | DB接続URLと同一の検証用passwordにする。 |

OCI Vaultでは上記の論理名ごとにSecretを作成する。VM上ではrootだけが読める一時ディレクトリへ展開し、Compose起動後に削除する。値を`echo`、プロセス引数、`.env`、Git、チャットへ出してはならない。

この展開方法はOCI Vaultの認証方式（Instance Principalまたは短期利用者権限）を確定してから別途レビューする。T320の`systemd-creds` encrypted credentialはホスト依存のため、OCIで再利用しない。

非Secret設定も、公開前の検証用に別ファイルでrootのみが作成する。少なくとも`ENV_NAME`、`COMPOSE_PROJECT_NAME`、`WEB_PORT`、`DB_USER`、`DB_NAME`、`RECAIPT_UPLOADS_DIR`、`RECAIPT_PGDATA_DIR`、`RECAIPT_QUEUE_DATA_DIR`、`RECAIPT_BACKEND_ENV_FILE`を設定する。`CORS_ORIGIN`は検証時のlocalhost originだけに限定する。

## 7. 起動と確認

一時Secret展開と非Secret設定を完了したroot管理者だけが、次を実行する。`<...>`には実パスをローカルで補い、値を共有しない。

```bash
cd /srv/receipt-ai-app/oracle-validation/app
sudo docker compose \
  --env-file <root-only-compose-env> \
  -f docker-compose.production.yml \
  -f docker-compose.secrets.yml \
  config --quiet

sudo docker compose \
  --env-file <root-only-compose-env> \
  -f docker-compose.production.yml \
  -f docker-compose.secrets.yml \
  build

sudo docker compose \
  --env-file <root-only-compose-env> \
  -f docker-compose.production.yml \
  -f docker-compose.secrets.yml \
  up -d --wait
```

続けて、値を出さない確認だけを行う。

```bash
sudo docker compose --env-file <root-only-compose-env> \
  -f docker-compose.production.yml -f docker-compose.secrets.yml ps

sudo docker compose --env-file <root-only-compose-env> \
  -f docker-compose.production.yml -f docker-compose.secrets.yml \
  exec -T backend node -e 'fetch("http://127.0.0.1:3000/health").then(r => process.exit(r.ok ? 0 : 1))'

sudo ss -ltnp | grep -E ':(80|443|3000|5432|6379)\\b' || true
```

期待値は、backend health成功、db/redis healthy、かつhost listenは`127.0.0.1:<WEB_PORT>`だけである。3000、5432、6379、全IP向け80/443のlistenがあれば停止して設定を見直す。

画面は作業PCからSSH local forward経由でだけ開く。

```bash
ssh -N -L <local-web-port>:127.0.0.1:<oracle-web-port> <oracle-admin-connection>
```

別ブラウザで`http://127.0.0.1:<local-web-port>`を開く。これはTLS受入ではなく、ARM64上のWeb/API疎通確認だけである。

## 8. バックアップ・復元の最小確認

検証用の空データまたは明示的に投入したテストデータだけで、DB dumpとuploads archiveを作成する。OCI内だけに残さず、Issue #57の方針が確定するまで外部保管先を正式なバックアップと見なさない。

復元テストは、起動停止、DB/ uploads復元、再起動、health確認までを行う。実利用データは使用しない。

## 9. 終了判定と後片付け

合格時は、Issueへ次だけを記録する。

- ARM64確認結果、image build、health、migration、Web/API、テスト用レシート解析、backup/restoreの成功・失敗
- 外部公開portがないこと
- OCI課金リソースを作成していないこと

秘密値、URL、IP、OCID、SSHコマンド、実利用データ、ログ全文は記録しない。

失敗時はコンテナログから秘密値を除外した失敗分類だけを残す。検証終了後は、OCI Vaultの検証専用Secret、通知先、Gemini key、VM、Public IPまたは暫定SSH受信ルールを人間が順に廃止する。

## 10. 公式参照

- [OCI Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [OCI Bastion port forwarding](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/connect-port-forwarding.htm)
- [OCI Network Security Groupの考え方](https://docs.oracle.com/en/solutions/oci-network-deployment/learn-network-security1.html)
- [A1 UbuntuでのBastion制約](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/known-issues.htm)
