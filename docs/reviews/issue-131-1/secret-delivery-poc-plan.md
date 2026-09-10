# Issue #131-1 秘密情報配布・Docker権限分離 PoC 計画

GitHub Issue: [#664](https://github.com/yama180sx/receipt-ai-app/issues/664)<br>
内部管理番号: Issue #131-1<br>
親 Issue: Issue #131（#656）<br>
作成日: 2026-09-10

## 1. 目的

本 PoC は、RecAIpt の本物の秘密値を扱わずに、次の二点を実測で確定する。

1. root が管理する systemd credential を、必要な実行単位だけへ渡せるか。
2. GitHub Actions self-hosted runner の実行ユーザーが Docker を直接操作できる状態では、そのユーザーからホストの秘密情報を隔離できないことを確認し、分離に必要な運用境界を明確にする。

これは最終実装ではない。stable/develop の既存 Compose、環境変数ファイル、cron、DB、外部通知、GitHub Secrets は変更しない。

## 2. 判定の前提

| 項目 | 現状確認結果 | PoC で扱う意味 |
| --- | --- | --- |
| stable runner | `cntnt001` の systemd サービスとして実行 | CI/CD と秘密情報を分ける対象 |
| Docker 権限 | `cntnt001` は `docker` グループ所属 | Docker socket を通じたホスト読取りの可否が最重要境界 |
| systemd credential | 利用可能。TPM は利用不可 | TPM 非依存のホスト鍵方式を候補として検証する |
| 本物の秘密値 | 読み取らない・複写しない・ログ出力しない | 合成マーカーだけで評価する |

Docker を操作できるユーザーは、特権コンテナと任意のホスト bind mount を作成できるため、実質的にホスト root 相当の能力を持つ。この状態のままでは、systemd credential や Compose secret の保存場所を変えるだけで秘密情報を保護することはできない。

## 3. 安全条件

- 合成マーカーは PoC 専用に新規生成し、既存の `.env`、`.env.secret`、GitHub Secret、メール、Webhook、DB の値を入力・参照しない。
- コマンド出力、journal、Compose 設定表示、Git diff、Issue コメントにはマーカー本文を出さない。検証結果はハッシュまたは一致／不一致だけを記録する。
- 一時 credential、Compose project、transient systemd unit は `receipt-secret-poc-*` という専用名に限定する。
- 既存の `receipt-*` コンテナ、volume、network、stable/develop ディレクトリを停止・再作成・削除しない。
- Docker group の削除、runner の停止、`/etc/sudoers.d` の常設変更、systemd host key の永続利用は、本 PoC の成功判定後に Issue #131-3 の変更として別途レビューする。

## 4. 検証項目と期待結果

| ID | 検証 | 期待結果 | 成功／失敗の意味 |
| --- | --- | --- | --- |
| P1 | root が合成値を encrypted credential 化する | credential の平文をワークツリーや通常ユーザーのファイルに置かない | systemd credential 経路の成立条件 |
| P2 | root 管理の transient unit が credential を読み、値を出力せずに存在だけを検査する | unit は成功し、ログに値を含まない | root 管理サービスの配布経路候補 |
| P3 | `cntnt001` が encrypted credential 元ファイルを直接読めない | 読取り拒否 | 保存ファイル単体のアクセス制御 |
| P4 | `cntnt001` が Docker 権限を保つ現状で、特権コンテナから任意のホストファイルに到達可能かを合成値で検証する | 到達可能（負の検証） | Docker group が秘密分離を無効化することを確認 |
| P5 | P4 の結果を踏まえた最小権限経路を設計する | runner は Docker 非所属、root 管理の限定 unit だけが Compose を操作 | Issue #131-3 の受入条件へ引継ぐ |

P4 は脆弱性を実演する目的ではない。秘密情報や既存の RecAIpt ファイルは対象にしない。ホスト mount の一般性は、内容を出力しない秘密でない OS ファイル、または PoC 専用の合成マーカーだけで確認する。P4 が期待どおり成立した場合、それは「現状のまま秘密分離を完了できない」という有効な発見である。

## 5. 実施順序

1. この計画をレビュー対象として追加する。
2. root 権限でのみアクセスできる一時ディレクトリに、合成マーカーと encrypted credential を作成する。
3. `systemd-run --wait --collect` で transient unit を一回だけ起動し、credential の存在検査だけを行う。
4. 通常ユーザーの直接読取りが拒否されることを確認する。
5. 内容を表示しない秘密でないファイル、または PoC 専用ファイルを Docker bind mount で読めるか確認し、現状の Docker group 権限の影響を記録する。
6. 一時 Compose project と一時ファイルを削除する。結果は値を伏せて文書と Issue #664 に記録する。
7. P4 が成立するため、この branch では runner 権限を変更せず、Issue #131-2 に秘密の所有者・ローテーション・失効手順、Issue #131-3 に root 管理の限定 deploy unit の設計を引き渡す。

## 6. 最終実装へ引き継ぐ設計条件

PoC の結果にかかわらず、最終設計は次を満たさなければならない。

- self-hosted runner の実行ユーザーは `docker` グループに所属せず、Docker socket を直接読めない。
- runner が実行できるのは、引数・作業ディレクトリ・対象環境を固定した root 管理 systemd unit の起動だけに限定する。
- systemd credential は unit の専用実行ユーザーだけが読める。Compose に渡すための一時ファイルは root が作成・削除し、runner の所有領域へ書かない。
- `EXPO_PUBLIC_*` には公開してよい値だけを置く。API token、DB/JWT/TOTP/SMTP/Discord の秘密値は対象外とする。
- stable の秘密の正本、バックアップ、ローテーション、漏えい時の失効順序は Issue #131-2 の ADR で決定してから Issue #131-3 で実装する。

## 7. 停止条件

次の場合は PoC を停止し、Issue #131-2 または人間の判断へ戻す。

1. 合成マーカー以外の既存秘密値を読む必要があると判明した場合。
2. 既存 runner、stable/develop Compose、cron、DB、通知の停止・再起動・変更が必要になった場合。
3. encrypted credential を作るために既存 systemd host key、TPM、sudoers、Docker 権限を変更する必要がある場合。
4. PoC 専用リソースの確実な削除手順を確認できない場合。
5. Docker 権限を外した後の deployment 運用に、限定 unit 以外の root 権限が必要となる場合。

## 8. 完了条件

- P1〜P4 の結果を、値を含めずに記録する。
- Docker group が存在する限りの分離限界を明確にする。
- Issue #131-2 で決める事項と Issue #131-3 の実装受入条件が明確である。
- stable/develop、既存秘密値、DB、外部サービスへの変更がない。

## 9. 実測結果（2026-09-10）

| ID | 結果 | 記録 |
| --- | --- | --- |
| P1 | 確認済み | T320 管理者が新規ランダム値だけを標準入力から `systemd-creds encrypt --name=probe` へ渡し、root 専用ディレクトリに encrypted credential を生成した。平文値は表示・保存していない。 |
| P2 | 確認済み | root 管理の transient unit が `LoadCredentialEncrypted=probe:...` を通じて値の存在だけを検査し、`Finished with result: success` で終了した。値はログへ出力していない。 |
| P3 | 確認済み | `cntnt001` から encrypted credential の読取りを試み、`test -r` の終了コード `1`（読取り不可）を確認した。 |
| P4 | 確認済み | `cntnt001` 権限で Docker を起動し、秘密でない `/etc/hostname` を read-only bind mount したコンテナ内で存在を確認できた。内容は出力していない。Docker group がホストファイル到達を許すことを実測した。 |

PoC 専用の一時ディレクトリは、管理者が `sudo rm -rf /root/receipt-secret-poc` で回収した。encrypted credential と合成マーカーは残存しない。`systemd-creds` が利用する root 専用の systemd host key は残る。これは RecAIpt の秘密値ではなく、将来 systemd credential を暗号化するためのホスト固有鍵である。既存の RecAIpt コンテナ、Compose 設定、環境変数ファイル、DB、外部通知は変更していない。

### 技術選定への結論

TPM は利用できないため、T320 では root 専用 systemd host key による encrypted credential を、root 管理 unit の配布経路候補として採用可能と判断する。ただしこの手段だけでは Docker group の境界喪失を解決しない。正式採用の前提は、Issue #131-2 で秘密の所有・更新・失効手順を ADR として確定し、Issue #131-3 で runner を Docker group から外して限定 root unit に置き換えることである。
