# Android development build 運用（Issue #94-6）

## 目的

Android Expo Goが使えない場合でも、RecAIpt専用のAndroid APKで家族限定の実機検証を行う。Google Play公開は対象外である。

この資料は、Android development APKを作る場所と手順を一意にする運用手順でもある。APK作成のたびに古いclone、運用サーバー、MacBook用の作業ツリーを探さない。

## プロファイル

| profile | 用途 | Metro | 配布物 |
|---|---|---|---|
| `development` | 実装・ネイティブ機能の検証 | 必要。VPN内の`frontend-dev`を利用 | 内部配布APK |
| `stable` | 家族限定の動作確認 | 不要。JavaScript bundleをAPKへ内包 | 内部配布APK |

両方ともAPIへはTailscale等のVPN経由で接続する。`EXPO_PUBLIC_API_URL`にはVPN内frontendの`/api` URLだけを設定する。実値はGit、Issue、PR、チャットに書かない。

## ビルド前提

- `frontend/eas.json` のprofileを使う。
- `development` profileはEASの`development`環境を明示的に使う。
- `EXPO_PUBLIC_API_URL`はEASの`development`環境で管理する。値はGit、Issue、PR、チャット、端末ログへ書かない。
- `EXPO_PUBLIC_*`はAPKに含まれるため、認証情報、API token、鍵を渡してはならない。
- EASアカウント、署名情報、APK配布は外部状態を変更する。対象commit・profile・配布先・影響範囲を確認して明示承認を得てから行う。

## 専用ビルド作業場所

### 使う場所

APKは、通常の開発PC上に一か所だけ用意した**専用ビルド作業場所**から作る。絶対パスはPCごとのローカル情報であり、Gitには記録しない。

- 作業場所は`origin/develop`を取得する専用cloneとし、MacBook専用WIPなど別目的の作業ツリーを流用しない。
- 同じPCで継続利用する場合は、そのcloneを更新して使う。毎回別の場所へcloneしない。
- 一時利用にする場合は、ビルド・端末受入の完了後に作業場所全体をごみ箱へ移動してよい。削除前に未コミット変更とGit管理外の設定ファイル名だけを確認する。

### 使わない場所

- **T320、KAGOYAなどの運用サーバー**: EAS CLIの認証状態を残さず、運用checkoutのアーカイブをクラウドへ送らない。
- **MacBook専用WIP、過去の検証clone**: 固有の未統合作業や古い依存関係を混在させない。
- **Expo Go**: development APKの再作成経路ではない。Expo Goの障害は別Issueで扱う。

## APK作成の標準手順

### 1. 作成対象を固定する

1. 専用作業場所で`develop`へ切り替え、fast-forwardで更新する。
2. `git status --short`が空であることを確認する。
3. `git rev-parse --short HEAD`で対象commitを確認する。
4. Issueまたは作業記録には、対象commit、profile、実施日時、受入結果だけを残す。APK URL、VPN内URL、署名情報、端末識別子、環境変数値は残さない。

### 2. ローカルの非秘密事前確認

Node.js 22 LTSを使用する。依存関係は専用作業場所内だけへ導入する。

```bash
cd frontend
npm ci
npm test
npx expo-doctor@latest
npx expo export --platform android
```

EASへのログイン後、`development`環境に`EXPO_PUBLIC_API_URL`という**名前**が存在することだけを確認する。値は表示・転記しない。存在しない場合は、ビルドを開始せずEASダッシュボード上でdevelopment環境の設定を復旧する。

### 3. EAS Build

事前確認と明示承認が完了した場合だけ、次を実行する。

```bash
npx eas-cli@latest build --platform android --profile development
```

- `development` profileはinternal distributionのAPKを作る。Google Playへのsubmitはしない。
- EAS Buildが作成するAPKはSDKまたはnative設定を含む。SDK更新、`expo-dev-client`更新、Android plugin／app config変更後は、Metroの再起動やキャッシュ削除だけで済ませず新しいAPKを作る。
- buildの開始元は専用作業場所だけとし、T320やKAGOYAでEAS CLIへログインしない。

### 4. 端末への置換と受入

1. 新しいAPKを許可済みの検証端末へ配布・インストールする。旧APKを先に削除する必要はない。
2. `RecAIpt (dev)`が起動することを確認し、VPN接続下でdevelopment build用のMetroへ接続する。
3. ログイン、TOTP、履歴、画像選択・撮影、アップロード、解析結果・画像表示、確認保存をtest-only dataで確認する。
4. SDK／native設定変更の受入では、端末が新APKへ置き換わったことを確認してから、JavaScript側の画面不具合を調査する。

## EAS認証と整理

- Expoアカウント名やEAS環境変数名は確認に使えるが、token、パスワード、環境変数値、APK URL、署名情報は出力・共有しない。
- 専用作業場所を廃止する場合は、Git作業ツリーの状態と設定ファイル名だけを確認し、作業場所全体をごみ箱へ移動する。npmの共有キャッシュは他のNode.js作業でも使うため、専用作業場所の削除対象にしない。
- EASログインをそのPCで今後使わない場合だけ、`npx eas-cli@latest logout`で端末ローカルのログイン状態を解除する。

## stable profileの境界

`stable` profileは家族限定の動作確認用であり、JavaScript bundleをAPKへ内包する。stable APKの作成・配布はdevelopment APKの手順と混同せず、対象commitと利用目的を改めて承認する。

## ロールバック

APK配布を停止し、端末からAPKを削除する。VPS、T320、R2のデータや設定は変更しない。
