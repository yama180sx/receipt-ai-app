# Issue #119: Valkey移行・検証計画

## 目的とこのPRの範囲

この資料は、Issue #119でValkeyへ切り替える前の設計・検証計画である。この段階ではCompose、T320のroot管理設定、永続データ、Redisコンテナを変更しない。

実装PRでは、ここで確定した対象イメージ、切替手順、証跡を反映する。

## 2026-09-15 現行棚卸し

| 項目 | dev | stable |
|---|---:|---:|
| キューストア | Redis 7.4.8 | Redis 7.4.8 |
| アーキテクチャ | amd64 | amd64 |
| イメージdigest | 同一の固定digest | 同一の固定digest |
| RDB | 正常 | 正常 |
| AOF | 無効 | 無効 |
| BullMQ未完了ジョブ | 0 | 0 |
| `ReceiptAnalysisJob`未完了台帳 | 0 | 0 |

値、ジョブID、レシート内容、Redisキー内容は記録しない。

## 移行方式

Redis CE 7.4が生成したRDBをValkeyへ移さない。切替対象の業務データはPostgreSQLの`ReceiptAnalysisJob`とuploadsであり、キューストアは空の永続領域から再構築する。

```text
PostgreSQL ReceiptAnalysisJob + uploads  ──正本──>  backend起動時の照合・再投入
                                                    │
旧 redisdata (保持、rollback専用)                  └──> 新 valkeydata (空から開始)
```

切替中に新しいジョブが混入しないよう、`RECEIPT_ANALYSIS_MAINTENANCE_MODE=true`を使用する。解析以外の既存画面・確認済み結果の登録は継続できる。

## devでの実施順

1. root管理devバックアップを成功させ、backend health・migration・BullMQ件数・台帳件数を値なしで記録する。
2. devの解析メンテナンスモードを有効化し、画面で「解析基盤を更新中」と表示されることを確認する。
3. 既存`redisdata`の所有者・mode・ファイル名だけを記録し、その内容を変更しない。
4. Valkey用の新規`valkeydata`をroot所有で作成する。既存`redisdata`をコピー・削除・上書きしない。
5. 固定タグ・digestの公式Valkeyイメージでdevを起動する。選んだmanifestにamd64とARM64の両方が含まれることを確認する。
6. backend health、migration、Valkey health、BullMQ件数、台帳件数を確認する。
7. devのテスト世帯で、通常レシートの投入、Worker完了、確認トレイ、結果登録を確認する。
8. 失敗対象の手動再実行と、キューストア再起動後のbackend再接続を確認する。
9. 制御された未完了テストジョブを用い、Valkeyを空の状態から再起動して、台帳から同じjobIdで再投入されることを確認する。実レシートや実招待コードをテスト記録へ記載しない。
10. backend再起動後も解析・台帳復旧が成立することを確認する。
11. メンテナンスモードを解除し、通常レシート解析とログインを再確認する。
12. root管理devバックアップを再度成功させる。

## 受入基準

| 分類 | 確認内容 |
|---|---|
| 互換性 | BullMQの投入、Worker、指数backoff、最大3回試行、失敗保持、完了ジョブ期限削除が既存どおり動く。 |
| 復旧 | キューストアにない未完了台帳が同じjobIdで再投入される。 |
| 分離 | 旧`redisdata`と新`valkeydata`が別領域で、旧領域の内容を変更していない。 |
| 再接続 | Valkey再起動後にbackendが回復し、台帳照合が動く。 |
| 安全 | メンテナンス中は投入・手動再実行だけが503となり、秘密値・ジョブ内容をログや証跡へ出さない。 |
| 回帰 | backend health、migration、ログイン、通常解析、確認・登録、バックアップが成功する。 |
| ARM64 | Oracle相当ARM64で同一image digestを起動し、上記主要フローを再実行する。 |

## 停止・ロールバック条件

次のいずれかでdev切替を中止し、ADR-012の手順で旧Redisへ戻す。

- Valkeyイメージがamd64またはARM64で起動しない。
- BullMQのWorker、再試行、状態取得、台帳再投入のいずれかが失敗する。
- 未完了ジョブの取りこぼし、重複実行、他世帯のジョブ参照が確認される。
- backend health、migration、ログイン、バックアップに回帰がある。
- 値、レシート内容、Redisキー内容、credentialが診断出力へ現れる。

stableへの適用は、devの全受入基準、実施SHA、採用タグ・digest、ロールバック手順をレビューで承認した後にだけ行う。

## stable適用時の追加条件

1. stableを利用しない時間帯を人間が承認する。
2. 切替前backup、メンテナンス表示、旧Redis領域の保持を確認する。
3. stableの既存TOTPログイン、通常解析、台帳復旧、backupを確認する。
4. T320再起動後にValkey・backend・backup timerが自動復旧することを確認する。
5. stableの旧Redis領域は削除しない。削除可否は別レビューで判断する。

## 実装PRへの引き継ぎ

- `docker-compose.yml`では、キューストアのサービス名・healthcheck・内部接続先を、Redis固有の名称を新たに増やさない形で更新する。
- 環境変数の互換性と既存backend設定を維持し、利用者向けAPIは変更しない。
- 本番用Composeのネットワーク・host port非公開方針はIssue #118-1へ引き継ぐ。
- 採用した完全なimage reference、ARM64確認日、更新・ロールバック手順をADR-012と運用資料へ追記する。
