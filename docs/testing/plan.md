# Issue #91 — テスト戦略・実装計画

Epic: [#277 Issue #91](https://github.com/yama180sx/receipt-ai-app/issues/277)

本ドキュメントは **Issue #91** の成果物です。#91-1 以降のテスト導入・実装で共通参照してください。

## 1. 方針サマリー

| 項目 | 決定内容 |
|------|----------|
| テスト先行 | 設計資料（#90）よりテスト実装を先行。判明事項は `findings.md` 経由で #90 へフィードバック |
| Backend 単体・API | **Vitest** + **Supertest** |
| Frontend utils | **Vitest**（`environment: 'node'`） |
| Frontend UI | **Jest** + **jest-expo** + **React Native Testing Library**（Phase 2） |
| E2E | **Maestro**（Native, Later）/ **Playwright**（Web, Later） |
| 手動 | カメラ・Gemini 実 OCR・全画面フロー（[regression-checklist.md](./regression-checklist.md)） |
| CI | PR 時に unit テスト（GitHub ホストランナー）。deploy 用 self-hosted とは分離 |

### ツール選定の根拠

- **Vitest（Backend / utils）**: POC 済み。`NodeNext` + TypeScript で追加設定が少なく、Docker 内でも実行確認済み。
- **Jest + jest-expo（UI）**: Expo SDK 54 公式推奨。RNTL との組み合わせが標準。
- **Supertest**: Express + Prisma 結合テストの定番。`app.ts` 分離後に適用。
- **Gemini 提案との差分**: Jest 一本化ではなく Backend/utils は Vitest を採用。ESLint CI は #91 スコープ外。

## 2. テストピラミッド

```
        ┌─────────────┐
        │ E2E (Later) │  Maestro / Playwright
        ├─────────────┤
        │ Manual Must │  全画面チェックリスト、カメラ/Gemini
        ├─────────────┤
        │ Integration │  Supertest + Docker Postgres (#91-3)
        ├─────────────┤
        │ Unit Must   │  utils 按分・精算・正規化 (#91-2, #91-4)
        └─────────────┘
```

## 3. 自動化 vs 手動

### 自動化 Must

| 対象 | ファイル例 |
|------|-----------|
| 按分端数・小計 | `itemSplitAllocation.ts`, `itemLineTotal.ts`, `splitEditorSplits.ts` |
| 年月境界 | `yearMonth.ts` |
| 金額パース | `parsePositiveYenAmount.ts` |
| 精算 API | `statsController.ts`（#91-3 以降） |
| 認証・テナント | `authMiddleware`, `tenantMiddleware`（#91-3 以降） |

### 手動 Must

| 対象 | 理由 |
|------|------|
| カメラ・画像クロップ | デバイス依存、自動化コスト高 |
| Gemini 実 OCR | 外部 API・非決定論 |
| 全画面フロー回帰 | #87-5 を拡張（#91-5） |

### Should / Later

| 対象 | Issue |
|------|-------|
| 共通 UI（`AppButton` 等 #82〜#85） | jest-expo + RNTL（#91-4 以降 or 別 Issue） |
| Gemini/Worker モック戦略の詳細 | #91-7 |
| E2E クリティカルパス | Maestro / Playwright（Later） |

## 4. 前提作業（ブロッカー）

### `server.ts` の分離（#91-3 前提）

現状の `server.ts` は以下の理由で Supertest 非対応:

1. import 時に `./workers/receiptWorker` が Redis 接続を試行
2. `app.listen()` がモジュール読み込み時に実行
3. supertest 用の `app` エクスポートがない

**対策:** `app.ts`（Express 定義のみ）+ `server.ts`（listen + worker 起動）に分離。テスト時は worker を起動しない。

### テスト DB

- Docker Compose の Postgres を利用（`DATABASE_URL` をテスト用に切替）
- `seed.ts` は全削除するため、結合テスト用 fixture は別途検討（#91-3）

### 外部依存のモック

- **Gemini**: 結合テストでは `vi.mock('../services/geminiService')` 等で必ずモック
- **BullMQ Worker**: テスト時は import しない

## 5. CI 方針

| トリガー | 内容 | ランナー |
|----------|------|----------|
| PR → `develop` | `npm test`（backend + frontend unit） | `ubuntu-latest` |
| PR → `develop` | API 結合（#91-3 完了後） | `ubuntu-latest` + Postgres service |
| push → `main` | 既存 deploy workflow（変更なし） | self-hosted (T320) |

**スコープ外:** ESLint / Prettier（未導入のため別 Issue）

## 6. 着手順（Must）

| 順 | Issue | 内容 |
|----|-------|------|
| 1 | #91-1 | Vitest 基盤、`npm test` |
| 2 | #91-2 | Backend utils 単体 |
| 3 | #91-4 | Frontend utils 単体 |
| 4 | #91-5 | 手動回帰チェックリスト（[regression-checklist.md](./regression-checklist.md)） |
| 5 | #91-3 | `app.ts` 分離 + Supertest API |
| 6 | #91-6 | CI テストゲート |
| 7 | #91-7 | Gemini/Worker モック方針（Should） |

## 7. 子 Issue 対応表

| 命名 | GitHub | 優先度 |
|------|--------|--------|
| #91-1 | [#278](https://github.com/yama180sx/receipt-ai-app/issues/278) | Must |
| #91-2 | [#279](https://github.com/yama180sx/receipt-ai-app/issues/279) | Must |
| #91-3 | [#280](https://github.com/yama180sx/receipt-ai-app/issues/280) | Must |
| #91-4 | [#281](https://github.com/yama180sx/receipt-ai-app/issues/281) | Must |
| #91-5 | [#282](https://github.com/yama180sx/receipt-ai-app/issues/282) | Must |
| #91-6 | [#283](https://github.com/yama180sx/receipt-ai-app/issues/283) | Must |
| #91-7 | [#284](https://github.com/yama180sx/receipt-ai-app/issues/284) | Should |

## 8. 設計資料（#90）へのフィードバック

テスト実施中に判明した仕様の曖昧さ・バグ・設計上の問題は `docs/testing/findings.md` に記録し、#90 の子 Issue または #90 本体へリンクする。

記録例:

- 按分端数ルールの境界ケース
- API エラーレスポンスの不統一
- フロント/バック間の型・計算の差異

## 9. POC 結果（2026-06-04）

| 対象 | 結果 |
|------|------|
| Backend Vitest | ✅ `itemSplitAllocation.test.ts` 2 passed（ローカル + Docker） |
| Frontend Vitest | ✅ `splitEditorSplits.test.ts` 2 passed |
| Supertest | ⚠️ `server.ts` 分離が必要 |
| server.ts import | ⚠️ Redis Worker が起動、Redis 未接続でエラー |

POC ファイル（未マージ）:

- `backend/vitest.config.ts`, `backend/src/utils/itemSplitAllocation.test.ts`
- `frontend/vitest.config.ts`, `frontend/src/utils/splitEditorSplits.test.ts`

## 10. 参考

- Issue #87 手動回帰: [`docs/reviews/issue-87/regression-checklist.md`](../reviews/issue-87/regression-checklist.md)
- Expo 公式: [Unit testing with Jest](https://docs.expo.dev/develop/unit-testing/)
- 設計資料 Epic: [#276 Issue #90](https://github.com/yama180sx/receipt-ai-app/issues/276)
