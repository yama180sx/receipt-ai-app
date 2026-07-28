# 商品単位AI自動分類 — ソース照合レビュー

対象 Issue: [#539 Issue #107](https://github.com/yama180sx/receipt-ai-app/issues/539)

## 1. 結論

現行実装は、画像OCRとカテゴリ推定の土台を持つが、商品種別分類のためのデータモデル・履歴・状態管理・AI境界は未実装である。Phase 1では既存の`ProductMaster`を置換する新基盤を導入し、既存データの変換は行わず初期化する方針が妥当である。

## 2. 現行コードとの照合

| 領域 | 現行根拠 | 現行動作 | 新仕様との差分 |
|---|---|---|---|
| 画像解析 | `backend/src/services/geminiService.ts` | `RECEIPT_ANALYSIS`プロンプトと画像をGeminiへ送る | 分類AIを別Provider・別プロンプトにする |
| 分類入口 | `services/receipt/receiptAnalysisService.ts` | 商品名・店舗名を正規化しカテゴリを付与 | CategoryとProductTypeを分離する |
| 優先順位 | `services/categoryService.ts` | 同一店舗ProductMaster、店舗不問ProductMaster、キーワード、その他 | 履歴、世帯辞書、標準辞書、類似、AIへ置換する |
| 学習 | `receiptProductMasterLearning.ts` | `name + storeName + familyGroupId`へカテゴリをupsert | 確定履歴・辞書・別名・修正履歴へ分解する |
| 確定保存 | `receiptCommitPersistence.ts` | 最終カテゴリをProductMasterへ保存 | 分類メタデータを保存し、ProductMasterを廃止する |
| 手動修正 | `receiptUpdateService.ts` | 明細カテゴリ更新時にもProductMasterへ保存 | 修正範囲を選択して世帯データへ反映する |
| DB | `backend/prisma/schema.prisma` | Categoryは世帯別平坦、ItemはcategoryIdのみ | 共通階層マスタ、ProductType、分類状態・履歴を追加する |
| API | `docs/openapi/openapi.yaml` | 明細はcategoryIdのみ | ProductTypeと分類メタデータの契約を追加する |
| UI | `ReceiptScanItemList`、`ReceiptDetailItemList` | カテゴリのみ選択できる | CategoryとProductTypeを分け、状態・修正範囲を表示する |

## 3. 既存設計資料との整合

- `docs/design/ai-pipeline.md` は現行`ProductMaster`中心のas-built資料である。Phase 1実装後に新仕様に更新する必要がある。
- `docs/design/database-schema.md` と `docs/design/domain-model.md` は新モデル導入後に更新が必要である。
- `docs/openapi/openapi.yaml` が公開API契約の正本であり、Phase 1以降のAPI変更は先にここへ反映する。
- `docs/testing/plan.md` はGeminiのモック、BullMQ非起動、DB結合テストを前提にしており、分類AIにも適用する。

## 4. 影響範囲

### Phase 1

- Prisma schema / migration / seed
- `ProductMaster` Repository・Service・Controller・Route・OpenAPI・Frontend管理画面の廃止または置換
- レシート解析、確定保存、編集、明細カテゴリ更新
- Category API、統計、テストfixture
- データ初期化・バックアップ手順

### 後続

- 類似検索（PostgreSQL `pg_trgm`）
- 分類AI Provider・プロンプト・利用ログ
- 明細確認・辞書管理・要確認一覧UI
- 商品種別・階層統計

## 5. リスクと対策

| リスク | 対策 |
|---|---|
| 初期化で想定外データを失う | 環境ごとのバックアップ、対象テーブル確認、開発環境先行、明示承認 |
| 世帯間の学習漏えい | 全辞書・履歴・修正にfamilyGroupIdを持たせ、結合テストを追加 |
| AIの誤分類 | 候補制約、状態管理、ユーザー修正、修正率評価 |
| 範囲外の商品が未分類に溜まる | `outside_initial_scope`を区別し、後続の種別追加時に再分類対象にする |
| #58との重複 | pg_trgmは共有基盤、履歴検索UIは#58に残す |

## 6. 実装開始前の確認結果

本資料作成時点で、次の方針は合意済みである。

- 固定標準カテゴリと共通ProductType
- ProductMaster廃止、テストデータ初期化、管理者アカウント維持
- 完全一致を優先し、類似検索と分類AIは後続フェーズ
- 未分類・要確認でもレシートを保存する
- 手動修正の適用範囲を選択可能にする
- Phase 1からPhase 6までを別Issueで実装する
