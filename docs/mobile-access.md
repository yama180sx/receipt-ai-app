# モバイル・Web アクセスガイド（Issue #94）

RecAIpt（読み：レシート、Receipt + AI）の **本番入口** と **開発用 Expo** の使い分け。

## URL 一覧（stable 環境の例）

`HOST_IP` はroot所有の`/etc/receipt-ai-app/stable.env`にある非機密設定である。確認が必要な場合だけ、管理担当者が`sudo grep '^HOST_IP=' /etc/receipt-ai-app/stable.env`を実行する。値をIssueやGitへ転記しない。

| 用途 | URL | 対象 |
|------|-----|------|
| **本番 Web** | `http://HOST_IP` | 家族の日常利用（iPhone / Android / PC） |
| **開発 Expo Web** | `http://HOST_IP:8082` | QR 表示・ブラウザでの dev 確認 |
| **API** | `http://HOST_IP:3000/health` | ヘルスチェック（直接は開かない） |

dev 環境は Web `:8080`、Expo dev `:8081`、API `:3001`。

## 本番 Web（家族向け）

1. スマホの Safari / Chrome で `http://HOST_IP` を開く
2. 招待コードでログイン
3. **ホーム画面に追加**（任意）— アイコンから起動できる
   - iPhone: Safari → 共有 → 「ホーム画面に追加」
   - Android: Chrome → メニュー → 「ホーム画面に追加」

Expo Go は不要。`:8082` も不要。

## 開発・動確（Android development build）

ネイティブ挙動（カメラ切り取り・生体認証等）の検証用。**本番運用の入口ではない。**

1. T320 で `frontend-dev` コンテナが Up であること
2. Androidには、EASの`development` profileから配布した **RecAIpt (dev)** をインストールする
3. RecAIpt (dev)をホーム画面から起動して、development build用Metroへ接続する
4. 招待コードでログイン

`frontend-dev`はdevelopment build専用である。Expo GoのQRをここで読ませてはいけない。

## Expo Go（補助検証だけ）

Expo Goは日常利用・Android development buildの代替ではない。SDK互換性の確認など、Issueで必要とした補助検証にだけ使う。

Expo Goとdevelopment buildは同じMetroを共有しない。root管理のT320では、管理担当者が対象環境のExpo Go専用Metroを明示的に開始する。

```bash
# dev環境
sudo systemctl start receipt-expo-go-dev.service

# stable環境
sudo systemctl start receipt-expo-go-stable.service
```

PCでは、対象環境のroot所有設定にある`HOST_IP`と`EXPO_GO_PORT`でExpo Go専用Metroを開き、そのQRだけをExpo Goでスキャンする。値やQRのURLはIssue、PR、Git、チャットへ記録しない。終了時は同じ環境のserviceを停止する。

```bash
sudo systemctl stop receipt-expo-go-dev.service
# または stable: receipt-expo-go-stable.service
```

Expo GoはプロジェクトのSDK 58と互換のある版を使用する。Expo Goの障害時に`frontend-dev`を`--go`へ戻したり、development APKを削除・再作成したりしない。

## トラブルシュート

| 症状 | 確認 |
|------|------|
| development build / Web dev の URL | `frontend-dev`のログ冒頭の案内を参照。Expo標準ログのlocalhost URLは使わない。 |
| Expo GoのQRがdevelopment buildを開く、またはその逆 | 対象のMetroを停止し、用途に合うroot管理serviceだけを開始する。`frontend-dev`と`frontend-go`を兼用しない。 |
| `:8082` で招待コードが通らない | root所有設定のCORS関連値と`HOST_IP`を確認し、管理担当者が固定unitでstableを再デプロイする。`setup-env.sh`やユーザー所有Composeは使わない。別PC／スマホからは`http://HOST_IP:8082`を使う。 |
| 招待コード入力後に進まない（Android Web） | 旧ビルドは `:3000` 直叩きで CORS / ポート到達性の問題あり。**frontend を再ビルド**（`/api` 同一 Origin プロキシ）。それでも失敗する場合は Wi‑Fi 同一 LAN・`http://HOST_IP` でアクセスしているか確認 |
| Expo Go が繋がらない | AndroidのExpo GoがSDK 58互換か、VPN/Wi-Fi到達性、Expo Go専用Metroの`HOST_IP`・`EXPO_GO_PORT`を管理担当者が確認する。 |
| iPhone でカメラが起動しない | HTTP 制限の可能性 — ギャラリーから選択、または Web 切り取り UI（#94-4）を利用 |

## 関連 Issue

- Epic: [#322](https://github.com/yama180sx/receipt-ai-app/issues/322)（#94）
- 認証手動動確: [#314](https://github.com/yama180sx/receipt-ai-app/issues/314)（#93-6）
