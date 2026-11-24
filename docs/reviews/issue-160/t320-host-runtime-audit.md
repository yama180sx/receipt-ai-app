# Issue #160 T320ホスト開発ランタイム棚卸し（2026-11-24）

## 範囲

T320ホスト上のNode.js系ランタイムとnpmキャッシュを棚卸しした。RecAIptのdev／stableはroot管理Docker Composeで実行されるため、コンテナ内のNode.js、DB、uploads、credentialは削除対象に含めない。ホストで稼働する別プロジェクトも対象外とする。

## 観測結果

| 項目 | 結果 | 判断 |
| --- | --- | --- |
| OS Node.js / npm | Node.js 20.20.2、npm 10.8.2（EOL） | 削除済み |
| global npm package | corepackのみ | Node.jsとともに削除済み |
| nvm | 不在 | 削除不要 |
| npmキャッシュ | `_cacache`、`_npx`、`_logs`合計約498MB | 削除済み |
| user/root cron | Node.js参照なし | 削除不要 |
| systemd | Node.jsを直接起動するunitなし | 削除不要 |
| 稼働中Node.js | 全processがRecAIpt Dockerコンテナ内の`/app`で実行 | host Node.js削除に影響なし |

systemd検索で得られたiSCSI関連unitは、設定中の一般語`node`に一致した偽陽性であり、Node.jsランタイムを起動するunitではない。

RecAIpt由来のNode.js processはDockerコンテナ内で動作しており、host側Node.jsの依存ではない。当初host processと見えた`npm run dev`／`npm run start`も、rootで確認するとRecAIptコンテナ内のprocessだった。Voice DiaryはDocker Compose設定を持つが、コンテナ（停止中を含む）およびsystemd unitは確認されなかった。

## 決定

- Node.js 20はEOLであるため、OSの`nodejs`パッケージだけを削除する。`apt-get remove --dry-run nodejs`で削除対象が`nodejs`だけであることを確認してから実施する。
- `apt autoremove`は実行しない。Node.jsと無関係な自動削除候補を今回の対象へ含めない。
- nvmは存在しないため、削除操作を行わない。
- `.npmrc`が存在しないことを確認した上で、`.npm`配下の`_cacache`、`_npx`、`_logs`だけを削除する。設定・認証情報・他プロジェクトの作業ディレクトリは削除しない。
- RecAIptのDocker Compose、Git、Codex CLI、Voice Diaryの設定を停止・変更しない。

## 将来の見直し

将来host Node.jsが必要になった場合は、Node.js 20を復元せず、サポート中のLTS版を用途・依存関係・更新責任とともに別Issueで導入する。npmキャッシュを再作成する場合も、設定・認証情報・他プロジェクトの作業ディレクトリを混同しない。

## 確認

`node`、`npm`、`npx`がPATHから消えたことを確認した。`.npm`は4KBまで縮小した。RecAIptのroot管理Composeとコンテナは変更されておらず、Git、Codex CLI、Docker Composeはいずれも利用可能だった。
