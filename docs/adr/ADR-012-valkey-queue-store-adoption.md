# ADR-012: レシート解析キューストアにValkeyを採用し、台帳から復旧する

## Status

Accepted（devおよびT320 stableへの採用は完了。Oracle ARM64実機検証はIssue #118-1以降の公開環境受入条件とする）

関連: [Issue #119](https://github.com/yama180sx/receipt-ai-app/issues/633)、[Issue #118-1](https://github.com/yama180sx/receipt-ai-app/issues/632)、[ADR-008](ADR-008-valkey-queue-recovery.md)

## Context

現行のBullMQキューストアはRedis Community Edition 7.4系である。2026-09-15の値なし棚卸しでは、devとstableは同一固定digestのRedis 7.4.8を使用し、RDB永続化のみを有効化していた。両環境に待機・実行中・失敗BullMQジョブおよび未完了`ReceiptAnalysisJob`台帳は存在しなかった。

Redis CE 7.4以降が生成したRDB/AOFはValkeyと互換ではない。このため既存`redisdata/dump.rdb`をValkeyへ読み込ませる移行は採用できない。BullMQのジョブ状態はPostgreSQLの`ReceiptAnalysisJob`を正本とし、キューストアは実行用の復元可能な派生データとして扱う。

## Decision

- レシート解析およびAI予算通知のキューストアはValkeyを採用する。
- BullMQ・ioredis接続はRESP互換のまま利用し、アプリの業務データ正本をキューストアへ置かない。
- Redis 7.4の既存RDBはValkeyへ移行しない。切替時は新しい空のValkey永続領域から開始し、未完了台帳を同じjobIdで再投入する。
- 旧`redisdata`は、切替後のdev検証とstable適用が完了するまで削除・上書きしない。ロールバック時だけ旧Redis構成と組み合わせる。
- 新しい永続領域は`valkeydata`とし、旧Redis領域と混在させない。
- dev／stableには、公式ValkeyのAMD64／ARM64 manifestを含む完全なdigestを`docker-compose.yml`へ固定して使用する。可変タグは使用しない。Oracle ARM64実機での同一digest検証は、公開環境を扱うIssue #118-1以降で完了させる。
- 予定外のキューストア停止、接続断、空領域からの再起動に対し、起動時・接続復帰時・定期照合の台帳復旧が機能することを検証する。

## Consequences

### Positive

- Redis 7.4系のRDB形式への依存を持ち込まず、Oracle ARM64を含む本番構成を同一のキューストア方針で扱える。
- DB台帳とuploadsが残る限り、キューストア喪失で未解析レシートを放置しない。
- 旧Redis領域を分離保持するため、dev検証に失敗しても短時間で元の構成へ戻せる。

### Trade-offs

- Redis 7.4のRDBをValkeyへ変換・復元しない。切替時にキュー内だけに存在したジョブは台帳から再投入する。
- 切替中は`RECEIPT_ANALYSIS_MAINTENANCE_MODE=true`で新規投入と手動再実行を停止する。履歴閲覧・確認済み結果の登録は継続する。
- イメージのタグ・digestは、検証前に推測で固定しない。ARM64を含む同一manifestで確認した値だけを採用する。

## Verification record

2026-09-15に、devおよびT320 stable（amd64）で以下を値・ジョブID・レシート内容を記録せずに確認した。

- メンテナンスモード中は新規解析投入が503となること。
- Valkeyへの切替後、通常レシートの解析、確認、登録ができること。
- 制御した未完了ジョブをキューストアから削除後、PostgreSQLの`ReceiptAnalysisJob`台帳から同じjobIdで復元できること。
- テストジョブを破棄後、未完了キューおよび台帳が0件となること。
- root管理backup、root管理deploy再起動、T320ホスト再起動後の自動復旧、ログインが成功すること。

Oracle ARM64実機での検証、および旧`redisdata`削除の可否は未完了である。後者はstableでの運用観察を少なくとも14日間行い、人間が明示承認した場合にだけ別レビューで判断する。

## Rollback

devまたはstableで、解析投入、Worker処理、再接続、台帳復旧のいずれかが受入条件を満たさない場合は、以下の条件でロールバックする。

1. 解析メンテナンスモードを維持し、新規ジョブ投入を止める。
2. Valkey構成を停止する。
3. 旧Redisイメージと変更していない`redisdata`を再度マウントする。
4. backendを再作成し、healthと台帳照合を確認する。
5. ロールバック後の正常性確認が終わるまでメンテナンスモードを解除しない。

旧Redis領域の削除は、stable適用後の運用レビューで別途承認するまで行わない。

## References

- [Valkey migration guide](https://valkey.io/topics/migration/)
- [Valkey persistence guide](https://valkey.io/topics/persistence/)
- [BullMQ Redis compatibility](https://docs.bullmq.io/guide/redis-tm-compatibility/)
