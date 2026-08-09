# ADR-005: 分類AIには選択可能な葉ProductTypeを候補として渡す

Status: Accepted

## 決定

分類AIは、システムが提示する有効な葉ProductTypeのID・名称からのみ選択する。

## 理由

自由なカテゴリ生成を防ぎ、保存値・集計・辞書を一貫させるため。

## 影響

出力は明細ID、`productTypeId`または`null`、信頼度に限定し、システムが候補・型を検証する。
