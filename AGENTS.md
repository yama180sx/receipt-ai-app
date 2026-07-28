# RecAIpt 作業ガイド

## 最初に読む資料

- [設計・実装規約](docs/standards/10_設計・実装規約.md)
- [アーキテクチャ構成・依存方向](docs/standards/11_アーキテクチャ構成・依存方向.md)
- [設計資料（As-built正本）](docs/design/README.md)

## 作業別の参照先

| 作業 | 参照先 |
|---|---|
| API変更 | `docs/openapi/openapi.yaml`、`docs/design/api-spec.md` |
| DB変更 | `backend/prisma/schema.prisma`、`docs/design/database-schema.md` |
| AI・レシート解析 | `docs/design/ai-pipeline.md` |
| フロントエンド | `docs/design/frontend-conventions.md`、`docs/design/frontend-screens.md` |
| 商品分類 | `docs/features/product-classification/README.md` |
| テスト | `docs/testing/plan.md`、`docs/testing/regression-checklist.md` |

## 必須ルール

- API契約の正本は `docs/openapi/openapi.yaml`。
- Backend は Controller → Service → Repository の依存方向を守る。
- テナントデータは必ず `familyGroupId` で分離する。
- 外部AI出力は候補制約とスキーマ検証を通してから保存する。
- 規約の例外や重要な設計変更は ADR を追加または更新して記録する。

## 文書の優先順位

1. Accepted ADR
2. 最新の確定機能仕様
3. 設計・実装規約
4. As-builtアーキテクチャ資料
5. 初期構想・監査・履歴資料
