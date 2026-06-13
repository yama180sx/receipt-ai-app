# RecAIpt モバイル Web 化 — 経緯と次タスク

最終更新: 2026-06-12  
関連 Epic: [#322 Issue #94](https://github.com/yama180sx/receipt-ai-app/issues/322)（モバイル Web 本番化 & 表示 UX）

---

## 1. 背景と方針

### アプリ名称

- **正式名称:** RecAIpt（読み：レシート / Receipt + AI）
- 開発初期の `RecAlpt` 表記は誤り。UI・PWA・ドキュメントを `RecAIpt` に統一済み。

### 運用方針（合意済み）

| 項目 | 方針 |
|------|------|
| 日常利用 | **Expo Go 不要** — スマホブラウザで `http://HOST_IP`（stable Web） |
| 開発・動確 | Expo Go + dev サーバー（`:8081` / `:8082`） |
| App Store | 当面見送り（$99/年） |
| 遠隔地メンバー | 将来検討（VPN / トンネル / VPS 等）。非同期受付トレイは **Epic #95** で別途 |

### 環境 URL（stable の例）

| 用途 | URL |
|------|-----|
| 本番 Web | `http://HOST_IP` |
| 開発 Expo Web | `http://HOST_IP:8082` |
| API | `http://HOST_IP:3000` |

詳細は [mobile-access.md](./mobile-access.md) を参照。

---

## 2. 実装済み（マージ済み）

### PR #329 — Issue #94-1（develop マージ済み）

- stable CORS に Expo dev 用 Origin（`:8082`、`exp://`）を追加
- `docs/mobile-access.md` 作成

### PR #330 — Issue #94-2〜4（develop マージ済み）

| Issue | 内容 |
|-------|------|
| #94-2 | RecAIpt 名称・PWA 設定・UI 表記 |
| #94-3 | 表示モード（自動 / スマホ / Web）選択と保持 |
| #94-4 | Web 版レシート切り取り UI（`ReceiptImageCropModal`） |

主な追加・変更ファイル:

- `frontend/app.json` — 名称・slug・PWA
- `frontend/src/contexts/DisplayModeContext.tsx`
- `frontend/src/hooks/useIsWideLayout.ts`
- `frontend/src/components/DisplayModeSettings.tsx`
- `frontend/src/components/ReceiptImageCropModal.tsx`

---

## 3. PR #331 相当（`fix/recaipt-spelling` ブランチ）

develop へのマージは **未確認 / 未マージ** の可能性あり。以下を含む。

### 3.1 表記・UI 修正

- `RecAlpt` → `RecAIpt`、不要な `uppercase` 削除

### 3.2 Web 撮影・アップロード

| 問題 | 原因 | 対応 |
|------|------|------|
| 撮影ボタン無反応 | Web で `Alert.alert` 複数ボタン非対応 | `AppModal` でカメラ / ギャラリー選択 |
| 「画像がアップロードされていません」 | FormData 送信時に `Content-Type: application/json` が残る | `apiClient` で Web 時は Content-Type を削除 |
| Android Web で切り取り画面が出ない | Modal / state 消失 | `position: fixed` オーバーレイ + `sessionStorage` で URI 復元 |

関連ファイル:

- `frontend/src/utils/receiptUploadFormData.ts`
- `frontend/src/utils/webImageFileRegistry.ts`
- `frontend/src/utils/apiClient.ts`
- `frontend/src/screens/HomeScreen.tsx`

### 3.3 切り取り座標・Canvas 切り取り（未コミット含む）

| 問題 | 原因 | 対応 |
|------|------|------|
| 切り取ったのにプレビューが元画像のまま | `resizeMode="contain"` 時の座標変換誤り | `cropImageWeb.ts` で letterbox 補正 |
| Web で切り取りが不安定 | `ImageManipulator` が Web で弱い | Canvas による `cropImageUriWeb` |

関連ファイル:

- `frontend/src/utils/cropImageWeb.ts`（新規）
- `frontend/src/utils/cropImageWeb.test.ts`（新規）
- `frontend/src/components/ReceiptImageCropModal.tsx`

### 3.4 保存・重複 UX（未コミット含む）

| 問題 | 原因 | 対応 |
|------|------|------|
| 重複時にメッセージが出ない（Web） | `Alert.alert` が Web で非表示 | `showAlert`（`window.alert`）に統一 |
| 重複後も確認画面に留まる | OK 後の画面遷移なし | `onOk: onCancel` でホームへ戻る |
| 重複時に赤いエラーバナー（Expo Go） | 想定内 409 を `console.error` していた | DUPLICATE 時はログ出力しない |

関連ファイル:

- `frontend/src/screens/ReceiptScanScreen.tsx`
- `frontend/src/utils/alertMessage.ts`

### 3.5 Expo Go アップロード不能（未コミット含む）

| 問題 | 原因 | 対応 |
|------|------|------|
| 画像送信できない | Web 向け Content-Type 削除が Native にも効き、`multipart/form-data` が付かない | `apiClient` で **Web: 削除 / Native: `multipart/form-data` 明示** |

---

## 4. 手動動確で確認されたこと

### 解消済み（再テスト推奨）

- Web: 重複保存時にメッセージ表示
- Web / Expo Go: 重複 OK 後にホームへ戻る
- Expo Go: 重複時の赤い `Commit error` バナーが出ない

### 要再確認

- Web: 切り取り後の「加工済みプレビュー」が切り取り範囲と一致するか
- Web: 新規レシートの撮影 → 切り取り → 解析 → 保存の一連フロー
- Expo Go: 撮影 → アップロード → 解析（`multipart/form-data` 修正後）
- #94-5: モバイル Web & Expo Go の総合手動動確

---

## 5. 現在の作業状態（2026-06-12）

### ブランチ

`fix/recaipt-spelling`（`origin/fix/recaipt-spelling` と同期）

### 未コミット変更

| ファイル | 内容 |
|----------|------|
| `frontend/src/utils/cropImageWeb.ts` | 新規 — contain 座標変換・Canvas 切り取り |
| `frontend/src/utils/cropImageWeb.test.ts` | 新規 — 座標変換ユニットテスト |
| `frontend/src/components/ReceiptImageCropModal.tsx` | 切り取りロジック統合 |
| `frontend/src/screens/ReceiptScanScreen.tsx` | 重複 UX・ログ抑制 |
| `frontend/src/utils/apiClient.ts` | FormData の Web / Native 分岐 |

### 推奨コミットメッセージ（参考）

```
fix(frontend): 切り取り座標・重複保存 UX・Expo Go アップロードを修正

- contain 表示を考慮した切り取り（Web は Canvas）
- 重複時はアラート後にホームへ戻り、console.error を出さない
- FormData 送信時の Content-Type を Web / Native で分岐
```

---

## 6. 次のタスク

### 優先度: 高（すぐ）

1. **未コミット変更のコミット & PR #331 更新**
   - 上記 5 ファイルをコミットし、`fix/recaipt-spelling` を push
2. **develop へマージ**
   - マージ後、T320 で frontend 再ビルド:
     ```bash
     docker compose build frontend && docker compose up -d frontend
     ```
3. **#94-5 手動動確**
   - [ ] stable Web（iPhone Safari / Android Chrome）— 撮影・切り取り・保存
   - [ ] Expo Go — 撮影・アップロード・解析・保存
   - [ ] 重複レシート — メッセージ → ホーム復帰、エラーバナーなし
   - [ ] 表示モード切替（スマホ / Web / 自動）

### 優先度: 中（develop 動確後）

4. **develop → main → stable 反映**
   - 動確 OK 後に main マージ、stable 環境へデプロイ
5. **Issue #93-6（USER 2FA 手動動確）**
   - [#314](https://github.com/yama180sx/receipt-ai-app/issues/314) — #94 とは独立だが Open

### 優先度: 低 / Later

6. **Epic #95 — レシート非同期受付・確認トレイ**
   - Epic: [#332](https://github.com/yama180sx/receipt-ai-app/issues/332)
   - 解析待ちをブロックしない UX。遠隔地メンバー向けの将来拡張
7. **#94-6** — Epic #322 上の Later 項目（詳細は Issue 参照）
8. **App Store 配布** — 当面見送り。必要になった時点で再検討

---

## 7. 技術メモ（後続作業向け）

### Web と Native の FormData 差

| プラットフォーム | Content-Type | 理由 |
|------------------|--------------|------|
| Web | 削除（ブラウザが boundary 付きで設定） | 明示すると multer がファイルを受け取れない |
| Expo Go / Native | `multipart/form-data` | RN axios では明示が必要 |

実装: `frontend/src/utils/apiClient.ts` リクエストインターセプター

### 重複判定タイミング

- **解析時ではなく commit（保存）時**
- 条件: 同一世帯内で **店名・日付・金額** が一致 → HTTP 409、`message: "DUPLICATE"`
- Backend: `backend/src/services/receiptService.ts`、`receiptController.ts`

### Web アラート

- `Alert.alert` は Web で複数ボタン・一部メッセージが効かない
- ユーザー向け通知は `showAlert`（`frontend/src/utils/alertMessage.ts`）を使用

### 切り取り UI

- Native（Expo Go）: ImagePicker の `allowsEditing: true` で OS 標準切り取り（`HomeScreen.pickImageNative`）
- Web: `ReceiptImageCropModal` — ドラッグ選択 → Canvas 切り取り → アップロード

---

## 8. 関連リンク

| 種別 | リンク |
|------|--------|
| Epic #94 | [#322](https://github.com/yama180sx/receipt-ai-app/issues/322) |
| Epic #95 | [#332](https://github.com/yama180sx/receipt-ai-app/issues/332) |
| PR #329（#94-1） | develop マージ済み |
| PR #330（#94-2〜4） | develop マージ済み |
| PR #331（表記・Web 修正） | `fix/recaipt-spelling` — マージ要確認 |
| アクセスガイド | [mobile-access.md](./mobile-access.md) |
| 2FA 手動動確 | [#314](https://github.com/yama180sx/receipt-ai-app/issues/314) |

---

## 9. 変更履歴（本ドキュメント）

| 日付 | 内容 |
|------|------|
| 2026-06-12 | 初版 — #94 経緯、動確フィードバック、未コミット修正、次タスクを整理 |
