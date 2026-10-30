# ADR-018: コンテナイメージは検証済みdigestを段階的に固定する

Status: Accepted

関連: Issue #152、[ADR-011](./ADR-011-stable-release-promotion-control.md)、[ADR-012](./ADR-012-valkey-queue-store-adoption.md)

## 背景

RecAIptではValkeyをタグとdigestで固定している一方、backend／frontendのNode.jsイメージ、Web runtimeのNginxイメージ、PostgreSQLイメージには可変タグが残っている。可変タグは同じアプリSHAでもビルド時点によって異なるイメージを取得し得るため、再現性、脆弱性調査、rollbackの根拠を弱める。

ただし、現在参照しているタグを確認なしにdigestへ置換すると、CPUアーキテクチャ対応、OSライブラリ、Node.js／PostgreSQLの互換性、緊急脆弱性対応の更新速度を損なうおそれがある。digest固定は単なる文字列置換ではなく、イメージ供給元の確認と更新運用を伴う。

## 決定

- アプリのbuild／runtimeで使用するNode.js、Nginx、PostgreSQL、Valkeyは、採用時にタグと検証済みのmanifest digestを組にして記録する。
- digest採用前に、公式供給元、AMD64と将来使用し得るARM64のmanifest、ライセンス、対象タグのサポート状態を確認する。単一アーキテクチャのimage digestを、複数環境向けのmanifest digestとして扱わない。
- 新しいdigestは、リポジトリの静的契約テスト、Docker build、backend／frontend testを通し、T320 devで主要機能とbackupを受入してから採用する。stableはADR-011の固定SHA、事前backup、人間承認を満たす場合だけ反映する。
- release記録にはアプリSHA、各採用タグ・digest、受入結果、直前の採用組を残す。秘密情報、接続先、利用者データは記録しない。
- 緊急の供給元脆弱性対応も、未検証digestを直接stableへ反映しない。まずdevで最小限の検証を行い、安定性または復旧可能性に影響する場合はstable反映を停止して判断する。
- digestの定期確認頻度、更新候補の検知方法、契約テストで禁止する可変タグの範囲は、本ADRをAcceptedにした後にIssue #152で具体化する。

## 結果

- 同じアプリSHAの再ビルドにおける供給元差分を追跡できるようになる。
- digest更新はアプリ依存更新と同じrelease判断を必要とし、Dockerfile／Composeだけの直接変更では完結しない。
- 現在の可変タグは、本ADRがAcceptedになり、対象イメージごとの検証済みdigestと更新手順が確定するまで維持する。
