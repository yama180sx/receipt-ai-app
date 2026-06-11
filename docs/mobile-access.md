# モバイル・Web アクセスガイド（Issue #94）

RecAIpt（読み：レシート、Receipt + AI）の **本番入口** と **開発用 Expo** の使い分け。

## URL 一覧（stable 環境の例）

`HOST_IP` は T320 の LAN IP（例: `192.168.1.32`）。`grep '^HOST_IP=' ~/stable/receipt-ai-app/.env` で確認。

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

## 開発・動確（Expo Go）

ネイティブ挙動（カメラ切り取り・生体認証等）の検証用。**本番運用の入口ではない。**

1. T320 で `frontend-dev` コンテナが Up であること
2. PC で `http://HOST_IP:8082` を開き QR を表示
3. スマホに **Expo Go** をインストール、同一 Wi-Fi で QR をスキャン
4. 招待コードでログイン

stable の backend は `:80` に加え `:8082` / `exp://` を CORS 許可している（Issue #94-1）。

## トラブルシュート

| 症状 | 確認 |
|------|------|
| `:8082` で招待コードが通らない | backend の `CORS_ORIGIN` に `:8082` と `exp://` が含まれるか、`docker compose restart backend` |
| Expo Go が繋がらない | 同一 Wi-Fi、`HOST_IP` が QR の URL と一致するか |
| iPhone でカメラが起動しない | HTTP 制限の可能性 — ギャラリーから選択、または Web 切り取り UI（#94-4）を利用 |

## 関連 Issue

- Epic: [#322](https://github.com/yama180sx/receipt-ai-app/issues/322)（#94）
- 認証手動動確: [#314](https://github.com/yama180sx/receipt-ai-app/issues/314)（#93-6）
