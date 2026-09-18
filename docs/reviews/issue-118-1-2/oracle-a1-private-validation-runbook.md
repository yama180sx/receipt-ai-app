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

以下は初回検証のための**簡略・非公開方式**である。VMにはPublic IPを付けるが、受信を作業PCからのTCP 22だけに限定し、アプリportは公開しない。公開前の本番方式では、OCI Bastionとprivate subnetへ移行する。

### 3.1 アカウントとCompartment

1. OCI Free Tier登録時はhome regionを慎重に選ぶ。Always Free A1はhome regionでだけ作成する。
2. OCI Consoleで**Identity & Security → Compartments → Create compartment**を開く。
3. Nameは`recai-validation`、Descriptionは`RecAIpt Oracle A1 private validation`とする。
4. Pay As You Goへのアップグレードは、この検証では選ばない。

### 3.2 Windows作業PCの検証専用SSH鍵

Windows PowerShellで以下を実行する。秘密鍵の内容は表示・共有しない。最後のコマンドは**公開鍵だけ**をクリップボードへコピーする。

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh" | Out-Null

ssh-keygen -t ed25519 `
  -f "$env:USERPROFILE\.ssh\receipt-oci-validation" `
  -C "receipt-oci-validation"

Get-Content "$env:USERPROFILE\.ssh\receipt-oci-validation.pub" | Set-Clipboard
```

パスフレーズは設定してよい。`receipt-oci-validation`（拡張子なし）の秘密鍵はPCだけに保管し、OCI Console、VM、Git、チャットへ置かない。

### 3.3 VCN

1. **Networking → Virtual cloud networks**を開き、Compartmentを`recai-validation`へ切り替える。
2. **Start VCN Wizard → VCN with Internet Connectivity**を選ぶ。
3. Nameを`recai-validation-vcn`とし、CIDRなどは既定値のまま作成する。
4. ここではTCP 80、443、3000、5432、6379の受信ルールを追加しない。

### 3.4 Network Security Group（NSG）

1. 作成したVCNのSecurityタブから**Network Security Groups → Create Network Security Group**を開く。
2. Nameを`recai-validation-admin`として作成する。
3. 作成したNSGに受信ルールを1件だけ追加する。

| 項目 | 設定 |
| --- | --- |
| Direction | Ingress |
| Source type | CIDR |
| Source CIDR | 作業PCの現在のグローバルIPに`/32`を付けた値 |
| IP protocol | TCP |
| Destination port range | `22` |
| Description | `temporary validation SSH only` |

作業PCのグローバルIPはブラウザで確認する。値はrunbook、Issue、チャットへ残さない。

### 3.5 A1 VM

1. **Compute → Instances → Create instance**を開き、Compartmentを`recai-validation`にする。
2. Nameを`recai-a1-validation`とする。
3. Imageは**Oracle Linux 9**で`Always Free Eligible`表示を確認する。
4. **Change shape → Ampere → VM.Standard.A1.Flex**を選ぶ。
5. OCPUを`2`、Memoryを`12 GB`以下に設定する。これはAlways FreeのA1合計上限内である。
6. Networkingでは作成済みのVCNとPublic Subnetを選び、Public IPv4を割り当てる。
7. Advanced optionsのNetwork Security Groupsで`recai-validation-admin`を選ぶ。
8. SSH keysは**Paste public keys**を選び、3.2でクリップボードへコピーした公開鍵を貼り付ける。
9. Boot Volumeは既定の50GBのままとし、追加Block Volumeを作成しない。
10. ReviewでAlways Free対象のshape・image・容量であることを確認してからCreateする。

`Out of host capacity`が表示された場合、課金shapeへ変更しない。Availability Domainを変えるか、時間を置いて再試行する。

### 3.6 Security Listの全開SSHを除去

NSGがVMのPrimary VNICへ適用されていることを確認してから、VM → Primary VNIC → Subnet → Security Listを開く。次のような既定ルールがあれば削除または無効化する。

```text
Source: 0.0.0.0/0
Protocol: TCP
Destination port: 22
```

Security ListとNSGの許可は合算される。NSGだけを作っても、Security Listの`0.0.0.0/0:22`が残ればSSHは全世界から到達できる。

### 3.7 作成完了の確認

- [ ] VMは`Running`
- [ ] Oracle Linux 9 / ARM64、A1 Flex、2 OCPU・12GB以下
- [ ] Public IPはあるが、受信許可は作業PCIPからのTCP 22だけ
- [ ] TCP 80、443、3000、5432、6379の受信許可がない
- [ ] Docker、Git clone、credential、実利用データはまだVMへ置いていない

Public IPを使う暫定方式では、Bastionの代わりにTCP 22を作業PCの単一CIDRへ限定する。検証完了後はPublic IPまたはTCP 22受信ルールを削除する。

## 4. VMへの接続と事前確認

この初回検証では、作業PCのIPに限定したTCP 22で直接SSHする。鍵パスとVMのPublic IPは作業PCだけで扱い、Issue・チャット・Gitへ転記しない。

```powershell
ssh -i "$env:USERPROFILE\.ssh\receipt-oci-validation" opc@<oracle-validation-public-ip>
```

`<oracle-validation-public-ip>`はOCI ConsoleのVM詳細からローカルで確認する。公開前の方式へ移る時は、この直接SSHを廃止し、OCI Bastionのport-forwarding sessionまたはVPNへ移行する。

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

期待値は、backend health成功、db/Valkey（サービス名`redis`） healthy、かつhost listenは`127.0.0.1:<WEB_PORT>`だけである。3000、5432、6379、全IP向け80/443のlistenがあれば停止して設定を見直す。

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
