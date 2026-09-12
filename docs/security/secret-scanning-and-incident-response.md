# 秘密情報の検知・安全診断・インシデント運用

関連: [#668 Issue #131-5](https://github.com/yama180sx/receipt-ai-app/issues/668)、[ADR-010](../adr/ADR-010-secret-lifecycle-and-runtime-delivery.md)

## 1. 多層の検知

| 層 | 手段 | 目的 | 検出内容の扱い |
| --- | --- | --- | --- |
| GitHub | Secret Scanning / Push Protection | GitHubへ到達する前後の阻止・通知 | 値をIssueやコメントへ転記しない |
| ローカル | `pre-commit` の Gitleaks hook | commit前に開発者へ停止を通知 | Gitleaksのredact設定で値を表示しない |
| CI | `.github/workflows/secret-scan.yml` | PR・develop・mainの差分と、週次／手動の履歴全体を再検証 | PRコメント、artifact、job summaryを生成しない |
| 手動診断 | `scripts/security/diagnose-secret-safety.sh` | Git追跡・ignore設定を値なしで確認 | パスと成否だけを表示 |

Gitleaksの除外は原則禁止とする。テスト固定値による誤検知を確認した場合だけ、完全一致の値または最小の条件を `.gitleaks.toml` へ追加する。ディレクトリ、ファイル全体、ルール全体を除外してはならない。

週次実行は毎週月曜04:17（`Asia/Tokyo`）に履歴全体を再検査する。GitHub Actionsの手動実行でも履歴全体を検査できる。検知した場合、値を表示しない失敗結果だけを確認し、本書 §4 の手順で対応する。

## 2. 開発者の初回設定

Python環境へ `pre-commit` を導入後、リポジトリ直下で hook を有効化する。

```bash
python3 -m pip install --user pre-commit
pre-commit install
```

hook が検知してcommitを停止した場合、`SKIP=gitleaks` で回避してはならない。誤検知と思われる場合も、値をIssue・チャット・ログに貼り付けず、管理者へ論理名、ファイルパス、行番号、検知経路だけを連絡する。

## 3. 安全診断

次のコマンドは `.env` や環境変数の内容を読まず、Git追跡とignore設定だけを確認する。

```bash
./scripts/security/diagnose-secret-safety.sh
```

実行結果に秘密値を加えて共有してはならない。runtime credential の読取り主体・権限・到達性の診断は、サービス別Secrets配布を実装する Issue #131-3 で追加する。

## 4. 漏えい疑い時の初動

1. 値をコピー、引用、スクリーンショット、再コミット、Issue/PR本文への貼付をしない。
2. 実行中のdeploy、credential配布、ローテーションを停止する。
3. 管理者へ、論理名、検知時刻、検知経路、露出した可能性のある場所、停止措置だけを連絡する。
4. 外部提供者側で旧credentialを無効化・再発行する。履歴削除より失効を優先する。
5. root管理の正本を更新し、値を出さない疎通試験で復旧を確認する。
6. 旧credentialの無効化、影響範囲、復旧確認、再発防止策を値なしで記録する。

秘密種別ごとの封じ込め・復旧順序は [秘密情報ライフサイクル設計・台帳](../reviews/issue-131-2/secret-lifecycle-design.md) を正とする。
