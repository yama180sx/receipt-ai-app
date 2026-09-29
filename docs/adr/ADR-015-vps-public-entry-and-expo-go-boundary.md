# ADR-015: VPS公開入口とExpo Go開発境界

## Status

Accepted（Issue #118-2で、WebARENA Indigo Linux 2GBを非公開実機検証候補として採用。Cloud資源の作成、DNS、TLS、本番データ・Secretの移送は未実施）

関連: Issue #118-1、Issue #118-2、Issue #121、Issue #130、Issue #134、Issue #94-6

## Context

Oracle Cloud Always Free Ampere A1は、アカウントを作成できないため採用しない。

T320の低負荷時実測では、stableのfrontend、backend、PostgreSQL、Valkeyは合計約231MiB、Expo Go向けfrontend-devを加えると約465MiBだった。アプリのDBとuploadsは小容量だが、T320ではDocker/containerdのimage layerが大きく蓄積している。

Expo Goは開発serverからJavaScript bundleを取得する。bundleのAPI URLをCloud VPSの正規HTTPS APIへ設定すれば、モバイルWebとExpo Goは同じCloud VPS上のPostgreSQLを利用できる。

## Decision

- stable Cloud VPSの常駐サービスはfrontend、backend、PostgreSQL、Valkeyだけとする。frontend-dev、dev Compose、source bind mount、TTYは配置しない。

- 日常利用の正規入口はモバイルWebとし、利用者へExpo Goを要求しない。

- Expo GoはT320またはMacBookの開発・確認用serverでのみ利用する。serverは自宅LANまたはVPNに限定し、VPSの一般公開面へExpo開発portを追加しない。

- Expo GoがCloudのstableデータを確認する場合、公開設定のAPI URLだけをCloud VPSの`https://<domain>/api`へ向ける。EXPO_PUBLIC_*へSecretを置かず、T320/MacBookへCloud VPSのDB、JWT、TOTP、SMTP、Gemini、R2 credentialを複製しない。

- WebARENA Indigo Linux 2GB（2 vCPU、2GiB RAM、40GB SSD）は、test-only dataによる非公開実機検証の候補とする。検証結果が不足なら、本番データを移送せず4GiB以上で再検証する。

- VPSのdiskにはDB/uploadsだけでなくimage layerが蓄積する。稼働image、直前rollback image、永続volume、backupを保護したimage lifecycleとdisk使用率監視をstable移行の前提とする。容量逼迫を理由とする自動pruneは行わない。

## Consequences

- stable VPSはWeb/API/DBだけとなり、2GiB VPSでも現実的な検証ができる。

- iOS/Androidの正式release後は、native appがbundleを内包してCloud VPS APIへ接続するため、日常利用にExpo development serverを必要としない。

## Verification and rollback

- 実資源作成前に`bash scripts/security/test-production-compose-contract.sh`を通す。

- 実機検証は新規test-only data、新規検証credential、host port非公開で行う。build、migration、health、Webログイン、画像登録、Gemini疎通、backup/restore、disk使用量を確認する。
