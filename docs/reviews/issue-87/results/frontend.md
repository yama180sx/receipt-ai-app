# レビュー結果 — Issue #87-3 Frontend

| 項目 | 値 |
|------|-----|
| 対象 Issue | #87-3 ([#259](https://github.com/yama180sx/receipt-ai-app/issues/259)) |
| レビュー日 | 2026-05-30 |
| ブランチ（作業用） | `feature/issue-87-3-frontend-settlement-review` |
| 前提 | #87-2 Backend 按分端数ルール（配列最後に残額）マージ済み |

## 採点サマリー

| 観点 | スコア (/100) | 主な減点理由 |
|------|---------------|----------------|
| アーキテクチャ | 68 | SplitEditor 570行・計算ロジック直書き |
| 型の堅牢性 | 62 | `receipt: any`, `summaryData: any[]` |
| パフォーマンス・手戻り | 65 | 保存 payload と Backend 端数ルールの不一致、Web Alert |
| **総合（参考）** | **65** | |

## 指摘一覧

| ID | 優先度 | 観点 | ファイル | 要約 | 対応 |
|----|--------|------|----------|------|------|
| R-F001 | **Must** | データ整合 | `SplitEditorScreen` | 端数は UI 先頭、API は配列最後。`amount>0` のみ送信でズレ | ✅ `splitEditorSplits.ts` |
| R-F002 | **Must** | 手戻り | `SettlementSummaryScreen` | 取得失敗が console のみ | ✅ `showAlert` |
| R-F003 | **Must** | 手戻り | 両画面 | Web で `Alert.alert` が効かない | ✅ `alertMessage.ts` |
| R-F004 | Should | 型 | 両画面 | `any` 多用 | #87-4 |
| R-F005 | Should | アーキ | `SplitEditorScreen` | 単一巨大コンポーネント | 未対応 |
| R-F006 | Should | 手戻り | `SplitEditorScreen` | 小計計算の重複 | 一部 `calcItemTotal` 化 |

## Must の実装方針

### R-F001

- `buildItemSplitSavePayload`: 全 activeMembers を送信、端数負担者（`activeMembers[0]`）を **配列末尾** に配置
- `calcItemTotal` で小計計算を共通化（保存・表示の主要箇所）

### R-F002 / R-F003

- `showAlert` で Web / ネイティブ両対応
- 精算取得失敗・送金・送金額バリデーション・割り勘保存完了で使用
- 送金額のマイナス入力は `parsePositiveYenAmount.ts` で拒否（訂正機能は Issue #88 / #265）

## 手動確認（マージ前）

- [ ] 割り勘: 2〜3人、％/円編集 → 保存 → 精算サマリーと一致
- [ ] 一括調整行のカスケード
- [ ] 精算サマリー: 月切替・送金モーダル
- [ ] Web: 保存完了・エラー・送金成功が表示される
- [ ] スマホ: 上記の退行なし
