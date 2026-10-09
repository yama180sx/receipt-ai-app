# Android development build 運用（Issue #94-6）

## 目的

Android Expo Goが使えない場合でも、RecAIpt専用のAndroid APKで家族限定の実機検証を行う。Google Play公開は対象外である。

## プロファイル

| profile | 用途 | Metro | 配布物 |
|---|---|---|---|
| `development` | 実装・ネイティブ機能の検証 | 必要。VPN内の`frontend-dev`を利用 | 内部配布APK |
| `stable` | 家族限定の動作確認 | 不要。JavaScript bundleをAPKへ内包 | 内部配布APK |

両方ともAPIへはTailscale等のVPN経由で接続する。`EXPO_PUBLIC_API_URL`にはVPN内frontendの`/api` URLだけを設定する。実値はGit、Issue、PR、チャットに書かない。

## ビルド前提

- `frontend/eas.json` のprofileを使う。
- 実行環境で`EXPO_PUBLIC_API_URL`を安全に設定する。値はEASの環境変数またはGit管理外のビルド環境に置く。
- `EXPO_PUBLIC_*`はAPKに含まれるため、認証情報、API token、鍵を渡してはならない。
- EASアカウント、署名情報、APK配布は外部状態を変更する。mainへのマージ後、対象・配布先・影響範囲を確認して承認を得てから行う。

## 手順

1. `frontend`で`npm test`、`npx expo-doctor@latest`、`npx expo export --platform android`を通す。
2. 承認済みのビルド環境で、`npx eas build --platform android --profile development`または`stable`を実行する。
3. APKは許可済みの家族端末だけへ配布する。公開URL、署名鍵、端末識別子を記録しない。
4. Tailscale接続下でログイン、TOTP、画像選択・撮影、アップロード、解析結果・画像表示をtest-only dataで確認する。

## ロールバック

APK配布を停止し、端末からAPKを削除する。VPS、T320、R2のデータや設定は変更しない。
