# Issue #131-4 TOTP鍵分離・資格情報ローテーション完了記録

GitHub Issue: [#667](https://github.com/yama180sx/receipt-ai-app/issues/667)

内部管理番号: Issue #131-4

実施期間: 2026-09-13〜2026-09-15

関連計画: [TOTP鍵分離・資格情報ローテーション実施計画](rotation-plan.md)

## 1. 記録の扱い

本書は値を含まない完了記録である。秘密値、URL、メールアドレス、認証コード、鍵の断片、実データは記載しない。実施時の端末出力も、成功可否・件数・論理名・権限だけを確認対象とした。

## 2. 実施結果

| 対象 | dev | stable | 完了条件の確認 |
| --- | --- | --- | --- |
| TOTP専用鍵 | 導入、既存登録の再暗号化、再実行時の対象0件を確認 | 同左 | 既存TOTP、新規TOTP設定、再ログイン、再起動後の認証に成功 |
| 移行用旧TOTP鍵 | 廃止 | 廃止 | 現行runtimeに旧鍵の読取り経路がないことを確認 |
| JWT署名鍵 | 環境別encrypted credentialへ更新 | 同左 | 新規ログインとTOTP認証に成功 |
| Gemini API key | 環境別keyへ更新 | 同左 | レシート解析・登録に成功後、旧共有keyを提供者側で無効化 |
| AI予算Discord | 環境別Webhookへ更新 | 同左 | 新しい通知先への試験通知に成功後、旧Webhookを削除 |
| backup Discord | 環境別Webhookへ更新 | 同左 | 手動backup通知に成功後、旧Webhookを削除 |
| SMTP | 環境別アプリパスワードへ更新 | 同左 | 試験メール受信に成功後、旧アプリパスワードを削除 |
| PostgreSQL認証 | backend、DB起動、backup用credentialを同期更新し、DB利用者の認証を更新 | 同左 | deploy、health、migration数一致、DB/uploads backup、ログインに成功 |

JWT更新時は、署名鍵の置換により旧トークンを検証できない状態へ移行した。旧セッションを保持した画面での拒否表示は受入時に観測していないため、これは実画面の回帰証跡ではなく、鍵置換による認証契約上の結果として記録する。

## 3. 運用受入

- dev/stableともroot管理deployが成功し、backend health endpointが成功した。
- DB migrationは各環境で適用済み件数とリポジトリ上のmigrationディレクトリ数が一致した。
- root管理backupで、各環境のDBとuploadsの成功を確認した。
- TOTP鍵分離後に、dev/stableそれぞれで再起動後の既存TOTPログインを確認した。
- DB認証更新後に、dev/stableそれぞれで通常ログインを確認した。
- 外部通知は、更新後の環境別送信先へ到達することを確認した。

## 4. 旧credentialとロールバック控え

各切替では、現行encrypted credentialを更新前にroot所有の限定ファイルとして一時保持した。全種別の切替・受入・外部側の旧値無効化を終えた後、人間の明示承認により、dev/stableのローテーション控えを対象限定で削除した。

現行credentialはroot所有・mode `0600`のまま維持し、値の表示・Git管理・runnerへの配布は行っていない。

旧stableのロールバック用データ、旧`.env`、cron控えは、過去のstable移行に関する別の保持判断により削除対象に含めない。これらは現行root管理runtimeの入力ではなく、現行credentialの代替として使用してはならない。将来の廃棄または安全な保管場所への移動は、別途の人間承認と対象確認を要する。

## 5. 完了判定と後続

Issue #131-4の範囲であるTOTP鍵分離、現行credentialの用途別ローテーション、運用受入、ローテーション控えの廃止は完了した。

Git履歴に残る過去の検出候補とSecret scanの正常化は、本Issueの範囲へ混在させず、Issue #131-8で値を出さない調査・失効確認・検査方針の確定として継続する。
