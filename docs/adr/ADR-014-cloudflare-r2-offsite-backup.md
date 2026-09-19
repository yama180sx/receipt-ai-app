# ADR-014: Cloudflare R2へ暗号化したオフサイト復旧セットを保管する

## Status

Accepted（設計承認済み。実装・R2アカウント作成・復旧演習は [Issue #57](https://github.com/yama180sx/receipt-ai-app/issues/134) で後続実施する）

関連: [Issue #57](https://github.com/yama180sx/receipt-ai-app/issues/134)、[Issue #118-1](https://github.com/yama180sx/receipt-ai-app/issues/632)、[Issue #119](https://github.com/yama180sx/receipt-ai-app/issues/633)、[ADR-008](ADR-008-valkey-queue-recovery.md)、[ADR-012](ADR-012-valkey-queue-store-adoption.md)

## Context

現在のroot管理backupは、PostgreSQL論理backupと`uploads` archiveを同一時刻で作成し、T320のローカルRAIDへ7日間保管する。これは誤操作や短時間の障害からの復旧には有効だが、T320・自宅LAN・同一保管媒体の障害では利用できない。

クラウド主系（Issue #118-1）への移行後も、OCIから自宅へ直接接続する方式や、自宅で受信ポートを公開する方式は採用しない。業務データの正本はPostgreSQLであり、Valkeyは`ReceiptAnalysisJob`台帳から復旧できる派生キューである。

## Decision

- オフサイト保管先はCloudflare R2の**非公開S3互換bucket**とする。R2は標準ストレージを使用する。
- R2へは`rclone crypt`を通して保存する。ファイル内容、ファイル名、ディレクトリ名をクライアント側で暗号化し、R2側には平文のDB archive、レシート画像、manifestを置かない。
- `dev`と`stable`は別bucket、別S3 access key、別rclone crypt鍵とする。片方の資格情報で他方を列挙・読取・削除できない権限に限定する。
- 現行のローカルroot管理backupを先に成功させ、その同一timestampのDB archiveとuploads archiveからオフサイト復旧セットを作る。R2転送が失敗してもローカルbackupを削除・失敗扱いに変更しないが、オフサイトbackupは失敗として通知する。
- 復旧セットは`DB archive`、`uploads archive`、暗号化manifestの3点を含む。manifestは最後に送信する完了印であり、manifestのない世代は復旧候補にしない。
- 復旧はR2から稼働環境へ直接上書きしない。隔離されたroot専用staging領域へ取得し、manifest・hash・archive構造を検証してから、既存のroot管理restore helperへ受け渡す。
- 初期の目標はstableのRPO 24時間、RTO 4時間以内とする。RTOは最初の隔離復旧演習で実測し、達成不能なら目標・手順・保持期間を見直す。
- R2への書込みはクラウド主系またはT320からの送信接続だけで行う。OCI主系稼働後、T320はR2から送信接続で二次コピーを取得する。T320停止は主系のbackup失敗に連動させない。

## Consequences

### Positive

- T320・自宅LAN・ローカルRAIDが同時に利用不能でも、独立した保管先からDBとレシート画像を同一時点へ戻せる。
- R2の10 GB-month無料枠と無償egressは、初期の小容量・まれな復旧に適する。容量増加後も、復旧時の転送課金を心配せず演習できる。
- S3互換APIと`rclone`を境界にするため、将来R2以外のオブジェクトストレージへ移す場合も、archive形式・manifest形式・復旧手順の大部分を維持できる。

### Trade-offs

- R2アカウント、S3 access key、rclone crypt鍵、復旧キットの管理対象が増える。crypt鍵を失うとオフサイトデータを復号できない。
- R2は外部提供者・Cloudflareアカウントに依存する。誤削除・資格情報漏えい・提供者障害に備え、ローカル7日backupとオフラインの復旧キットを併用する。
- クライアント側暗号化により、R2コンソールでは内容を確認できない。健全性確認はrclone経由のmanifest検証と隔離復旧演習で行う。
- R2の無料枠は月間10 GB-monthであり、保持世代とデータ量の積で消費する。実装開始前と毎月、保存容量を確認して費用上限を見直す。

## Security boundaries

- bucketは公開アクセスを有効化しない。アプリ・ブラウザ・GitHub ActionsにはR2書込み資格情報を配らない。
- S3 access keyはbucket単位のObject Read/Writeだけに限定し、Cloudflareアカウント管理権限・他環境bucketへの権限を与えない。世代削除に必要な最小権限だけを持たせる。
- access key ID、secret access key、crypt password、crypt salt、rclone設定の復号情報は、環境別のroot管理encrypted credentialとしてのみ扱う。`.env`、Git、Issue、PR、shell履歴、journal、Discord通知へ値や断片を出力しない。
- crypt鍵とは別に、鍵の再構成情報を暗号化パスワードマネージャまたは管理者保管のオフライン媒体へ保管する。R2内だけ、またはT320だけに置かない。保管場所・担当者は運用台帳に値なしで記録する。
- R2上のデータは`rclone crypt`を通す場合だけアクセスする。raw remoteを直接操作・復旧対象に使用しない。

## Verification and rollback

- 実装後、devでupload、暗号化されたraw objectの確認、crypt remote経由のmanifest検証、隔離restoreを行う。
- stableは直前のローカルbackup成功、利用者停止時間、復旧担当者の承認後に同じ演習を行う。ログイン、世帯境界、履歴・明細・画像、未完了解析の台帳再投入、通知、再backupを確認する。
- R2転送の設定変更・資格情報ローテーション後は、少なくとも1世代のuploadと復元可能性を再確認する。
- R2連携に失敗した場合は、R2資格情報を無効化するかoffsite unitを停止し、既存のローカルbackup／restore経路を継続する。R2不調を理由にDB・uploads・Valkeyを変更しない。

## References

- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 rclone example](https://developers.cloudflare.com/r2/examples/rclone/)
- [rclone crypt](https://rclone.org/crypt/)
