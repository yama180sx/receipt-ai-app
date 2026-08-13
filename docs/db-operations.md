# データベース運用ガイド (Database Operation Guide)

> 設計資料からの索引: [design/operations.md](./design/operations.md)（Issue #90-6）。本ファイルは DB マスタ運用の詳細手順を維持する。

## 1. 概要
本システムのデータベース（PostgreSQL）における、マスタデータの初期投入および更新に関する運用ルールを定義します。
データの整合性を保ちつつ、運用中のデータを破壊しないための「使い分け」を徹底してください。

## 2. スクリプトの使い分け

| スクリプト名 | 実行コマンド | 用途 | 影響範囲 |
| :--- | :--- | :--- | :--- |
| **seed.ts** | `npm run prisma:seed` | 開発環境の初期化 | **全データ削除後、再投入** |
| **update-master.ts** | `npm run prisma:update` | 運用・テスト環境の更新 | **マスタデータのみ更新 (upsert)** |
| **reset-receipt-data-preserve-auth.ts** | `npm run prisma:reset-receipt-data` | 開発環境のレシート業務データ初期化 | **認証情報を保持** |
| **reset-test-data-preserve-auth.ts** | `npm run prisma:reset-test-data` | 承認済みのdev/stableテスト運用データ再構築 | **FamilyGroup / FamilyMember以外を削除して固定JSONから再投入** |

---

## 3. 各スクリプトの詳細

### C. 認証を保持した完全テストデータ初期化

Issue #117-5の専用手順でのみ使用する。`RESET_TEST_DATA_CONFIRM`、`RESET_TEST_DATA_ENV`、`RESET_TEST_DATA_BACKUP_REFERENCE`が必須であり、`--dry-run`で世帯招待コード集合、件数、画像削除対象を確認してから実行する。詳細は[実施手順](./reviews/issue-117-5/implementation.md)を参照。

### A. `seed.ts` (初期化用)
- **ファイルパス**: `backend/prisma/seed.ts`
- **動作**: 冒頭で `deleteMany()` を実行し、全テーブルを空にしてからデータを投入します。

### B. 認証を保持したレシートデータ初期化

`npm run prisma:reset-receipt-data` は、レシート、明細、割り勘、精算、商品分類の世帯学習・監査・AI実行ログ、レシートに紐づく利用量ログに加え、Redis上の解析待ち／解析済みBullMQジョブと未保存レシート画像を削除する。`FamilyGroup` と `FamilyMember` は削除・更新しないため、パスワードハッシュ、ロール、TOTP、招待コードを保持できる。世帯別カテゴリ・店舗・プロンプト、および全世帯共通の標準分類ルールも保持する。
- **実行タイミング**:
  - 開発環境でデータ構成をリセットしたいとき。
  - プロジェクトに初めて参画し、ローカル環境を構築するとき。
- **注意**: **実行すると、蓄積したレシート業務データ、世帯別の商品分類学習・監査データ、解析ジョブ、未保存レシート画像は失われます。** `FamilyGroup`と`FamilyMember`は保持するため、パスワードハッシュ、ロール、TOTP、招待コードは失われません。世帯別Category・Store・PromptTemplateと全世帯共通の標準分類ルールも保持されます。

### B. `update-master.ts` (安全な更新用)
- **ファイルパス**: `backend/prisma/update-master.ts`
- **動作**: `upsert` ロジックを使用し、既存のデータを保持したまま、マスタ（Category, Store等）の追加・更新のみを行います。
- **実行タイミング**:
  - カテゴリー（費目）を追加・修正したとき。
  - 本番環境（stable）や運用中のテスト環境でマスタデータを最新化したいとき。
- **注意**: 既存の `Receipt` や `Item` データには一切干渉しません。
- 商品分類の共通マスタも同時に同期します。世帯別辞書・確定履歴・レシート明細は変更しません。
- この同期は既存の未分類明細を遡って再分類しません。既存明細は次節の再分類APIで、対象世帯・期間・件数上限を指定して実行します。

---

## 4. マスタデータ追加時の手順

新しいカテゴリー（例：消費税など）が必要になった際は、以下の手順で反映します。

1. **`update-master.ts` への追記**: `upsert` ロジックの中に新しい定義を追加します。
2. **`seed.ts` への同期**: 初期化時にも反映されるよう、`seed.ts` にも同様の定義を追記します。
3. **実行**: 
   ```bash
   # マスタのみ更新する場合
   docker compose exec backend npm run prisma:update
   ```

---

## 5. 既存明細の再分類

標準分類ルールを追加・編集・無効化した後に既存明細へ適用したい場合は、二要素認証済みの管理者として管理者メニューから実行します。APIは `POST /api/admin/product-classification/reclassification-runs` です。既定では `unclassified` と `needs_review` のみを最大100件再評価し、手動確定済み明細は対象にしません。ルール変更だけで既存明細は更新されません。

実行前に対象世帯・期間・件数上限を確認し、まずdev環境で少数件数から実行してください。レスポンスの `updatedCount`、`unchangedCount`、`failedCount` と `itemAudits` で結果を確認します。同じ条件を再実行して変更がなければ、明細の更新・明細監査ログは増えません。

stable環境での実行は、対象世帯のDBバックアップと実行承認を得た後に行います。誤った分類を戻す自動ロールバックは提供しないため、監査ログを確認して手動修正するか、必要に応じてバックアップから復旧します。

---

## 6. トラブルシューティング: カテゴリー追加で `Unique constraint failed on (id)`

### 原因

`seed.ts` や `update-master.ts` で **明示的な `id`**（1〜9, 99 など）を投入すると、PostgreSQL の `Category_id_seq` が追従せず、次の `prisma.category.create()` が既存 id を採番して失敗します。

### 対処（データを消さずに直す）

```bash
# backend コンテナ or ローカル backend ディレクトリで
npm run prisma:sync-sequences
```

`FamilyGroup` / `FamilyMember` / `Category` の id シーケンスを `MAX(id)` に合わせます。

### 再発防止

- `npm run prisma:seed` 実行時は seed 内で自動同期されます。
- `update-master.ts` 実行後も `Category` シーケンスを同期します。

### 確認

管理者メニュー → カテゴリー設定で新規追加が成功すること。
