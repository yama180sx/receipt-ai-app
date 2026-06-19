# Issue #90 — 設計資料・実装計画

Epic: [#276 Issue #90](https://github.com/yama180sx/receipt-ai-app/issues/276)

本ドキュメントは **Issue #90** の成果物です。#90-1 以降の設計資料作成で共通参照してください。

## 1. 方針サマリー

| 項目 | 決定内容 |
|------|----------|
| 記述方式 | **As-built（実装準拠）** — コードを正とし、テストで検証済みの挙動を仕様として書く |
| 入力ソース | ソースコード、Prisma スキーマ、[#91 テスト計画](../testing/plan.md)、[findings](../testing/findings.md)、Issue #87 レビュー資材 |
| 配置 | `docs/design/` に新規資料、`docs/` 既存運用ドキュメントは統合・リンク |
| テストとの関係 | [#91](https://github.com/yama180sx/receipt-ai-app/issues/277) 完了後に着手。曖昧点は `docs/testing/findings.md` → 本計画の該当子 Issue へ |

## 2. ドキュメント体系

```
docs/
├── design/                    # 本 Epic の成果物（新規）
│   ├── plan.md                # 本ファイル
│   ├── README.md              # 完成版仕様書索引
│   ├── architecture.md        # #90-1 → [architecture.md](./architecture.md)
│   ├── database-schema.md     # DB 列定義（ChatGPT Phase1 突合）
│   ├── domain-model.md        # #90-2
│   ├── api-spec.md            # #90-3
│   ├── ai-pipeline.md         # #90-4
│   ├── frontend-screens.md    # #90-5
│   └── operations.md          # #90-6（運用統合）
├── testing/                   # #91 成果物（仕様の根拠）
├── db-operations.md           # #90-6 で design/operations へ統合リンク
├── restore-manual.md
├── MILESTONE_PHASE1.md        # 歴史資料として保持、design へ要点移行
└── reviews/issue-87/          # 精算ドメイン詳細（#90-2 / #90-5 から参照）
```

## 3. 既存ドキュメントとの関係

| ファイル | 扱い |
|----------|------|
| `README.md` | 現行化済み（技術スタック・セットアップ） — [README.md](../../README.md) |
| `docs/MILESTONE_PHASE1.md` | 3層正規化の起源として参照。#90-4 で再整理 |
| `docs/db-operations.md` | #90-6 に統合または相互リンク |
| `docs/restore-manual.md` | #90-6 に統合または相互リンク |
| `docs/reviews/issue-87/` | 精算・按分の深掘り資料として維持 |
| `docs/testing/plan.md` | テスト観点の仕様補助として参照 |
| `docs/specs/chatgpt/` | ChatGPT ZIP 解析の監査ログ（正本は design） |
| `docs/specs/comparison-chatgpt-vs-design.md` | ChatGPT 仕様との突合記録 |

## 4. 作成対象と優先度

| 優先 | 資料 | 子 Issue | 主な読者 |
|------|------|----------|----------|
| Must | [アーキテクチャ概要](./architecture.md) | #90-1 | 全体把握 |
| Must | ドメインモデル & 業務ルール | #90-2 | DB・精算・按分 |
| Must | API 仕様 | #90-3 | FE/BE 連携 |
| Must | 3層正規化 & AI パイプライン | #90-4 | OCR・マスタ |
| Should | 画面遷移 & フロント | #90-5 | UI・権限 |
| Should | 運用・障害対応 | #90-6 | 運用 |
| Must | README & オンボーディング | #90-7 | 新規参画 |

## 5. 着手順（推奨）

```
#90-1（構成）→ #90-2（ドメイン）→ #90-3（API）→ #90-4（AI）
    → #90-5（画面）→ #90-6（運用）→ #90-7（README）
```

- **#90-2 → #90-3** の順が重要（ドメイン理解後に API を書くと漏れが少ない）
- **#90-7** は他資料の概要を README に反映するため最後が効率的

## 6. 子 Issue 対応表

| 命名 | GitHub | 優先度 |
|------|--------|--------|
| #90-1 | [#292](https://github.com/yama180sx/receipt-ai-app/issues/292) | Must |
| #90-2 | [#293](https://github.com/yama180sx/receipt-ai-app/issues/293) | Must |
| #90-3 | [#294](https://github.com/yama180sx/receipt-ai-app/issues/294) | Must |
| #90-4 | [#295](https://github.com/yama180sx/receipt-ai-app/issues/295) | Must |
| #90-5 | [#296](https://github.com/yama180sx/receipt-ai-app/issues/296) | Should |
| #90-6 | [#297](https://github.com/yama180sx/receipt-ai-app/issues/297) | Should |
| #90-7 | [#298](https://github.com/yama180sx/receipt-ai-app/issues/298) | Must |

## 7. テストからのフィードバック

[`docs/testing/findings.md`](../testing/findings.md) に記録した項目は、該当する design 子 Issue の Acceptance Criteria または本文に反映する。

記録例（テスト実施時に追記）:

- 按分端数ルール（最後のメンバーに残額）→ #90-2, #90-3
- API エラーレスポンス形式 → #90-3
- 精算サマリーと ItemSplit の整合 → #90-2, #90-5

## 8. API ドキュメント化のスコープ（#90-3 向け）

### 認証・テナント

| メソッド | パス | 保護 |
|----------|------|------|
| POST | `/api/auth/login` | なし |
| * | `/api/admin/*` | JWT + ADMIN |
| * | `/api/*`（上記以外） | JWT + tenantMiddleware |

### 業務 API（抜粋 — 詳細は #90-3）

| 系 | 例 |
|----|-----|
| receipts | GET/POST/PATCH/DELETE `/api/receipts`, 按分 `POST .../items/:itemId/splits`, commit |
| stats | GET `/api/stats/monthly`, settlement, transfers |
| categories | GET/POST/DELETE `/api/categories` |
| product-master | GET/PATCH/DELETE `/api/product-master` |

## 9. 完了条件（Epic #90）

- [ ] 子 Issue #90-1 〜 #90-7 が GitHub 上に存在し AC が明記されている
- [ ] 本 `plan.md` が `develop` にマージされている
- [ ] Must 子 Issue の着手順が合意されている

## 10. 参考

- テスト Epic: [#277 Issue #91](../testing/plan.md)
- 精算レビュー: [`docs/reviews/issue-87/README.md`](../reviews/issue-87/README.md)
- フェーズ1記録: [`docs/MILESTONE_PHASE1.md`](../MILESTONE_PHASE1.md)
