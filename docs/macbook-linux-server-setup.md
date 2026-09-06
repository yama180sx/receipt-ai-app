# MacBook（Linux Mint 22.3）へのDocker導入手順

対象Issue: [#652 Issue #128](https://github.com/yama180sx/receipt-ai-app/issues/652)
最終更新: 2026-09-02

この資料は、古いMacBookにLinux Mint 22.3を導入した後、RecAIptのサーバー環境の土台となるDocker EngineとDocker Composeをセットアップする手順である。ここではDocker Desktopを使用しない。

> 実行前提: 以下のコマンドはLinux Mint上のターミナルで実行する。`yamamoto` は作業時のログインユーザー名の例であり、コマンド中の `$USER` は実際にログインしているユーザー名へ自動展開される。

## 1. Dockerの導入

パッケージ情報を更新し、Docker EngineとDocker Compose v2を導入する。

```bash
sudo apt update
sudo apt install docker.io docker-compose-v2
```

導入できたことを確認する。

```bash
docker --version
docker compose version
```

どちらもバージョン情報が表示されれば、導入は完了している。

## 2. Dockerサービスの有効化

OS起動時にDockerが自動起動し、現在のセッションでも開始されるようにする。

```bash
sudo systemctl enable --now docker
```

必要に応じて、稼働状態を確認する。

```bash
systemctl status docker
```

`active (running)` と表示されれば稼働している。終了するには `q` を押す。

## 3. Dockerのユーザー権限設定

現在のログインユーザーを `docker` グループへ追加する。これにより、以後はDockerコマンドを `sudo` なしで実行できる。

```bash
sudo usermod -aG docker $USER
```

この変更は、現在のログインセッションには反映されない。次のいずれかを行う。

1. ログアウトして再ログインする
2. MacBookを再起動する

再ログイン後、グループ設定を確認する。

```bash
groups
```

一覧に `docker` が含まれていれば設定済みである。

## 4. 動作確認

Dockerを `sudo` なしで実行できることを確認する。

```bash
docker run hello-world
```

イメージの取得後にDockerの歓迎メッセージが表示されれば、Dockerの基本環境とユーザー権限設定は完了している。

## 5. キーボード入力の補足

ターミナルで使う `~`（チルダ）はホームディレクトリを表す。例として、次のコマンドは自分のホームディレクトリへ移動する。

```bash
cd ~
```

MacBookの日本語キーボードでは、通常は `Shift` + `^` で `~` を入力できる。Linux Mint側のキーボード配列が日本語106/109キーとして認識されていることが前提となる。

## 6. RecAIptをGitHubから取得

RecAIptのリポジトリをサーバー上へ取得する。

```bash
git clone https://github.com/yama180sx/receipt-ai-app.git
cd receipt-ai-app
```

## 7. 作業進捗

2026-08-23時点で、**「6. RecAIptをGitHubから取得」まで完了**している。次回は、取得したリポジトリでのRecAIpt初回構築から再開する。

2026-08-27時点では、MacBook用のネットワーク設定と秘密情報を確認する前の段階である。`setup-env.sh` には旧サーバーのIPアドレスが固定されているため、実行前にMacBookのIPアドレスを確認し、設定値を見直す。

2026-09-02時点で、MacBookは **stable環境** として構築する方針を決定した。LAN内IPv4アドレスは `192.168.1.30` に固定した。ゲートウェイおよびDNSは `192.168.1.1`、サブネットは `/24`（ネットマスク `255.255.255.0`）を使用する。ゲートウェイと外部IPアドレスへのping、`github.com` のIPv4名前解決がそれぞれ成功した。Docker内部ネットワークの `172.17.0.1` およびIPv6アドレスは、アプリケーションのLAN内アクセス先として使用しない。

同日、既存サーバー `con1010-t320`（`192.168.1.32`）へのSSH接続と、stable環境の設定ファイルの存在を確認した。既存サーバーには `.env.secret` はなく、`.env`、`backend/.env`、`frontend/.env` に設定が分散していた。これらをMacBookのGit管理外の参照用フォルダへ安全にコピーし、`DB_PASS`、`JWT_SECRET`、`GEMINI_API_KEY`、`API_TOKEN` を含むMacBookの `.env.secret` を作成した。値そのものは記録しない。

MacBookの2台目の内蔵SSD（`/dev/sdb1`、約112GB、空き約104GB）をバックアップ専用に使用する。UUID `a1e392cd-2482-40b3-87f5-fc47b31c53ef` を`/etc/fstab`へ登録し、`/mnt/receipt-backups` へマウントした。`/dev/sdb1 /mnt/receipt-backups` としてマウントできることを確認済みである。

MacBook側の `scripts/backup.sh` は、stableバックアップ保存先を `/mnt/receipt-backups/receipt-app` へ変更した。旧サーバーのDiscord通知WebhookはMacBookへ引き継がず、設定値を空にして無効化した。新しいWebhookを発行し、安全な設定方法を整備するまで通知は送信しない。

Dockerイメージのビルド中に `deb.debian.org` を解決できない問題が発生した。MacBook本体のDNSは正常であり、Dockerコンテナだけの名前解決問題と切り分けた。`/etc/docker/daemon.json` にDNSサーバー `192.168.1.1` と `1.1.1.1` を設定してDockerデーモンを再起動後、コンテナ内で `deb.debian.org` の名前解決が成功し、PostgreSQLとRedisもhealthyになった。

データ移行は、**初期データ・設定データのみを選択的に移行する**方針とした。`Receipt`、`Item`、解析ジョブ、AI利用・分類履歴、精算履歴および`backend/uploads`内のレシート画像は移行しない。既存サーバーで行われたカテゴリ、店舗、プロンプト、標準商品分類ルールなどの修正状況を、読み取り専用の監査で確認してから移行対象を確定する。

既存サーバーのDB監査では、テーブル一覧の取得まで完了した。`FamilyGroup`、`FamilyMember`、`Category`、`Store`、`PromptTemplate`、`StandardCategory`、`ProductType`、`StandardProductClassificationRule`などの初期・設定データ候補と、レシート関連の運用データが存在することを確認した。一方、現行コードにある `AiPricingRevision` を含むAI予算関連テーブルは既存DBに存在せず、既存サーバーのDBスキーマが現行コードより前の段階であることを確認した。DBの内容は変更していない。

初期・設定データ候補の件数は、現行リポジトリの初期データ定義と一致した（世帯2、ユーザー5、世帯別カテゴリ21、店舗8、プロンプト4、標準カテゴリ18、商品種別22、標準分類ルール40）。標準分類ルールの監査履歴、世帯別商品辞書、商品分類履歴、レシート、明細はいずれも0件だった。したがって、レシート・画像を除外する移行方針によるデータ欠落はない。個別の値の差分と、世帯・ユーザーのログイン情報を引き継ぐかは、移行実施前に決定する。

世帯・ユーザーのログイン情報を含めて引き継ぐことを決定した。既存サーバーから、世帯、ユーザー、カテゴリ、店舗、プロンプト、標準カテゴリ、商品種別、標準商品分類ルールだけを含む選択的SQLバックアップを作成した。INSERT件数は120件、ファイルサイズは25KBであり、MacBookへ転送後にSHA-256ハッシュが一致することを確認した。MacBookでは `~/migration-from-t320/receipt-initial-data.sql` に所有者だけが読める権限で保持する。既存サーバー上の `/tmp/receipt-initial-data.sql` は転送確認後に削除済みである。

MacBookの空のPostgreSQLへ現行の32件のPrisma migrationを適用後、選択的SQLバックアップを復元した。復元後の件数は世帯2、ユーザー5、カテゴリ21、店舗8、プロンプト4、標準カテゴリ18、商品種別22、標準分類ルール40であり、`Receipt`と`Item`はいずれも0件であることを確認した。

復元直後に `scripts/backup.sh stable` を手動実行し、DBバックアップとアップロード領域バックアップの両方が成功した。バックアップは `/mnt/receipt-backups/receipt-app/` に保存されている。これはMacBookでの初期データ復元後の復元ポイントである。

MacBook側の `docker-compose.yml` では、バックエンド、PostgreSQL、Redisのホスト側ポート公開を削除した。PostgreSQLとRedisはDocker内部ネットワーク上の `5432/tcp`・`6379/tcp` で稼働し、LANからは到達できない。Webフロントエンドを経由する通信だけを利用者向けに公開する方針とする。

2026-09-03時点の中断状態: T320は停止してよい。MacBookには必要な設定、選択的SQLバックアップ、復元直後のバックアップがあり、以後の作業にT320は不要である。一方、MacBookのバックエンドはSharpの配布済みLinuxバイナリが古いCPUの命令要件を満たせず起動できない。SharpのWebAssembly版を依存関係へ追加するか、Sharpをソースからビルドするかの方針決定後に再開する。T320側のデータ・リポジトリは削除せず保持する。

## 8. 次の作業

Docker導入後は、RecAIptの初回構築、秘密情報の配置、サービス起動、バックアップおよび復旧の設定を行う。アプリケーション側の手順は[運用・障害対応](./design/operations.md)を参照する。

### 再開時の準備

既存サーバーから次の情報を**安全に確認**する。秘密値そのものをIssue、チャット、リポジトリへ転記しない。

### 8.1 先に決めること

1. MacBookは既存サーバーを置き換えるのか、開発・検証用として併存させるのかを決める。
2. 作成する環境を `dev` と `stable` のどちらにするかを決める。既存の利用者を切り替える本番環境は `stable`、検証だけなら `dev` を使用する。
3. 既存データ（PostgreSQLとアップロード画像）を移すか、空の環境から始めるかを決める。

既存サーバーを稼働させたままMacBookで検証する間は、両方の環境を同じDBへ接続させず、同じデータへ同時書き込みしない。

#### 初期データのみを移行する場合の扱い

| 区分 | 扱い |
|---|---|
| 初期・設定データ | 既存サーバーの修正状況を監査後に、選択して移行する。候補は世帯・ユーザー、カテゴリ、店舗、プロンプト、標準カテゴリ、商品種別、標準分類ルール、AI単価・予算設定である。 |
| レシート運用データ | 移行しない。`Receipt`、`Item`、按分、精算、解析ジョブ、AI利用・分類履歴、再分類監査、レシート画像を含む。 |
| 初期化用seed | stable環境には実行しない。現行の `prisma:seed` はテスト用レシートを生成するため、この移行方針と一致しない。 |

世帯・ユーザーを引き継ぐかどうかは、ログイン情報を継続するかで決まる。移行対象の確定前に既存DBの件数と初期データの差分を読み取り専用で確認する。

監査の中断地点は、既存DBに実在するテーブルを対象にした件数・差分確認の直前である。次回は、レシート関連テーブルを除いた初期・設定データ候補の件数確認から再開する。

### 8.2 MacBook自身のネットワーク情報

MacBook上で次を実行し、LAN内IPアドレスを確認する。

```bash
hostname -I
```

複数の値が表示された場合は、家庭内ネットワークで他の端末から到達できるIPv4アドレスを選ぶ。既存サーバーのIPはコピーせず、MacBook用の値を使う。

stable環境では、利用者端末、CORS設定、Expo開発サーバー、デプロイ設定などがサーバーのIPアドレスを参照するため、LAN内IPv4アドレスを固定する。MacBookではNetworkManagerの手動IPv4設定により、次の値を設定済みである。

| 項目 | 設定値 |
|---|---|
| IPv4アドレス | `192.168.1.30` |
| ネットマスク | `255.255.255.0`（`/24`） |
| ゲートウェイ | `192.168.1.1` |
| DNS | `192.168.1.1` |

設定後に `hostname -I`、`ping -c 3 192.168.1.1`、`ping -c 3 1.1.1.1`、`getent ahostsv4 github.com | head -n 1` を実行し、固定IP・ルーター・外部ネットワーク・DNS名前解決を確認した。

Linux側でIPを手動固定する場合は、DHCPの割当範囲・ゲートウェイ・DNSとの整合を確認してから行う。ルーター側のDHCP予約とLinux側の手動固定を同時に設定しない。

### 8.3 バックアップ用ストレージ

バックアップはMacBookの2台目の内蔵SSDを使用する。既存サーバーの`/mnt/raid_1t`は使用しない。

| 項目 | 設定値 |
|---|---|
| デバイス | `/dev/sdb1` |
| ファイルシステム | ext4 |
| UUID | `a1e392cd-2482-40b3-87f5-fc47b31c53ef` |
| 恒久マウント先 | `/mnt/receipt-backups` |
| 空き容量（設定時） | 約104GB |

`/etc/fstab` の登録内容:

```fstab
UUID=a1e392cd-2482-40b3-87f5-fc47b31c53ef /mnt/receipt-backups ext4 defaults,nofail 0 2
```

`/etc/fstab`の変更後は、次を実行してsystemdへ反映する。

```bash
sudo systemctl daemon-reload
```

### 8.4 DockerのDNS設定

Dockerコンテナからパッケージ取得先を解決できるよう、`/etc/docker/daemon.json` に次を設定した。

```json
{
  "dns": ["192.168.1.1", "1.1.1.1"]
}
```

設定後は `sudo systemctl restart docker` を実行する。`docker run --rm --entrypoint /bin/sh redis:7-alpine -c 'nslookup deb.debian.org'` でDNS解決を確認する。

### 8.5 既存サーバーから確認する設定の一覧

既存サーバー上の `~/stable/receipt-ai-app`（または実際の配置先）で確認する。以下は値を表示せず、設定ファイルの存在だけを確認するコマンドである。

```bash
cd ~/stable/receipt-ai-app
for file in .env.secret .env backend/.env frontend/.env; do
  test -f "$file" && echo "$file: あり" || echo "$file: なし"
done
```

| 区分 | 項目・対象 | 移行時の扱い |
|---|---|---|
| 非秘密設定 | 環境種別、ポート、Composeプロジェクト名、旧サーバーのIP | MacBookのIP・用途に合わせて新規作成する。旧IPはコピーしない。 |
| 秘密情報 | `DB_PASS`、`API_TOKEN`、`GEMINI_API_KEY`、`JWT_SECRET` | `.env.secret` にのみ保存し、チャット・Issue・Gitへは出さない。 |
| DB接続情報 | DBユーザー `cntadm`、DB名 `receipt_db`、DBパスワード | 既存DBを復元するなら、バックアップと整合するパスワードを使う。空の環境なら新しいパスワードを設定できる。 |
| 認証の継続性 | `JWT_SECRET` | 既存のログインセッションを引き継ぐ場合は同じ値が必要。新規環境なら新しい値へ変更できる。 |
| AI連携 | `GEMINI_API_KEY`、固定モデルID | OCRを使う場合に必要。必要ならMacBook用に別のAPIキーを発行する。 |
| データ | PostgreSQLバックアップ、`backend/uploads` | 既存データを移す場合だけ、バックアップ手順に従って移送・復元する。 |
| バックアップ | 保存先、cron設定、復旧手順 | MacBookの保存先と容量に合わせて新規に設定する。既存サーバーのRAIDパスをそのまま使わない。 |

### 8.6 秘密情報を安全に移す方法

既存サーバーの `.env.secret` を使う場合は、内容を画面に表示・コピーせず、SSHでMacBookへ直接転送する。MacBook側で次の形式を使う。`<...>` は実際の接続先に置き換える。

```bash
scp <旧サーバーのユーザー名>@<旧サーバーのIP>:~/stable/receipt-ai-app/.env.secret .env.secret
chmod 600 .env.secret
test -f .env.secret && echo ".env.secret を配置しました"
```

この方法はSSHで暗号化して転送する。パスワード、APIキー、JWT秘密鍵を端末画面、チャット、Issue、Gitのいずれにも貼り付けない。

`.env.secret` を引き継ぐかどうかは、8.1で決めた移行方式による。新規・検証用の環境では、既存値を複製せず必要な値を新規発行する選択もできる。

### 8.7 バックアップ通知の扱い

バックアップ通知用のDiscord Webhookは既存設定に含まれるが、MacBookへコピーしない。新しいWebhookを発行し、MacBook用のバックアップ通知設定へ切り替えてからcronを有効化する。既存のWebhookが設定ファイルや履歴に露出している場合は、失効・再発行する。

### 8.8 `setup-env.sh` を実行する前の確認

`setup-env.sh` は環境ファイルの生成に加え、バックアップ用cronを登録する。次の条件がそろうまで実行しない。

- [ ] MacBookのLAN内IPアドレスを確認した
- [x] `stable` を構築する方針を決めた
- [ ] 既存データを移行するか、空の環境から開始するかを決めた
- [x] MacBookのIPv4アドレスを `192.168.1.30` に固定し、疎通を確認した
- [x] 既存サーバーから必要な秘密情報を安全に引き継ぎ、MacBookの `.env.secret` を作成した
- [x] バックアップ用SSDを `/mnt/receipt-backups` へ恒久マウントした
- [ ] MacBook向けのIPアドレスを使うよう、固定IP設定を見直した
- [ ] `.env.secret` を安全に用意した
- [ ] バックアップ保存先とDiscord通知の扱いを決めた

### 8.9 旧CPUでSharpを動作させる手順

古いMacBookのCPUでは、Sharpの標準Linux x64バイナリが要求するSSE4.2命令を利用できず、backendが起動しない場合がある。Issue #128のWIPブランチには、公式のWebAssembly補助パッケージを任意依存として追加している。対応CPUのT320および将来の公開環境では、従来どおりネイティブ版Sharpが優先される。

MacBookの既存の未コミット設定を保護してから、WIPブランチを取得する。

```bash
cd ~/work/receipt-ai-app
git stash push -u -m "wip: current MacBook configuration"
git fetch origin
git switch -c wip/issue-128-macbook-server-setup \
  --track origin/wip/issue-128-macbook-server-setup
git stash show --stat stash@{0}
```

このWIPブランチには、Compose・バックアップ・IP設定のMacBook向け変更も既に含まれる。`stash@{0}` をすぐにpopしない。ブランチ上のファイルと退避内容が同じであることを確認してから、不要なら `git stash drop stash@{0}` で退避だけを削除する。別の未コミット作業が含まれる場合だけ、対象ファイルを確認して手動で復元する。

次に、通常のbackend依存関係を導入した後、MacBookだけでWebAssembly部品を追加する。

```bash
docker compose run --rm --no-deps backend npm ci --include=dev
docker compose run --rm --no-deps backend npm run install:sharp-wasm
docker compose run --rm --no-deps backend npx prisma generate
docker compose run --rm --no-deps backend \
  node -e "require('sharp'); console.log('Sharp: ready')"
```

`Sharp: ready` が表示された場合だけ、backendを再作成して動作確認する。

`@img/sharp-wasm32` はnpm上で `wasm32` 専用として扱われるため、x64環境で通常の`npm install`を実行すると除外される。`install:sharp-wasm` は公式パッケージをローカルの`node_modules`へ展開し、旧CPUで使えないx64版を退避してSharpのWasmフォールバックを選択させる。`npm ci`を再実行した場合は、このコマンドと`prisma generate`も再実行する。

### 8.10 Android（Expo Go）実機確認

Expo Goは`frontend/.env`の`EXPO_PUBLIC_API_URL`へ接続する。MacBookではbackendをLAN公開せず、Web frontendのNginxプロキシを経由させる。Git管理外の`frontend/.env`で、MacBookのLAN内IPを使った次の値を設定する。

```env
EXPO_PUBLIC_API_URL="http://192.168.1.30/api"
```

```bash
docker compose up -d --force-recreate frontend-dev
docker compose logs --tail=100 frontend-dev
```

Expo GoでQRコードを読み取る。接続先は`exp://HOST_IP:DEV_PORT`（MacBookのstable設定では`exp://192.168.1.30:8082`）である。AndroidとMacBookは同じWi-Fiへ接続する。

```bash
docker compose up -d --force-recreate backend
sleep 10
docker compose ps
docker compose logs --tail=50 backend
```

## 注意事項

- 認証情報や秘密情報をリポジトリへコミットしない。
- 本資料はDocker導入までを対象とし、インターネット公開、DNS、TLS、リモートアクセスの設定は含まない。
- 外部公開する場合は、PostgreSQL・Redis・バックエンドのポートを直接公開しない。公開範囲とセキュリティ方針は別途決定する。
