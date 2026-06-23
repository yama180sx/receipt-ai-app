# 設計資料（完成版仕様書）

Epic: [#276 Issue #90](https://github.com/yama180sx/receipt-ai-app/issues/276)  
計画: [plan.md](./plan.md)

`docs/design/` は RecAIpt の **as-built 仕様書（正本）** である。コード・テスト済み挙動を根拠とし、ChatGPT 解析出力（[`docs/specs/chatgpt/`](../specs/chatgpt/)）は監査ログとして別途保管する。

---

## 読み方（新規参画者向け）

| やりたいこと | 最初に読む資料 |
|--------------|----------------|
| 全体像・技術スタック | [architecture.md](./architecture.md) |
| DB 列定義・制約 | [database-schema.md](./database-schema.md) |
| 精算・按分の業務ルール | [domain-model.md](./domain-model.md) |
| **按分・精算ルールを変更するとき** | [settlement-change-guide.md](./settlement-change-guide.md) |
| **FE の DTO → UI の流れ** | [architecture.md](./architecture.md) §6.3 |
| API 連携 | [api-spec.md](./api-spec.md) |
| レシート AI 解析 | [ai-pipeline.md](./ai-pipeline.md) |
| 画面・UX | [frontend-screens.md](./frontend-screens.md) |
| 運用・障害対応 | [operations.md](./operations.md) |
| 環境構築 | [ルート README.md](../../README.md) |

---

## 仕様書一覧

| 資料 | 内容 | 元 Issue |
|------|------|----------|
| [plan.md](./plan.md) | 設計資料全体の計画 | #90 |
| [architecture.md](./architecture.md) | アーキテクチャ・デプロイ | #90-1 |
| [database-schema.md](./database-schema.md) | DB 列定義・制約（Prisma 準拠） | 統合（ChatGPT Phase1 突合） |
| [domain-model.md](./domain-model.md) | ドメイン意味・精算・按分 | #90-2 |
| [settlement-change-guide.md](./settlement-change-guide.md) | 按分・精算ルール変更ガイド | #105-3 |
| [architecture.md](./architecture.md) §6.3 | FE DTO / Mapper / domain データフロー図 | #105-4 |
| [api-spec.md](./api-spec.md) | API 仕様 | #90-3 |
| [ai-pipeline.md](./ai-pipeline.md) | 3層正規化・AI パイプライン | #90-4 |
| [frontend-screens.md](./frontend-screens.md) | 画面遷移・フロント | #90-5 |
| [operations.md](./operations.md) | 運用・障害対応 | #90-6 |

ルート [README.md](../../README.md) はオンボーディング（#90-7）。

---

## Issue #90 子 Issue 状態

| 命名 | GitHub | 成果物 | 状態 |
|------|--------|--------|------|
| #90-1 | [#292](https://github.com/yama180sx/receipt-ai-app/issues/292) | [architecture.md](./architecture.md) | 完了 |
| #90-2 | [#293](https://github.com/yama180sx/receipt-ai-app/issues/293) | [domain-model.md](./domain-model.md) | 完了 |
| #90-3 | [#294](https://github.com/yama180sx/receipt-ai-app/issues/294) | [api-spec.md](./api-spec.md) | 完了 |
| #90-4 | [#295](https://github.com/yama180sx/receipt-ai-app/issues/295) | [ai-pipeline.md](./ai-pipeline.md) | 完了 |
| #90-5 | [#296](https://github.com/yama180sx/receipt-ai-app/issues/296) | [frontend-screens.md](./frontend-screens.md) | 完了 |
| #90-6 | [#297](https://github.com/yama180sx/receipt-ai-app/issues/297) | [operations.md](./operations.md) | 完了 |
| #90-7 | [#298](https://github.com/yama180sx/receipt-ai-app/issues/298) | ルート `README.md` | 完了 |

---

## 関連

| 資料 | 内容 |
|------|------|
| [docs/testing/plan.md](../testing/plan.md) | テスト戦略（仕様の根拠） |
| [docs/testing/findings.md](../testing/findings.md) | テストで確定した挙動 |
| [docs/specs/comparison-chatgpt-vs-design.md](../specs/comparison-chatgpt-vs-design.md) | ChatGPT 仕様との突合 |
| [docs/reviews/issue-87/README.md](../reviews/issue-87/README.md) | 精算ドメイン詳細レビュー |
