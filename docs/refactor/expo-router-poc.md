# Expo Router 移行（Issue #403 / #404）

Epic: [#378](https://github.com/yama180sx/receipt-ai-app/issues/378)

## 状態

**#404 本番移行完了** — 全主要画面を Expo Router（`frontend/app/`）へ移行し、`App.tsx` / `AppViewRouter` / `currentView` を廃止。

エントリ: `package.json` の `"main": "expo-router/entry"`

## ルート対応表

| URL | 画面 |
|-----|------|
| `/login` | Login |
| `/` | Home |
| `/history` | 履歴一覧 |
| `/history/[receiptId]/split` | 割勘エディタ |
| `/stats` | 統計 |
| `/settlement` | 精算サマリー |
| `/tray` | 確認トレイ |
| `/scan/[jobId]?returnTo=home\|tray` | レシート確認 |
| `/admin` | 管理メニュー |
| `/admin/categories` | カテゴリー設定 |
| `/admin/product-master` | 学習マスタ |
| `/admin/prompts` | プロンプト管理 |
| `/admin/stats` | AI コスト統計 |
| `/settings/totp` | TOTP 設定 |

## Provider 配置

| レイヤ | 内容 |
|--------|------|
| `app/_layout.tsx` | SafeArea, DisplayMode, AppSession, ローディング, 生体認証ロック |
| `app/(app)/_layout.tsx` | 認証ガード, ReceiptTrayProvider, Stack |
| `app/login.tsx` | 未認証 |

## パラメータ付き画面

- **Scan**: `jobId` を URL に載せ、`fetchReceiptScanInitialData` で再取得。`returnTo` で戻り先（`/` or `/tray`）を指定。
- **Split**: 履歴から遷移時は in-memory pending cache、Web リロード時は `listReceipts` から再構築。

## 廃止したもの

- `App.tsx`, `AppViewRouter.tsx`, `AppViewType`, `currentView`
- AsyncStorage `@app_view` / `@app_result`
- `EXPO_PUBLIC_EXPO_ROUTER_POC` feature flag

## Web 回帰チェック

- [ ] `/login` → ログイン → `/`
- [ ] `/` → `/history` → ブラウザ戻る
- [ ] `/history` リロード（未ログイン → `/login`）
- [ ] トレイ → 確認 → `/scan/[jobId]` → 保存 → 戻る
- [ ] 履歴 → 割勘 → `/history/[id]/split`

## PoC 記録（#403）

PoC 時の Go/No-Go 判断は **Go**。詳細は git 履歴上の `docs/refactor/expo-router-poc.md`（#404 で本書に統合）を参照。
