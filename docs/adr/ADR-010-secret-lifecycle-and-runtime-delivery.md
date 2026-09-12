# ADR-010: 秘密情報をroot管理の実行時credentialとして配布し、段階的に更新する

Status: Accepted

関連: [#665 Issue #131-2](https://github.com/yama180sx/receipt-ai-app/issues/665)、[Issue #131](https://github.com/yama180sx/receipt-ai-app/issues/656)

## 背景

現行の RecAIpt は `.env.secret` を読み込み、root、backend、frontend の `.env` と stable の作業ディレクトリへ秘密値を複写する。stable の GitHub Actions workflow も runner 上で `.env` を生成する。また、runner 実行ユーザーは Docker を操作できるため、ホストファイルを bind mount でき、保存場所を変えるだけでは秘密を隔離できない。

Issue #131-1 の合成値 PoC で、T320 の root 管理 systemd unit が encrypted credential を読めること、通常ユーザーは encrypted credential を直接読めないことを確認した。TPM は利用できないため、root 専用 systemd host key を使う。

## 決定

### 実行時配布と権限境界

- dev と stable のアプリ秘密値は、T320 の root 管理 encrypted credential を正本とする。Git、ワークツリー、生成 `.env`、frontend、GitHub runner、DBには保存しない。
- dev と stable は credential を共有しない。
- Docker を直接操作できるユーザーは秘密の境界を破るため、開発ユーザーと self-hosted runner を Docker group から外す。
- Compose 操作と credential 配布は、対象環境・作業ディレクトリ・操作種別を固定した root 管理 systemd unit だけが実行する。任意引数や任意パスを受け取らない。
- frontend と `EXPO_PUBLIC_*` には公開設定だけを渡す。`EXPO_PUBLIC_API_TOKEN` は外部利用なしの確認済みとして Issue #131-3 で廃止する。

### 秘密の分類

- DB認証、JWT署名鍵、TOTP暗号鍵、Gemini API key、Discord Webhook、SMTP password、Google Calendar OAuth refresh tokenは秘密情報とする。
- SMTP host/port/TLS設定、SMTP user/from、Google Calendar ID、共有先管理者は制限付き設定とする。値を一般ログや公開設定へ出さない。
- IP、ポート、CORS、モデルIDなどGitへ置ける非機密環境設定は Issue #129 の責務とする。
- JWT署名鍵とTOTP暗号鍵は別の秘密として扱い、TOTP鍵をJWT鍵へフォールバックさせない。

### 更新・漏えい対応

- 通常時は、新値作成、新値だけの検証、本番切替、正常性確認、期限付き旧値失効の順に段階的ローテーションを行う。秘密種別を一括で切り替えない。
- 漏えい疑いでは旧値のロールバック保持をせず、値を表示・転記せずに停止、外部側無効化、再発行、復旧確認を優先する。
- TOTP鍵は既存データの復号不能を避けるため、復号可能なバックアップ、再暗号化、件数照合、認証確認を終える前に旧鍵を削除しない。JWTの更新はその後に行う。
- 台帳と権限は四半期ごとに確認し、サービス用 credential は年1回の計画ローテーションを行う。通常予定は毎年10月第1月曜日06:00（Asia/Tokyo）とする。
- TOTP有効な全体管理者は、選択式の管理画面から周期（毎月／指定月ごと／毎年）、日付または第N曜日、時刻、タイムゾーン、次回予定を変更できる。自由入力の cron 式は許可しない。

### Google Calendar の予定管理

- ローテーション成功と事後確認の後にだけ、次回分の予定をGoogle Calendarへ登録する。複数年分の先行登録は行わない。
- 専用Googleアカウントを運用カレンダー所有者とAPI実行主体にする。人間はこのアカウントを共有ログインせず、個人アカウントを共有先として登録する。
- サイクル、共有先、次回予定の変更は、TOTP有効な全体管理者に限定し、理由・変更前後・操作者・外部API結果を監査する。
- Google Calendar OAuth tokenは秘密情報としてroot管理credentialで配布し、API権限は専用カレンダーの必要最小限に限定する。

## 結果

- Issue #131-3 は、秘密のサービス別配布、root管理の限定 unit、Docker権限除去、`.env`生成の廃止、frontendからの秘密排除を実装する。
- Issue #131-4 は、TOTP再暗号化、JWT更新、外部credentialの再発行・無効化を計画メンテナンスとして実装する。
- Issue #131-5 は、secret scanning、値を出さない診断、漏えい時の停止・記録手順を実装する。
- Issue #131-6 は、ローテーション予定管理とGoogle Calendar連携を実装する。
- OCI Vaultへの移行は将来の選択肢とするが、Docker権限を分離しない限り秘密隔離を解決しないため、本ADRの前提を維持する。
