# Gemini Free Tier実測手順 — Issue #120

## 1. 目的と対象

この手順は、Free Tierで運用するGemini OCRの実測値を、モデル切替判断と無料枠運用に再利用できる
形で記録するためのものです。現行の対象は、OCR・商品分類ともに
`gemini-3.5-flash-lite`です。

Paid Tierの料金試算・予算・通知しきい値は
[Issue #120-1](https://github.com/yama180sx/receipt-ai-app/issues/637)で扱い、この手順では決定しません。
OCI A1実機での通信・E2E確認は [Issue #118-1](https://github.com/yama180sx/receipt-ai-app/issues/632) のスコープです。

## 2. 事前条件

- `GEMINI_RECEIPT_MODEL` と `GEMINI_PRODUCT_CLASSIFICATION_MODEL` が、検証対象の**固定**モデルIDであることを確認する。`*-latest` は使用しない。
- 対象Googleプロジェクト・対象モデル・TierをGoogle AI Studioで確認する。プロジェクトID、APIキー、レシート画像、プロンプト、Gemini生応答は記録しない。
- 30〜50枚の代表レシートを、縦長・横長・明細数・税表記などの特性だけで匿名化した一覧として準備する。同じ画像を重複投入しない。
- 実測前に、[手動回帰チェックリスト](./regression-checklist.md)の2.1〜2.5を実施できるdev環境を用意する。

## 3. 実施手順

1. Google AI Studioで、実施日時、モデルID、Tier、RPM・TPM・RPDの表示値を記録する。値は変動し得るため、過去の記録を再利用しない。
2. 1回の実施で無料枠を使い切りそうな場合は、少数から開始する。RPD到達の429が発生したら追加呼び出しを行わず、次の太平洋時間午前0時以後に別の実施として再開する。
3. 各レシートを通常の画面からアップロードし、OCR結果を確認して保存する。失敗時も同じ画像を繰り返し再実行しない。
4. 成功・失敗・手動登録への切替・自己修復の有無を、下記の記録様式へ転記する。レシート本文や品名などの個人情報は書かない。
5. 全サンプル完了後に`ApiUsageLog`を集計する。OCR成功ログは確認画面で保存（commit）された後に`receiptId`が設定されるため、保存完了後に集計する。

## 4. 記録様式

### 実施メタデータ

| 項目 | 記録値 |
|---|---|
| 実施日（JST） | |
| 環境 | dev / stable |
| モデルID | |
| Tier | Free |
| AI Studio表示のRPM / TPM / RPD | |
| 代表レシート数 | |
| 実施者 | |

### 結果サマリー

| 指標 | 値 | 算出元 |
|---|---:|---|
| 投入数 | | 手動記録 |
| 保存まで成功した数 / 成功率 | | 手動記録 |
| 日次クォータ到達数 | | 手動記録 |
| 手入力へ切替えた数 | | 手動記録 |
| 自己修復を行ったログ数 / 率 | | `ApiUsageLog` |
| 入力・出力・合計tokenの平均 / p95 | | `ApiUsageLog` |
| Gemini API応答時間の平均 / p95 | | `ApiUsageLog.durationMs` |

失敗理由は`gemini_daily_quota`、`http_429`、`http_5xx`などの固定分類だけを記録し、
プロバイダの生エラー本文は記録しない。

## 5. 集計SQL

以下の日時リテラルを対象期間のUTC時刻へ置き換える。`receiptId`がある成功OCRログだけを
対象にするため、成功率・クォータ到達数はこのSQLではなく手動記録から算出する。

```sql
SELECT
  "modelId",
  COUNT(*) AS successful_receipt_count,
  ROUND(AVG("promptTokens")::numeric, 1) AS avg_prompt_tokens,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY "promptTokens") AS p95_prompt_tokens,
  ROUND(AVG("candidatesTokens")::numeric, 1) AS avg_candidates_tokens,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY "candidatesTokens") AS p95_candidates_tokens,
  ROUND(AVG("totalTokens")::numeric, 1) AS avg_total_tokens,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY "totalTokens") AS p95_total_tokens,
  COUNT(*) FILTER (WHERE "selfRepairRetryCount" > 0) AS self_repaired_count,
  ROUND(AVG("durationMs")::numeric, 1) AS avg_duration_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs") AS p95_duration_ms
FROM "ApiUsageLog"
WHERE "receiptId" IS NOT NULL
  AND "createdAt" >= TIMESTAMPTZ 'YYYY-MM-DD 00:00:00+00'
  AND "createdAt" < TIMESTAMPTZ 'YYYY-MM-DD 00:00:00+00'
GROUP BY "modelId"
ORDER BY "modelId";
```

`durationMs`は、Gemini API呼び出しから応答受領までの時間であり、算術不整合による自己修復が
あった場合は同一ログに累積される。DB上のトークン数と応答時間は、Gemini生応答を保存せずに
比較可能な指標として使う。

## 6. 停止条件と扱い

| 条件 | 対応 |
|---|---|
| 日次Free Tierクォータの429 | 直ちに追加実行を停止し、手入力または次の太平洋時間午前0時以後の手動再実行を案内する。 |
| RPM / TPM由来の429、5xx、タイムアウト | 再試行ポリシーの結果を記録し、連続実行は停止する。継続的に起きる場合はIssue化する。 |
| OCR結果が算術整合性を満たさない | アプリの自己修復結果を確認し、解消しなければ手入力へ切り替える。 |
| APIキー・外向き通信・ARM64固有の失敗 | 実測を停止し、[Issue #118-1](https://github.com/yama180sx/receipt-ai-app/issues/632)のOCI A1確認として切り分ける。 |
| 有料化・費用上限の判断が必要 | Issue #120-1で人間の承認を得る。Free Tierの実測作業では決定しない。 |

## 7. 実測完了の判定

- 実施時点のFree TierのRPM・TPM・RPDを記録している。
- 30〜50件の投入数と、保存成功・失敗・手入力切替の件数を記録している。
- モデル別のtoken、自己修復、応答時間の集計値を記録している。
- 日次クォータ到達時に、追加投入せず既存の手動再実行ポリシーに従ったことを記録している。

実測値そのものは、個人情報を含まない集計値としてIssue #120へ追記する。モデルや運用方針を
変更する判断は、実測記録を人間が確認した後に行う。
