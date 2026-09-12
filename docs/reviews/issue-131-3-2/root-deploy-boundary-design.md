# Issue #131-3-2 root管理デプロイ境界の設計

GitHub Issue: [#674](https://github.com/yama180sx/receipt-ai-app/issues/674)<br>
内部管理番号: Issue #131-3-2<br>
先行: Issue #131-3-1

## 現状と脅威

現行のT320では、GitHub Actions runnerと開発ユーザーが`cntnt001`として動作し、Docker groupへ所属する。runnerは`~/stable/receipt-ai-app`へ同期し、GitHub Secretsから`.env`を生成してDocker Composeを直接実行する。dev／stableの作業ディレクトリも`cntnt001`所有である。

この状態でroot unitがユーザー所有のComposeやソースを実行すると、runnerが変更したmount、command、build contextをroot経路へ渡せる。Docker groupを外すだけではこの間接経路が残る。

## 決定した経路

```text
GitHub Actions runner（Docker非所属・Secret非保持）
  → sudoで固定名のreceipt-deploy-*.serviceだけを開始
    → root固定helper
      → root所有 /srv/receipt-ai-app/{dev,stable} で固定refを取得
      → encrypted credentialを /run/ のroot専用一時領域へ配置
      → root管理runtime Composeを実行
        → backend／dbだけへ必要なSecretをファイル配布
```

| 環境 | 固定ref | root所有ソース | root所有データ | Compose project |
| --- | --- | --- | --- | --- |
| dev | `refs/heads/develop` | `/srv/receipt-ai-app/dev` | `/var/lib/receipt-ai-app/dev` | `receipt-dev` |
| stable | root所有設定の`STABLE_RELEASE_SHA`で承認したmainコミット | `/srv/receipt-ai-app/stable` | `/var/lib/receipt-ai-app/stable` | `receipt-stable` |

リポジトリはpublicであり、root unitの取得に追加のGit認証Secretを使わない。devのref、stableの承認済みcommit SHA、URLはroot管理helper／設定に固定し、runnerから引数で与えない。stable SHAは取得結果と完全一致する場合だけcheckoutする。

## runtimeイメージと永続データ

既存Composeはユーザー所有ソースを`/app`へbind mountする。root管理runtimeではこれを使わず、backendとExpo開発サーバーを専用Dockerfileでimage化する。backendのuploads、PostgreSQL、Redisだけを`/var/lib/receipt-ai-app/{env}`にbind mountする。

PostgreSQL migrationは、Prisma CLIが`DATABASE_URL_FILE`を直接扱えないため、backendコンテナ内部でのみファイルを読み、子プロセスの環境変数へ渡す。DB／Redisのhealthcheck完了を待ってから実行する。URL値をhostのコマンド引数、ログ、`.env`へ出さない。

## 段階移行

1. 本Issueではテンプレート、静的契約検証、workflowのSecret排除を実装する。T320のroot設定や稼働サービスを変更しない。
2. Issue #131-3-3で人間が合成credentialによりunitを検証し、devデータ移行・回帰確認・Docker group除外を行う。
3. stableはGitHub `stable` Environmentのrequired reviewer承認後、承認済みメンテナンス時間だけに移行する。旧cron、旧作業ディレクトリ、旧Secret経路は両環境の確認完了後に廃止する。

## 制約と停止条件

- root helper／unit／sudoersはroot所有で設置し、runnerの作業ディレクトリから参照しない。
- runnerにDocker socket、任意のsystemctl操作、任意のCompose操作を許可しない。
- `docker-compose.runtime.yml`と`docker-compose.secrets.yml`はDocker Composeの`!override`／`!reset`対応版を前提とする。
- DB、uploads、Redisの移動はサービス停止と復旧確認を要するため、実施時点で停止時間・バックアップ・ロールバックが承認されない場合は停止する。
