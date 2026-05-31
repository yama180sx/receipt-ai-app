# Issue #87 — 精算・按分ドメイン LLM レビュー準備

Epic: [#246 Issue #87](https://github.com/yama180sx/receipt-ai-app/issues/246)

本ディレクトリは **Issue #87-1 (#257)** の成果物です。#87-2 / #87-3 以降のレビュー・リファクタで共通参照してください。

## ドキュメント一覧

| ファイル | 用途 |
|----------|------|
| [scope.md](./scope.md) | レビュー対象ファイル・行範囲・スコープ外 |
| [prompt.md](./prompt.md) | LLM に渡すプロンプト（コピペ用） |
| [triage-rules.md](./triage-rules.md) | Must / Should / Later の判定基準 |
| [review-result-template.md](./review-result-template.md) | レビュー結果の記録テンプレート |
| [assignment.md](./assignment.md) | 指摘の振り分け先（#87-2 / #87-3 / #87-4） |
| [regression-checklist.md](./regression-checklist.md) | **#87-5** 回帰チェックリスト（実施記録） |
| [should-backlog.md](./should-backlog.md) | Epic 外の Should / Later 一覧 |

## 推奨ワークフロー

1. **#87-1（本 Issue）** — 本ドキュメントを PR で `develop` にマージ
2. **#87-2 / #87-3** — `prompt.md` + `scope.md` の該当セクションを LLM に添付し、`review-result-template.md` を埋める
3. **#87-4** — 横断指摘のみ（型・重複 util）を実装
4. **#87-5** — [regression-checklist.md](./regression-checklist.md) で回帰確認（✅ 2026-05-31 実施済み）

## 子 Issue 対応表

| 命名 | GitHub |
|------|--------|
| #87-0 | [#256](https://github.com/yama180sx/receipt-ai-app/issues/256) |
| #87-1 | [#257](https://github.com/yama180sx/receipt-ai-app/issues/257) |
| #87-2 | [#258](https://github.com/yama180sx/receipt-ai-app/issues/258) |
| #87-3 | [#259](https://github.com/yama180sx/receipt-ai-app/issues/259) |
| #87-4 | [#260](https://github.com/yama180sx/receipt-ai-app/issues/260) |
| #87-5 | [#261](https://github.com/yama180sx/receipt-ai-app/issues/261) |
