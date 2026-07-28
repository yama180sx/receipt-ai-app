# productClassification モジュール

このモジュールは商品種別分類を担当する。Phase 1以降の実装で追加する。

## 責務

- 確定履歴・世帯別辞書・標準辞書による分類
- 類似候補と分類AIの呼び出し条件判定
- 分類状態、分類元、信頼度の保存

## 禁止事項

- HTTPの`req`/`res`参照
- Prismaの直接利用（Repositoryを経由する）
- 候補外AI出力の保存
- 他世帯の学習データの参照

詳細は [機能仕様](../../../../docs/features/product-classification/README.md) を参照する。
