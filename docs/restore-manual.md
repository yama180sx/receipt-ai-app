# 復旧手順書（旧手順の廃止通知）

> [!WARNING]
> この文書に以前あった、ユーザー所有作業ディレクトリ、平文`.env`、直接Docker Composeを前提とするリストア手順は、root管理runtimeと整合しないためIssue #129-1で廃止した。Git履歴に残る旧コマンドを含め、現在のdev／stableで実行してはならない。

現在のバックアップ確認・手動実行は、[運用設計 §3](./design/operations.md#3-バックアップ)と[ops/systemd/README.md](../ops/systemd/README.md)に従う。

DBまたはuploadsを復元する作業は破壊的操作を伴う。root管理environment向けの安全な専用手順・ヘルパーは[Issue #129-2](https://github.com/yama180sx/receipt-ai-app/issues/726)で整備するまで、実施しない。

復旧が緊急に必要な場合は、対象環境、バックアップ時刻、停止時間、復旧担当者を人間が承認し、Issue #129-2の方針に沿って個別に実施する。秘密値、実環境値、レシート内容を端末出力、Issue、Git、shell履歴へ記録しない。
