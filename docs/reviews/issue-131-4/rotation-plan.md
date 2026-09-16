# Issue #131-4 TOTP鍵分離・資格情報ローテーション実施計画

GitHub Issue: [#667](https://github.com/yama180sx/receipt-ai-app/issues/667)

内部管理番号: Issue #131-4

親Issue: Issue #131

根拠: [ADR-010](../../adr/ADR-010-secret-lifecycle-and-runtime-delivery.md)、[秘密情報ライフサイクル設計・台帳](../issue-131-2/secret-lifecycle-design.md)

実施結果: [完了記録](completion-record.md)

## 1. 目的と前提

JWT署名鍵とTOTP暗号鍵を分離し、既存のTOTP登録を失わずに再暗号化した後、JWTと外部credentialを用途ごとにローテーションする。値、接続先、利用者のメールアドレス、認証コードは本書・Issue・PR・端末出力へ記録しない。

この作業は、root管理dev／stable、encrypted credential、Docker権限分離、stableの固定SHA deploy、backup・通知・再起動復旧の受入確認が完了していることを前提とする。旧stable経路の保持期限が終わる前に資格情報を無効化する場合、旧`.env`でのロールバックは使えなくなる。復旧はroot管理データとbackupから行う方針を、人間が明示承認する。

## 2. 現行差分と実装方針

現行のTOTP暗号化はAES-256-GCMだが、`TOTP_ENCRYPTION_KEY`未設定時に`JWT_SECRET`へフォールバックし、DBには鍵バージョンを保存していない。この状態でJWTを先に更新すると既存TOTPを復号できない。

実装PRで次を行う。

1. `FamilyMember`へTOTP暗号鍵バージョン列を追加する。既存の暗号文は旧JWT由来のバージョンとして明示的に扱う。
2. TOTP暗号化処理を、鍵バージョンに応じた復号と、専用TOTP鍵による新規暗号化に変更する。JWTへの暗黙フォールバックは禁止する。
3. root管理deploy unit、Compose secret、credential台帳へ専用TOTP鍵の論理名を追加する。新旧の復号が必要な期間だけ、旧鍵を限定読取りで渡す。
4. root専用CLIを追加する。対象はTOTP登録済みレコードだけとし、値を出さずに「対象件数・成功件数・失敗件数・鍵バージョン」だけを監査記録へ残す。
5. CLIは再実行安全にする。既に新鍵バージョンの行を再暗号化せず、対象外・復号失敗・件数不一致を非0終了にする。
6. 新規TOTP設定、既存TOTP確認、鍵不在、破損暗号文、再実行、監査記録を単体・結合テストで検証する。

DB migration、API契約、管理画面の変更が必要になった場合は、OpenAPI・As-built資料を同じPRで更新する。再暗号化CLIはfrontendやrunnerから実行可能にしない。

## 3. フェーズ0: 人間承認・停止条件

実装PRのレビュー完了後、実データ操作の前に次を人間が確認する。

- [ ] dev検証日、stableメンテナンス時間、作業担当者、復旧担当者、利用者連絡を決めた。
- [ ] dev／stableの直近root管理backup（DB・uploads）が成功している。
- [ ] TOTP有効利用者数を**件数だけ**確認し、少なくとも2名または復旧責任者を含む確認経路を決めた。
- [ ] encrypted credentialの論理名・所有者・modeを値を表示せず確認した。
- [ ] 外部サービス側で、DB、Gemini、SMTP、Discordの新credentialを作成・失効できる管理者が待機している。
- [ ] JWT更新で全セッションが失効すること、旧stable `.env`経路をロールバックに使わないことを承認した。

次のいずれかで停止する。TOTP復号不能、対象件数と成功件数の不一致、backup失敗、秘密値露出の疑い、予定外停止、復旧担当者不在。

## 4. フェーズ1: 専用TOTP鍵の導入と再暗号化

1. devへ実装PRをマージし、root管理devへ専用TOTP鍵と移行用旧鍵をencrypted credentialとして設定する。平文を端末・Git・作業ツリーへ置かない。
2. devをroot管理deployし、health、既存ログイン、TOTP、新規TOTP設定を確認する。
3. devのroot専用CLIで再暗号化を実行する。実行前・実行後の対象件数、成功件数、失敗件数、新鍵バージョンだけを記録する。
4. devで複数の既存TOTP利用者の認証を確認し、同じCLIを再実行して変更対象が0件であることを確認する。
5. devの受入結果を確認してから、develop→mainのリリースPRを作成する。mainマージだけではstableを変更しない。
6. stableの直前backup、利用者停止、GitHub Environment承認後に、root管理stableへ専用TOTP鍵と移行用旧鍵を設定する。
7. stableの承認済み固定SHAを更新し、通常のstable workflowからdeployする。
8. stableのroot専用CLIで再暗号化し、件数照合、複数利用者のTOTP認証、新規設定、ログインを確認する。
9. dev／stableとも、新鍵だけで既存・新規TOTPを復号できることを確認してから移行用旧鍵を削除する。

旧鍵の削除は、devとstableの件数照合・認証確認・root管理backupをすべて満たし、人間が承認した後だけ行う。削除後にTOTP復号失敗が出た場合は、JWTを更新せず、root管理backupからの復旧判断へ進む。

## 5. フェーズ2: JWT署名鍵の更新

TOTP再暗号化と旧TOTP鍵廃止が完了するまでJWTを更新しない。

1. 新JWT鍵を環境別に別々のencrypted credentialとして準備する。
2. devで新JWT鍵を適用してdeployし、旧アクセストークンが拒否され、再ログインとTOTPが成功することを確認する。
3. mainへのリリースPR、stableの承認済み固定SHA更新、承認済みworkflowを順に実施する。
4. stableで全利用者へ再ログインを案内し、管理者・通常利用者のログイン、TOTP、保護API、解析投入を確認する。
5. 旧JWT鍵をroot管理下から廃止し、旧鍵を検証へ再投入しない。

JWT更新は全セッション失効を意図した操作である。無停止を目的とした新旧JWT同時検証は、この計画の対象外とする。

## 6. フェーズ3: 外部credentialの用途別ローテーション

DB、Gemini、SMTP、Discordを一括更新しない。種別ごとに「新規作成→root credential更新→対象unit再起動またはdeploy→値を出さない試験→旧値無効化」の順で実施する。

| 種別 | 切替対象 | 成功確認 | 旧値の廃止 |
| --- | --- | --- | --- |
| PostgreSQL | backend接続、DB、backup用credential | backend health、migration整合、手動backup | backup成功後に旧認証を無効化 |
| Gemini | backend API key | 小さいテストレシート1件の解析・利用量記録 | 成功後に提供者側で旧keyを無効化 |
| SMTP | backend SMTP credential | 試験メール1通と配送履歴 | 成功後に旧パスワードを失効 |
| AI予算Discord | backend webhook | AI予算試験通知1回 | 成功後に旧Webhookを削除 |
| backup Discord | backup unit webhook | 手動backup成功通知1回 | 成功後に旧Webhookを削除 |

各種別の切替ごとにdev→main→stableの順を守る。外部提供者で旧値を失効した後は、旧stable `.env`を用いた復旧を行わない。

## 7. 記録・完了条件

記録するのは実施日時、環境、担当者、対象logical credential、対象件数／成功件数／失敗件数、backup・認証・通知の成功可否、旧値無効化可否だけである。秘密値、URL、メールアドレス、認証コード、鍵の断片を記録しない。

- [ ] TOTP専用鍵を導入し、既存TOTPの再暗号化件数が一致する。
- [ ] dev／stableで既存利用者と新規設定のTOTP確認が成功する。
- [ ] JWT更新後に旧セッションが無効、新しいログインが成功する。
- [ ] DB、Gemini、SMTP、Discordを用途別に更新・確認・旧値無効化した。
- [ ] root管理backup、再起動復旧、通知、解析が成功する。
- [ ] 旧stable `.env`・旧credential・ロールバック控えの廃止を人間が承認し、対象限定で実施した。

本計画は実行承認ではない。フェーズ1以降の各環境変更、external credential再発行、JWT更新、旧経路廃止は、その時点で人間の明示承認を要する。
