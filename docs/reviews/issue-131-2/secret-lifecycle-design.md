# Issue #131-2 秘密情報ライフサイクル設計・台帳

GitHub Issue: [#665](https://github.com/yama180sx/receipt-ai-app/issues/665)<br>
内部管理番号: Issue #131-2<br>
親 Issue: Issue #131（#656）<br>
先行根拠: [Issue #131-1 PoC](../issue-131-1/secret-delivery-poc-plan.md)

## 1. 目的と適用範囲

本書は、RecAIpt の秘密情報について、値を記録せずに、正本・所有者・読取り主体・更新・失効・復旧の責任を定義する設計・台帳である。

対象は T320 の dev/stable、GitHub Actions、Docker Compose、バックアップ、および将来の OCI 移行である。実際の credential 作成・アプリ変更・Compose変更・既存値の再発行は扱わない。それぞれ Issue #131-3 と Issue #131-4 で実施する。

## 2. 現状と解消する問題

現行では、`setup-env.sh` が `.env.secret` を shell で読み込み、root、backend、frontend の複数 `.env` へ値を複写する。stable では GitHub Actions が作業ディレクトリに `.env` を生成する。`scripts/backup.sh` は root `.env` を解析して DB パスワードと通知先を取得する。

Issue #131-1 の PoC では、root 管理 systemd unit に encrypted credential を渡せること、通常ユーザーから暗号化済み credential を直接読めないことを確認した。一方、Docker group のユーザーはホストの bind mount を作成できるため、そのままでは秘密情報を隔離できない。

## 3. 分類と台帳

値、接続先の実値、利用者のメールアドレスはこの台帳へ書かない。`読取り主体` は最終実装後に値を取得できる実行主体であり、GitHub runner や一般利用者を含まない。

| 論理名 | 分類 | 正本候補 | 読取り主体 | 更新・失効の契機 | 実装Issue |
| --- | --- | --- | --- | --- | --- |
| PostgreSQL 認証情報 | 秘密 | T320 root 管理 encrypted credential | PostgreSQL、backend、backup 専用 unit | 漏えい、DB 利用者変更、定期見直し | #131-3、#131-4 |
| JWT 署名鍵 | 秘密 | T320 root 管理 encrypted credential | backend | 漏えい、計画的な全セッション失効 | #131-4 |
| TOTP 暗号鍵 | 秘密 | T320 root 管理 encrypted credential | backend | 漏えい、暗号方式変更。JWT と独立 | #131-4 |
| Gemini API key | 秘密 | T320 root 管理 encrypted credential | backend | 漏えい、Google 側再発行、利用停止 | #131-4 |
| バックアップ Discord Webhook | 秘密 | T320 root 管理 encrypted credential | backup 専用 unit | 漏えい、通知先変更 | #131-3、#131-4 |
| AI予算 Discord Webhook | 秘密 | T320 root 管理 encrypted credential | backend | 漏えい、通知先変更 | #131-3、#131-4 |
| SMTP パスワード | 秘密 | T320 root 管理 encrypted credential | backend | 漏えい、メール提供者側再発行 | #131-3、#131-4 |
| Google Calendar OAuth refresh token | 秘密 | T320 root 管理 encrypted credential | ローテーション予定管理サービス | 漏えい、Googleアカウント変更、権限変更 | #131-3、#131-6 |
| SMTP 接続設定・利用者・送信元 | 制限付き設定 | root 管理 credential または制限付き設定経路 | backend | 送信経路変更 | #129、#131-3 |
| Google Calendar ID、共有先管理者 | 制限付き設定 | 管理設定DB | ローテーション予定管理サービス | 運用カレンダー・管理者変更 | #131-6 |
| HOST IP、ポート、CORS、モデルID | 非機密環境設定 | Git 管理の既定値 + GitHub Variables 等 | 対象サービス | 環境変更 | #129 |
| `EXPO_PUBLIC_APP_ENV`、`EXPO_PUBLIC_API_URL` | 公開設定 | frontend build 設定 | frontend | 環境変更 | #129 |
| `EXPO_PUBLIC_API_TOKEN` | 公開領域に置いてはならない値 | #131-3 で廃止する | なし（削除後） | 外部利用なしの確認済み | #131-3 |

## 4. 責任境界

### 4.1 stable の目標境界

```text
GitHub Actions runner（Docker 非所属・秘密値を受け取らない）
  → 引数固定の root 管理 deploy systemd unit を起動
    → root が encrypted credential を runtime 専用領域へ配布
      → PostgreSQL / backend / backup の必要な実行単位だけが読取り
```

- GitHub Actions はソース同期と、限定 deploy unit の起動要求だけを担う。アプリの秘密値を workflow、runner環境、作業ディレクトリへ展開しない。
- encrypted credential の保管、復号、一時 runtime ファイルの作成・削除は root 管理 unit の責務とする。
- Docker Compose を直接操作できる runner ユーザーは、この境界を破るため Docker group から外す。限定 unit は対象環境、Compose project、操作種別を固定し、任意引数・任意パスを受け取らない。
- `frontend` と `frontend-dev` へ秘密値を渡さない。`EXPO_PUBLIC_*` は公開値だけとする。

### 4.2 dev の扱い

dev も stable と同じ強度で扱う。開発ユーザーを Docker group から外し、root 管理 unit 経由でだけ Compose を操作する。dev の秘密値も Git と作業ディレクトリへ保存せず、stable と共有しない専用 credential を用いる。

この方針により日常の Compose 操作は限定コマンド経由となるが、開発ユーザーやワークツリーから dev の runtime secret を隔離する。#131-3 では dev/stable の unit を別名・別作業ディレクトリ・別credentialに固定し、環境横断の引数を受け取らない。

### 4.3 Issue #129 との境界

Issue #129 は IP、ポート、CORS、モデルIDなど、Git に置ける非機密の環境固有設定を扱う。本Issueは秘密値を扱う。接続先や送信元が秘密に当たるか不明な場合は、機密性を優先して一旦制限付き設定として扱う。

## 5. 更新・失効・復旧の標準順序

1. Secret Scanner または人間が露出を検知したら、値を Issue、ログ、チャットへ転記しない。
2. 該当する外部サービスまたは内部 credential を停止・無効化する。Webhook は Discord 側で無効化、SMTP/Gemini は提供者側で再発行する。
3. 影響範囲を値なしで記録し、必要に応じて GitHub の露出対応を開始する。
4. root 管理の正本を更新する。作業ディレクトリの `.env` を編集して正本にしてはならない。
5. 対象 unit を再起動または再デプロイし、値を出さない診断で到達性だけを確認する。
6. JWT/TOTP は #131-4 のメンテナンス手順に従う。TOTP を再暗号化して認証確認する前に JWT を更新してはならない。
7. 旧 credential が無効であることを外部サービス側で確認し、監査記録を残す。

## 6. 段階的ローテーション方針

通常時のローテーションは「新規作成 → 新値だけで検証 → 本番切替 → 正常性確認 → 旧値失効」の順で実施する。一度に全種類を切り替えず、影響範囲を secret 種別ごとに限定する。旧値はロールバック期限だけ保持し、期限と責任者を事前に決める。

| 種別 | 並行検証と切替 | 旧値の扱い | 利用者影響 |
| --- | --- | --- | --- |
| TOTP 暗号鍵 | 新旧鍵を読める実装で全暗号文を新鍵へ再暗号化し、件数照合と認証確認後に新鍵だけへ切替 | 全件再暗号化と復号確認後に除去 | 原則なし |
| JWT 署名鍵 | 新鍵で発行し、計画された短期間だけ新旧鍵で検証する | 既存トークンの有効期限後に旧鍵を除去 | 通常時は原則なし |
| PostgreSQL 認証 | 新しい最小権限DB利用者を作成し、backend と backup を新利用者で試験後に切替 | 新経路のバックアップ確認後に旧利用者を無効化 | backend／backup 再起動時のみ |
| Gemini、Discord、SMTP | 新しい credential を外部側で作成し、専用試験で確認してから実行主体を切替 | 試験と本番確認後に外部側で無効化 | 原則なし。短時間の再起動があり得る |
| systemd credential | 新旧 encrypted credential を root 管理で準備し、新値を読む unit を検証してから切替 | ロールバック期限後に root 管理で削除 | unit 再起動時のみ |

| 種別 | 定期更新 | 緊急更新 | 注意事項 |
| --- | --- | --- | --- |
| DB、JWT、TOTP | 四半期レビュー、年1回の計画的更新 | 漏えい疑い、管理者交代、暗号方式変更 | DB/JWT/TOTP は依存順序を守り #131-4 の計画メンテナンスで実施 |
| Gemini、Discord、SMTP | 四半期レビュー、年1回の計画的更新 | 漏えい、提供者側の警告、通知先変更 | 通常時は新値の疎通後、外部側で旧値を無効化 |
| 公開設定 | 定期ローテーション不要 | URL/ポート/公開方針変更 | `EXPO_PUBLIC_*` に秘密値を入れない |

四半期レビューでは台帳、読取り主体、不要 credential、失効済み credential、外部提供者の監査記録を確認する。定期更新の実施月・時間帯は、利用者が少ない時間を人間が別途決める。利用者パスワードに根拠のない定期変更を求めない。

### 6.1 定期予定と Google Calendar 連携

- 通常の計画ローテーションは、毎年10月第1月曜日の06:00（`Asia/Tokyo`）を予定とする。
- 管理画面では、周期（毎月／指定月ごと／毎年）、日付または第N曜日、実行時刻、タイムゾーン、次回予定を選択式で変更できる。自由入力の cron 式は受け付けない。
- 例外的な次回予定だけを一度変更できる。定期ルールを変更した場合は、以後の次回予定を新ルールで計算する。
- 対象ローテーションが成功し、事後確認が完了してから、次回分だけを Google Calendar に作成する。事前に複数年分を登録しない。
- 漏えい対応による緊急ローテーションが成功した場合は、次回予定をその成功日時と管理者が設定したサイクルから再計算し、既存の次回予定を置換する。
- カレンダーの作成・更新に失敗しても credential の切替完了を巻き戻さない。ただし管理者へ安全なエラーを通知し、手動登録が必要な状態を監査記録に残す。
- イベントID、予定日時、タイムゾーン、作成結果は管理設定DBで監査する。OAuth token、予定に不要な秘密情報、利用者の認証情報をイベント本文へ含めない。

### 6.2 運用カレンダーと複数管理者

専用の Google アカウントを運用カレンダーの所有者および Calendar API 実行主体として用意する。このアカウントを人間が共有ログインする運用にはしない。個々の全体管理者の Google アカウントをカレンダーの共有先として登録し、閲覧または必要最小限の編集権限を付与する。

管理画面では、全体管理者かつ TOTP 有効な利用者だけが、ローテーションサイクル、次回予定、共有先管理者を変更できる。進行中のローテーションがある間は予定を変更できない。変更には理由を必須とし、変更前後、操作者、時刻、Calendar API の更新結果を監査する。定期ルールまたは次回予定の変更時は、既存の次回 Calendar イベントを置換する。カレンダー共有設定の初回作成や OAuth 同意は外部サービス側の人間作業として扱う。

実装は Issue #131-6 で扱う。Calendar API は作成対象の専用カレンダーに限定し、必要最小限の OAuth scope を使用する。refresh token は root 管理 encrypted credential として配布し、frontend、GitHub runner、作業ディレクトリ、DBへ保存しない。

## 7. 漏えい疑い・検知時の緊急運用

### 7.1 発動条件

次のいずれかを検知した時点で「漏えい疑い」として扱う。真偽の確定を待って秘密値を表示・複写・共有しない。

- GitHub Secret Scanning、Push Protection、ローカル scanner、CI が秘密パターンを検知した。
- Issue、PR、チャット、ログ、スクリーンショット、バックアップ、作業ディレクトリに秘密値またはその疑いがある値が出た。
- Discord、Google、SMTP、GitHub、DB 等の提供者から不正利用・異常アクセスの警告を受けた。
- device 紛失、管理者アカウント侵害、Docker/root 権限の不正利用、許可していない環境への credential 配布が疑われる。

### 7.2 初動（値を扱わない）

1. 発見者は値をコピー、引用、Issue本文への貼付、ログ出力、スクリーンショットへの再掲載を行わない。
2. 実行中の deploy、credential 配布、ローテーションを停止する。必要なら root 管理 unit で対象サービスの外部通信または対象機能を停止する。
3. 管理者へ「論理名、検知時刻、検知経路、露出した可能性のある場所、実施済み停止措置」だけを連絡する。値そのものは連絡しない。
4. GitHub上の露出は、Secret Scanning のアラートを確認し、公開範囲、fork、Actions log、artifact を値なしで調査する。履歴改変より先に失効を優先する。
5. 該当 secret を台帳で特定し、読取り主体と依存サービスを確認する。

### 7.3 封じ込め・再発行

漏えい疑いの場合は、通常時のロールバック用旧値保持を適用しない。新値の並行試験は最小限にし、旧値を再利用しない。

| 種別 | 即時封じ込め | 再発行後の確認 |
| --- | --- | --- |
| Discord Webhook | Discord側で旧Webhookを削除・無効化 | 新Webhookで専用試験通知を1回だけ送る |
| Gemini API key | Google側で旧keyを無効化または制限 | backendから値を出さないAPI疎通を確認 |
| SMTP credential | 提供者側でアプリパスワード等を失効 | 専用試験メールを1回送る |
| DB認証 | 旧DB利用者またはパスワードを無効化。必要なら外部接続を停止 | 新利用者でbackendとbackupを確認 |
| JWT 署名鍵 | 新鍵へ切替、旧鍵の検証を即時停止 | 全利用者の再ログインとTOTP認証を確認 |
| TOTP 暗号鍵 | 旧鍵を消す前に復号可能なバックアップと復旧手段を確認 | #131-4 の再暗号化・件数照合・複数利用者認証を確認 |

TOTP 暗号鍵の漏えい疑いは、復号不能になる危険があるため、バックアップと復旧担当者なしに旧鍵を即時削除してはならない。漏えい範囲が TOTP 鍵に及ぶ場合は認証機能を安全に停止し、#131-4 の承認済みメンテナンス手順へ移行する。

### 7.4 復旧と終結

1. 新 credential を root 管理の正本へ登録し、対象 unit を切り替える。作業ディレクトリの `.env` を正本にしてはならない。
2. ログイン、TOTP、レシート登録、AI解析、通知、バックアップのうち影響を受ける機能を、値を出さない試験で確認する。
3. 旧 credential の無効化を外部提供者側も含めて確認する。
4. 事後記録には logical secret 名、検知経路、時刻、影響範囲、無効化時刻、復旧確認、再発防止策だけを記録する。値と値の断片を記録しない。
5. #131-5 の scanner・診断・手順に不足があれば、復旧後に改善Issueを起票する。

## 8. 将来 OCI 移行

OCI Vault は将来の stable 正本候補とする。ただし導入自体は本Issueの完了条件に含めない。T320 が OCI Vault から取得するための認証情報を新たな長期秘密として配置するだけでは、Docker group 問題を解決しない。

OCI 移行時も、サービス別の論理名、最小読取り主体、更新・失効順序を本台帳と同じ契約で維持する。OCI へのアクセス権は root 管理 deploy/runtime unit だけに与える。

## 9. #131-3 の受け入れ前提

- runner ユーザーが Docker socket を直接操作できない。
- GitHub workflow がアプリ秘密値を `.env`、標準出力、runner環境へ書き出さない。
- runtime の秘密値は対象サービスだけが読む。frontend、frontend-dev、非対象コンテナは読めない。
- backup は root `.env` を解析しない専用経路へ移行する。
- app の設定読取りは、秘密値をエラー・ログ・診断へ出力しない。
- dev/stable で使用する credential は共有しない。
- `EXPO_PUBLIC_API_TOKEN` を frontend、workflow、環境変数例、運用手順から削除する。削除後にAPIアクセス、Web、Expo Goの回帰を確認する。

## 10. 実装前の人間作業

Google Calendar 専用アカウントの作成、カレンダー共有先となる個人アカウントの登録、OAuth 同意は Issue #131-6 の実装前に人間が実施する。すべての設計判断は承認済みであり、正式な決定は `ADR-010` に記録する。本書は実装前の台帳・運用設計の詳細として維持する。
