# Expo Router PoC（Issue #403 / #98-8-11）

Epic: [#378](https://github.com/yama180sx/receipt-ai-app/issues/378)  
本番移行: [#404](https://github.com/yama180sx/receipt-ai-app/issues/404)（#98-8-12）

## 目的

`App.tsx` + `currentView` + `AppViewRouter` から **Expo Router** への移行可否を、Login / Home / History の 3 画面 + Web で検証する。

## PoC の起動方法

デフォルトは従来の `App.tsx` エントリ（本番同等）。PoC ルートを有効にする場合:

```bash
cd frontend
npm run start:router-poc      # Native
npm run web:router-poc        # Web（URL / 戻る / リロード検証用）
```

環境変数 `EXPO_PUBLIC_EXPO_ROUTER_POC=true` で `index.ts` が `expo-router/entry` を読み込む。

## PoC ルート構成

| URL（Web） | ファイル | 画面 | 備考 |
|------------|----------|------|------|
| `/login` | `app/login.tsx` | Login | 未ログイン時の入口。ログイン済みは `/` へ Redirect |
| `/` | `app/(app)/index.tsx` | Home | `(app)/_layout` で認証ガード |
| `/history` | `app/(app)/history.tsx` | History | `router.back()` / 未ログインガード |

### Provider 配置

| レイヤ | 配置内容 |
|--------|----------|
| `app/_layout.tsx` | `SafeAreaProvider`, `DisplayModeProvider`, `AppSessionProvider`, 起動ローディング, 生体認証ロック |
| `app/(app)/_layout.tsx` | 認証 Redirect, `ReceiptTrayProvider`, Stack |
| `app/login.tsx` | 未認証専用（Provider 外側の Slot 経由） |

セッション状態は `AppSessionContext`（`useAppSession` のラップ）で Router 各画面から参照。

## 全 view → URL 対応表（#404 草案）

現行 `AppViewType`（13 view）の Expo Router 移行案。パラメータ付き画面は dynamic route を想定。

| AppViewType | 提案 URL | 優先度 | 備考 |
|-------------|----------|--------|------|
| `main` | `/` | PoC 済 | Home + MainToolbar |
| `history` | `/history` | PoC 済 | 一覧 |
| `split_editor` | `/history/[receiptId]/split` | 高 | `targetReceipt` を URL + fetch に置換 |
| `stats` | `/stats` | 中 | |
| `settlement_summary` | `/settlement` | 中 | |
| `receipt_tray` | `/tray` | 高 | トレイ ↔ Scan 連携 |
| `receipt_scan` | `/scan` または `/scan/[jobId]` | 高 | `resultData` / jobId を route params 化 |
| `admin_menu` | `/admin` | 低 | ADMIN ロールガード追加 |
| `category_mgr` | `/admin/categories` | 低 | |
| `product_master` | `/admin/product-master` | 低 | |
| `prompt_editor` | `/admin/prompts` | 低 | |
| `admin_stats` | `/admin/stats` | 低 | |
| `totp_settings` | `/settings/totp` | 中 | |

**ログイン前**

| 状態 | 提案 URL |
|------|----------|
| Login | `/login` |
| BiometricLock | `/lock`（検討）または root overlay 維持 |

## Web 検証チェックリスト（PoC 実施時）

- [ ] `/login` → ログイン成功 → URL が `/` に変化
- [ ] `/` → 履歴 → `/history`、ブラウザ戻るで `/` に復帰
- [ ] `/history` をリロードしても未ログインなら `/login` へ Redirect
- [ ] ログイン済みで `/login` 直アクセス → `/` へ Redirect
- [ ] ログアウト → `/login` へ遷移

## Go / No-Go 判断

| 項目 | 結果 | メモ |
|------|------|------|
| Native ビルド / Expo Go | **Go（条件付き）** | `start:router-poc` で Login → Home → History の遷移を確認。PoC 外画面は Alert で明示 |
| Web URL ルーティング | **Go** | file-based routing で `/`, `/history`, `/login` が分離可能 |
| 認証ガード | **Go** | `(app)/_layout` の Redirect + login の逆 Redirect で二方向ガード |
| Provider / セッション共有 | **Go** | `AppSessionContext` で Router 画面から `useAppSession` 相当を利用 |
| 生体認証ロック | **Go（現行維持）** | root `_layout` の overlay として継続可能（#404 でも URL 化は任意） |
| パラメータ付き画面（scan / split） | **要設計** | AsyncStorage `@app_view` / `@app_result` 依存の解消が #404 の主工数 |
| `@app_view` 永続化 | **No-Go（PoC では未着手）** | #404 で URL を正とし AsyncStorage view 保存を廃止 |
| デフォルトエントリ切替 | **No-Go（PoC では flag 維持）** | develop マージ後も `EXPO_PUBLIC_EXPO_ROUTER_POC` 未設定時は従来 App |

### 総合判定: **Go → #404 へ進行**

Expo Router による file-based routing と Web 深リンクは PoC 範囲で問題なし。全画面移行は #404 で 4〜6 人日規模（scan / split / tray 連携と AsyncStorage 廃止がリスク集中）。

## #404 への引き継ぎ

1. `EXPO_PUBLIC_EXPO_ROUTER_POC` を削除し `main` を `expo-router/entry` に固定（または index.ts 簡素化）
2. 上表の残り 10 view を `(app)` / `(admin)` グループに段階追加
3. `receipt_scan` / `split_editor` の route params 設計と `App.tsx` 削除
4. `@app_view` / `@app_result` の AsyncStorage 永続化を URL + API 再取得に置換
5. E2E: Web 戻る / リロード / 未ログインガードの回帰テスト追加

## 関連ファイル

- `frontend/app/` — PoC ルート
- `frontend/src/features/app/contexts/AppSessionContext.tsx` — セッション Context
- `frontend/src/features/app/components/MainToolbar.tsx` — Home ツールバー共通化
- `frontend/index.ts` — PoC feature flag エントリ
