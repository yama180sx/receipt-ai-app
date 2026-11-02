# ADR-016: Android development buildと限定APK配布

## Status

Accepted（Issue #94-6）

## Context

Issue #118-2-1のKAGOYA VPS検証では、Android Expo GoがTailscale経由のMetroへ接続要求を出せず、同じ端末のVPN内Webは利用できた。Expo GoをAndroid実機検証の唯一の経路にできない。

## Decision

- Androidは`expo-dev-client`を使うdevelopment buildを実機検証の標準とする。
- `development`はT320 dev用Metroを使う内部配布APK、`kagoya-development`はKAGOYA専用Metroを使う内部配布APK、`stable`はbundleを内包する内部配布APKとする。Google Play公開は本決定の対象外である。
- Android packageは`jp.yama180sx.recaipt`、初期`versionCode`は1とする。
- `kagoya-development`はT320 dev APKを上書きしない専用Android packageとdevelopment-client schemeを使う。EASの`kagoya`環境に管理する公開API設定だけをAPKへ含める。
- 現在のVPN内HTTP APIへ接続するため、Androidでcleartext HTTPを許可する。APIはTailscale等VPN内のfrontend Nginx `/api`だけへ向け、公開HTTP endpointやSecretをGitへ記録しない。
- iPhoneのExpo GoとWebは同じフロントエンドコードを継続して利用する。

## Consequences

- Web、iPhone Expo Go、Android development buildは同一のReact Native/Expoコードを共有し、Android専用UIを複製しない。
- EAS build、APK配布、署名情報の設定は外部状態を変更するため、mainマージ後に明示承認を得て実行する。
- APKを端末へ配布する前に、VPN接続下でログイン、TOTP、画像選択・撮影、アップロード、解析結果表示をtest-only dataで確認する。
- KAGOYAのGemini認証復旧が未完了の場合、KAGOYA APKの受入はログイン、履歴、画像表示までとし、解析・保存は認証復旧後の追加受入とする。
