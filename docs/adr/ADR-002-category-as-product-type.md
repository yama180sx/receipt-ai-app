# ADR-002: CategoryとProductTypeを分離する

Status: Accepted

## 決定

`Category`は家計簿の集計軸、`ProductType`は商品種別として別モデルにする。ProductTypeは標準Category階層に属する。

## 理由

同じ商品種別を異なる集計・表示要件で扱えるようにし、ブランドやOCR文字列と家計簿分類を混同しないため。

## 影響

明細はCategoryとProductTypeを独立して保持する。ProductTypeが未設定でもCategory集計は継続する。
