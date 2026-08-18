# ADR-008: Valkey移行に備えたキュー復旧台帳

## Status

Accepted（Valkeyの固定version/digestはARM64検証後に確定）

## Decision

レシート解析の未完了状態はPostgreSQLの`ReceiptAnalysisJob`を正本とする。BullMQ/Redis/Valkeyは実行キューであり、喪失時は同一jobIdで台帳から再投入する。

## Consequences

- キューストアはRDB/AOFで短期復旧するが、DRではDB台帳と画像から空のキューストアを再構築する。
- 起動時・接続復帰時に全件照合し、定期照合は10分ごと・最大100件とする。
- 計画移行中は解析投入だけをメンテナンスモードで停止する。
