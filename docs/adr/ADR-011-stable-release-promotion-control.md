# ADR-011: main昇格とstableデプロイを分離し、固定コミットで昇格する

Status: Accepted

関連: Issue #131-3-2、Issue #131-3-3、[ADR-010](./ADR-010-secret-lifecycle-and-runtime-delivery.md)

## 背景

`main`へのpushでGitHub Actions runnerが`receipt-deploy-stable.service`を開始すると、
コードレビュー済みのmain昇格とstableの停止・DB migration・利用者影響が不可分になる。
stableのroot管理移行は、人間承認済みの停止時間、バックアップ、復旧担当者を必要とする
Issue #131-3-3の作業であり、mainへのマージだけで開始してはならない。

また、stable unitが移動する`refs/heads/main`を取得すると、mainが後続更新されたときに
stableへ投入する対象を再現できない。

## 決定

- `main`へのpushはstableデプロイを開始しない。
- stableデプロイは`workflow_dispatch`でのみ要求でき、GitHubの`stable` Environmentで
  required reviewerを設定した人間承認後に実行する。
- runnerは従来どおり固定名の`receipt-deploy-stable.service`を開始するだけであり、
  Docker socket、credential、任意のref・引数・パスを受け取らない。
- stableの投入対象は、root所有`/etc/receipt-ai-app/stable.env`の
  `STABLE_RELEASE_SHA`に設定した承認済みmainコミットの完全長SHAとする。
- root helperはこのSHAの形式を検証し、取得したcommitが期待値と完全一致する場合だけ
  checkoutする。成功時のcommit SHAは値なしで運用ログへ記録する。
- stableデプロイ前に、リリース担当者は対象SHAがmainに含まれること、dev受入、
  CI、backup、停止時間、復旧担当者を記録・確認する。stableへの初回移行は
  Issue #131-3-3の開始ゲートを全て満たす場合に限定する。
- リリース同期PR（`develop`から`main`）でも、unit、frontend、DB integration、
  OpenAPI整合のCIを実行する。

## 結果

- `main`は承認済みリリースコードを表し、stableの実稼働状態とは区別される。
- stableへ何を投入したかは固定SHAで追跡でき、後続のmain更新とは混在しない。
- GitHub Environmentのrequired reviewer未設定、対象SHA未設定または不一致、
  Issue #131-3-3の開始ゲート未達時はstableデプロイを開始しない。
- `STABLE_RELEASE_SHA`は秘密情報ではないが、runner・workflow入力ではなくroot所有設定で
  管理する。credentialの信頼境界はADR-010から変更しない。
