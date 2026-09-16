# Issue #131-3-3 dev段階移行 実施計画

GitHub Issue: [#675](https://github.com/yama180sx/receipt-ai-app/issues/675)<br>
内部管理番号: Issue #131-3-3<br>
先行: Issue #131-3-1、Issue #131-3-2

## 1. 目的と変更境界

この計画はdevだけを、ユーザー所有の`.env`・Docker direct操作から、root管理のencrypted credential・固定systemd unitへ移行する手順である。stable、main、stableのデータ、stableのtimer、stableのcredentialはこの実施では変更しない。

完了時のdev経路は次のとおりとする。

```text
開発ユーザー／GitHub Actions runner（Docker非所属・Secret非保持）
  → 限定sudoで receipt-deploy-dev.service の開始だけを要求
    → root所有の固定helper
      → /srv/receipt-ai-app/dev（develop固定ref）
      → /run/receipt-ai-app-dev の一時Secret
      → receipt-dev Compose project
```

## 2. 実施前の人間承認

次の全項目を、人間が確認してからだけ次節へ進む。

- [ ] devの利用者へ短時間の停止時間を通知した。
- [ ] 作業担当者、復旧担当者、連絡先を決めた。
- [ ] 直近のdevバックアップ日時と、DB・uploadsアーカイブの存在を値を表示せず確認した。
- [ ] devのログイン、TOTP、レシート解析、Discord通知、メール通知、バックアップの現状が正常である。
- [ ] `develop`にIssue #131-3-2のPRがマージ済みである。
- [ ] T320のDocker Composeが`!override`／`!reset`に対応している。
- [ ] dev停止中に問題が起きた場合は、stableへ進まず旧devへ戻すことを合意した。

いずれかを満たせない場合は停止する。Secret値をIssue、PR、端末ログ、スクリーンショットへ転記してはならない。

## 3. フェーズA: root構成の設置（まだdevを切り替えない）

root管理者が、マージ済みの`develop`を確認した作業ツリーから、以下をroot所有で設置する。

| 対象 | 設置先 | mode | 備考 |
| --- | --- | --- | --- |
| 固定deploy helper | `/usr/local/libexec/receipt-deploy` | 0750 | root以外は変更不可 |
| 固定backup helper | `/usr/local/libexec/receipt-backup` | 0750 | root以外は変更不可 |
| dev deploy／backup unit・timer | `/etc/systemd/system/` | 0644 | stable unit/timerは未有効化 |
| dev非機密設定 | `/etc/receipt-ai-app/dev.env` | 0600 | allowlist以外のキーを置かない |
| dev encrypted credential | `/etc/receipt-ai-app/credentials/dev/` | 0600 | Git・作業ツリーには置かない |
| 限定sudoers | `/etc/sudoers.d/receipt-deploy` | 0440 | 固定unit開始だけを許可 |

### 3.1 非機密設定

`ops/systemd/config/dev.env.example`を起点に、現在のdevで使用している非機密値（IP、ポート、SMTP host／port／TLS、Geminiモデル、再試行設定）だけをroot管理設定へ移す。DB password、JWT、Gemini key、Webhook、SMTP user/password/fromは設定ファイルに書かない。

### 3.2 credential台帳

次の論理名をdev専用で作る。`postgres_password`と`db_password`は用途を分離した別credentialであり、値を表示・比較しない。

| 用途 | credential論理名 | 配布先 |
| --- | --- | --- |
| backend DB接続URL | `backend_database_url` | backendのみ |
| PostgreSQL password | `postgres_password` | dbのみ |
| JWT署名鍵 | `backend_jwt_secret` | backendのみ |
| Gemini API key | `backend_gemini_api_key` | backendのみ |
| AI予算Discord Webhook | `backend_ai_budget_discord_webhook` | backendのみ |
| SMTP user/password/from | `backend_smtp_user`、`backend_smtp_password`、`backend_smtp_from` | backendのみ |
| backup DB password | `db_password` | backup unitのみ |
| backup Discord Webhook | `backup_discord_webhook_url` | backup unitのみ |

credentialは管理者が安全な入力経路からencrypted credential化する。平文の`.env.secret`を表示、コピー、Git管理、作業ディレクトリへの保存、shell履歴への貼付をしてはならない。

### 3.3 設置時の検証

- [ ] `visudo -cf /etc/sudoers.d/receipt-deploy`が成功する。
- [ ] `systemctl daemon-reload`後、dev unitとtimerが構文エラーなく読める。
- [ ] `/srv/receipt-ai-app`、`/var/lib/receipt-ai-app`、`/etc/receipt-ai-app`はroot所有で、group／other書込み不可である。
- [ ] 既存dev Compose、既存cron、既存コンテナはこの時点で変更しない。

credential読取りの合成確認は、既存`receipt-dev`コンテナ名・ポートと衝突しない一時systemd credential検査だけで行う。`receipt-deploy-dev.service`を合成値で起動してはならない。起動すると既存devを置換し得るためである。

## 4. フェーズB: devデータ移行と切替

このフェーズからdevだけを停止する。stableは稼働を継続する。

1. 既存のdevバックアップを1回成功させ、DB・uploadsアーカイブの作成時刻だけを記録する。
2. 既存devのコンテナ名、health、バックアップ時刻を値なしで記録する。
3. dev Composeだけを停止する。stableのCompose project・コンテナを操作してはならない。
4. root管理者が、旧devの`pgdata`、`redisdata`、`backend/uploads`を、それぞれ`/var/lib/receipt-ai-app/dev/`配下へ属性を保持してコピーする。旧データは削除・上書きしない。
5. root管理unitでdev deployを1回だけ実行する。root helperが`develop`固定ref、runtime image build、DB／Redis healthcheck、Prisma migration、Compose起動を順に行う。
6. devのhealth、ログイン、管理者TOTP、既存レシート・画像表示、新規レシート解析、Discord試験通知、メール試験通知を確認する。
7. root管理backup serviceを1回実行し、DB・uploadsバックアップと通知を確認する。
8. 成功後にだけdev backup timerを有効化し、旧dev cronを無効化する。stable cronは残す。

## 5. フェーズC: Docker権限の除去

フェーズBの全確認が成功してからだけ実施する。

1. `cntnt001`をDocker groupから外す。このユーザーで動くrunnerも同時にDocker権限を失う。
2. runner serviceを再起動し、新しいログインセッションでgroup反映を確認する。
3. 新しい`cntnt001`セッションでDocker socketへの直接接続が拒否されることを確認する。拒否メッセージにSecretを含めない。
4. `sudo -n -l`で許可が固定deploy unit開始だけであることを確認する。任意の`docker`、任意の`systemctl`、任意パスが許可されないことを確認する。
5. runnerがDockerを直接使わず、固定unitを要求するだけであることをworkflow定義と実行ログの値なし確認で確認する。

## 6. devの受入確認

- [ ] backendとdbだけが必要なSecretをファイルで読み、frontend／runner／通常ユーザーは読めない。
- [ ] 認証、TOTP、既存データ、uploads、新規解析、Discord、メール、backupがdevで成功する。
- [ ] DB migrationはroot unit経路で正常に完了する。
- [ ] 旧devデータと旧cronは、ロールバック期限中は保持する。
- [ ] 新しいログインセッションで`cntnt001`とrunnerがDocker socketを直接操作できない。
- [ ] `/srv`、`/var/lib`、`/run`のroot管理経路はrunner所有の作業ディレクトリから書換え不能である。

## 7. ロールバック

Docker group除去前に失敗した場合は、root管理の新しい永続領域を利用せず、旧`~/dev/receipt-ai-app`のデータとComposeへ戻す。新旧credentialを値として記録しない。

Docker group除去後に失敗した場合は、root管理者だけが一時的に`cntnt001`へDocker groupを戻し、runnerを再起動し、新しいログインセッションへ切り替える。復旧後に原因を値なしで記録し、stableへの移行は停止する。

DB接続不能、TOTP認証不能、バックアップ不能、通知不能、Secret露出、予定外の長時間停止、データ整合性懸念のいずれかを検知した場合は、直ちにstable移行を停止する。

## 8. stableへの進行条件

stableへ進めるのは、devの受入確認をすべて満たし、利用者通知、メンテナンス時間、ロールバック担当、stableバックアップ、外部通知確認者を人間が承認した後だけとする。stableの実施内容は[stable段階移行 実施計画](./stable-staged-migration-runbook.md)を根拠に別途確定し、同時移行しない。
