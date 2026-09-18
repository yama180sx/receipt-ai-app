# MacBook: root管理runtimeへの移行手順

内部管理番号: Issue #128

## 目的と範囲

MacBook上の`stable`を、T320のroot管理runtimeと同じ安全境界で実行する。
対象はMacBookだけであり、T320のunit、credential、データ、GitHub Environmentは変更しない。

この文書でいう「同じレベル」は、機能を同一のrelease SHAで実行し、root所有のcheckout・永続データ・encrypted credential・systemd deploy/backupで運用することである。T320のcredentialファイルや値をMacBookへコピーすることではない。

## 現在の確認済み状態

- 作業ブランチ: `wip/issue-128-macbook-server-setup`
- MacBookのサービスは通常のDocker Composeで稼働中であり、root管理runtimeには未移行。
- バックアップ先はMacBook専用の`/mnt/receipt-backups/receipt-app`。T320の`/mnt/raid_1t`は使用しない。
- Postgres、uploads、Valkey dataは既存のまま保持する。移行の確認が終わるまで削除・上書きしない。
- 旧鍵バージョン`totp-old-v1`のTOTP登録が1件ある。現行の専用TOTP鍵だけでは復号できないため、データ移行前に専用の一回限りの再暗号化手順が必要である。

## 停止条件

以下のどれかが起きたら切替を中断し、現行Composeと元データを残す。

- DBまたはuploadsの検証済みバックアップがない。
- TOTP対象件数と再暗号化成功件数が一致しない。
- health、ログイン、既存TOTP、レシート解析、バックアップのいずれかが失敗する。
- credentialの値・URL・鍵が端末出力、Git、作業ツリーに現れた可能性がある。

## 実施順序

1. root権限を一時確認し、MacBook専用の非機密設定を`/etc/receipt-ai-app/stable.env`に作成する。
   `HOST_IP=192.168.1.30`、公開ポート、MacBookのバックアップ先だけを設定し、secretは書かない。
2. 現在のMacBookの値から、MacBook用encrypted credentialを作成する。DB/JWT/Gemini/SMTP/Discordは論理名ごとに分離する。T320の`*.cred`やcredential値は使用しない。
3. 新しいMacBook専用TOTP鍵を生成し、旧JWT由来のTOTPを**一回だけ**再暗号化する。実行記録は件数と成否だけにする。
4. root所有の`/srv/receipt-ai-app/stable`に、このブランチの承認済み完全SHAをcheckoutし、既存のPostgres、uploads、Valkey dataを`/var/lib/receipt-ai-app/stable`へコピーする。
5. root-managed deployを実行する。health、Webログイン、既存TOTP、新規TOTP、レシート解析、通知、backupを確認する。
6. 成功後にだけ、旧TOTP移行経路を廃止し、ユーザーのDocker直接権限と旧Composeを廃止する。元データは復旧期間中に保持する。

## MacBook固有の差分

T320向けテンプレートをそのまま書き換えない。MacBookではroot所有のlocal overrideで次を固定する。

| 項目 | MacBook |
| --- | --- |
| release | `wip/issue-128-macbook-server-setup` の承認済み完全SHA |
| アプリ機能モード | `stable` |
| Docker実体名 | `mb-stable`（`receipt-mb-stable-*`） |
| LAN IP | `192.168.1.30` |
| backup先 | `/mnt/receipt-backups/receipt-app` |
| CPU | Sharp WebAssembly fallbackを維持 |
| Expo Go | SDK 57。iPhone 6sのSDK 54は対象外、Web版を利用 |

## 実作業の前提

root配置とサービス再作成にはMacBook上での`sudo`認証が必要で、一時的にWeb版は停止する。外部サービスのcredentialは、現在MacBookで機能している値をMacBook専用のencrypted credentialとして取り込むか、MacBook専用に再発行する。値そのものをチャット・Issue・Gitに貼り付けない。

切替前には必ず次を確認する。

```bash
sudo -v
git status --short
```

`sudo -v`はMacBook上の端末でパスワードを入力して実行する。パスワードを共有しない。

## MacBook用credentialの登録

MacBook専用のGemini API key、SMTP、AI予算通知用Discord Webhook、backup通知用Discord Webhookを用意した後、MacBook上で次を実行する。
値はプロンプトへ直接入力し、チャットやGitへ貼り付けない。

```bash
sudo ./scripts/macbook/register-root-credentials.sh
```

このスクリプトは、既存MacBookのDB接続・JWT・DB passwordを値を表示せず取り込み、MacBook専用のTOTP暗号鍵を生成する。T320のcredentialや設定ファイルは読まない。

## root管理runtimeへの切替

credential登録後、MacBook上で以下を実行する。この操作中はWeb版が停止する。旧Composeを停止してDB・uploads・Valkeyをroot管理領域へコピーし、`receipt-deploy-mb-stable.service`を起動する。

```bash
sudo ./scripts/macbook/migrate-to-root-runtime.sh
```

途中でroot deployが失敗した場合、スクリプトは従来のComposeを再起動する。root管理領域にコピー済みのデータは調査用に保持し、スクリプトをそのまま再実行して上書きしない。

credential修正後など、コピー完了後の切替を再試行する場合だけは、上書きせず次を使う。

```bash
sudo ./scripts/macbook/migrate-to-root-runtime.sh --resume
```
