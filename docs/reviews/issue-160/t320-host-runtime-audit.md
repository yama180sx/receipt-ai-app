# Issue #160 T320ホスト開発ランタイム棚卸し（2026-11-24）

## 範囲

T320ホスト上のNode.js系ランタイムとnpmキャッシュを棚卸しした。RecAIptのdev／stableはroot管理Docker Composeで実行されるため、コンテナ内のNode.js、DB、uploads、credentialは削除対象に含めない。ホストで稼働する別プロジェクトも対象外とする。

## 観測結果

| 項目 | 結果 | 判断 |
| --- | --- | --- |
| OS Node.js / npm | Node.js 20.20.2、npm 10.8.2 | 保持 |
| global npm package | corepackのみ | Node.jsとともに保持 |
| nvm | 不在 | 削除不要 |
| npmキャッシュ | 約498MB | 保持 |
| user/root cron | Node.js参照なし | 削除不要 |
| systemd | Node.jsを直接起動するunitなし | 削除不要 |
| 稼働中host Node.js | 別プロジェクトの`npm run dev`／`npm run start`が使用中 | 保持 |

systemd検索で得られたiSCSI関連unitは、設定中の一般語`node`に一致した偽陽性であり、Node.jsランタイムを起動するunitではない。

RecAIpt由来のNode.js processはDockerコンテナ内で動作しており、host側Node.jsの依存ではない。一方で、別プロジェクトがhost側Node.jsを利用中であるため、Node.js、npm、corepackを削除するとRecAIpt以外へ影響する。

## 決定

- ホストのNode.js、npm、corepackは保持する。
- nvmは存在しないため、削除操作を行わない。
- npmキャッシュは498MBであり、稼働中の別プロジェクトがある状態では削除しない。npm設定・認証情報とキャッシュを混同しない。
- RecAIptのDocker Compose、Git、Codex CLI、稼働中の別プロジェクトを停止・変更しない。

## 将来の見直し

別プロジェクトの管理者がhost Node.js不要と確認した場合にだけ、別IssueでNode.js削除の影響、対象パッケージ、ロールバック手段を再評価する。npmキャッシュの削除を検討する場合も、対象をキャッシュに限定し、設定・認証情報・他プロジェクトの作業ディレクトリを削除しない。

## 確認

本棚卸しでは削除・停止・設定変更を実施していない。RecAIptのroot管理Composeとコンテナは変更されていない。確認時点でGit、Codex CLI、Docker Composeはいずれも起動可能だった。
