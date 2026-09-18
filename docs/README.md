# RecAIpt ドキュメント

## 文書の役割と優先順位

内容が競合する場合は、Accepted ADR、最新の確定機能仕様、共通規約、As-built設計資料、初期構想・監査資料の順に扱う。

| 区分 | 入口 | 扱い |
|---|---|---|
| 共通規約 | [standards/](./standards/) | 全作業で守るルール |
| As-built設計資料 | [design/](./design/) | 実装・テストで確認された現行仕様の正本 |
| 機能仕様 | [features/](./features/) | 機能ごとの要件・将来設計（実装前の比較資料は各資料内で履歴として明示） |
| 設計判断 | [adr/](./adr/) | なぜその設計を採用したか |
| テスト | [testing/](./testing/) | テスト戦略・findings・回帰チェック |
| API契約 | [openapi/openapi.yaml](./openapi/openapi.yaml) | 公開APIの正本 |
| 監査資料 | [specs/](./specs/) | ChatGPT原文・突合。正本ではない |
| 過去計画・レビュー | [refactor/](./refactor/)、[reviews/](./reviews/) | 参考・履歴資料 |

## 現在の機能仕様

- [商品単位AI自動分類](./features/product-classification/README.md)

## 運用手順

- [MacBook（Linux Mint 22.3）へのDocker導入手順](./macbook-linux-server-setup.md) — Issue #128 のサーバー環境構築の初期手順
- [運用・障害対応](./design/operations.md) — RecAIptの環境構築、バックアップ、復旧、デプロイ

## 既存資料の棚卸し

| 資料群 | 状態 | 方針 |
|---|---|---|
| `docs/design/` | 有効 | As-built正本として維持する（`design/plan.md`は作成計画の履歴） |
| `docs/testing/` | 有効 | テストの正本・補助資料として維持する |
| `docs/openapi/` | 有効 | 公開API契約の正本として維持する |
| `docs/specs/chatgpt/` | 参考 | 原文監査ログ。変更・正本扱いをしない |
| `docs/refactor/` | 参考 | 完了済みEpicを含む計画・履歴として維持する |
| `docs/reviews/` | 参考 | 対象Issueのレビュー履歴として維持する |
| 運用・アクセス資料 | 有効 | `design/operations.md`と相互参照しつつ維持する |
| `MILESTONE_PHASE1.md` | 参考 | 設計起源として保持し、現行仕様はdesignを参照する |

過去資料は削除せず、Git履歴と本READMEの位置付けにより、現行仕様との混同を避ける。
