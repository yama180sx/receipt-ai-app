# ADR-015: VPS公開入口とExpo Go開発境界

## Status

Accepted（Issue #118-2-1で、KAGOYA CLOUD VPS 2GBを家族限定・非公開実機検証候補として採用。Cloud資源の作成、DNS、TLS、本番データ・Secretの移送は未実施）

関連: Issue #118-1、Issue #118-2、Issue #121、Issue #130、Issue #134、Issue #94-6

## Context

Oracle Cloud Always Free Ampere A1は、アカウントを作成できないため採用しない。

T320の低負荷時実測では、stableのfrontend、backend、PostgreSQL、Valkeyは合計約231MiB、Expo Go向けfrontend-devを加えると約465MiBだった。アプリのDBとuploadsは小容量だが、T320ではDocker/containerdのimage layerが大きく蓄積している。

Expo Goは開発serverからJavaScript bundleを取得する。家族4〜5名が遠隔地を含めて利用する間は、VPS上でMetroを常時稼働させ、VPN経由に限定する。bundleのAPI URLをVPS上のfrontend Nginx `/api`へ設定すれば、モバイルWebとExpo Goは同じCloud VPS上のPostgreSQLを利用できる。

## Decision

- 基底の`docker-compose.production.yml`はfrontend、backend、PostgreSQL、Valkeyだけを起動する。`frontend-dev`、dev Compose、source bind mount、TTYは含めない。

- 日常利用の正規入口はモバイルWebとする。ただし家族限定のExpo Go利用は、基底Composeへ`docker-compose.vps-expo-vpn.yml`を重ねる場合に限り許可する。

- VPS上のExpo Go用Metroとfrontendは、Tailscale等のVPN interface IPへだけbindする。Expo/Metro port、SSH、backend、PostgreSQL、Valkeyをインターネットへ直接公開しない。VPN未参加端末にはモバイルWebを案内する。

- Expo Go用overlayは公開設定だけを持ち、backend、DB、R2、SMTP、Gemini等のSecret、永続volume、source bind mount、TTYを渡さない。API URLはVPN内部のfrontend Nginx `/api`へ向ける。T320/MacBookへCloud VPSのDB、JWT、TOTP、SMTP、Gemini、R2 credentialを複製しない。

- KAGOYA CLOUD VPS 2GB（2コア、2GiB RAM、200GB NVMe）は、test-only dataによる非公開実機検証と低負荷の家族利用の候補とする。OOM、swap常用、画像処理時の応答悪化、disk逼迫が確認された場合は、本番データを移送せず4GiBへ増強して再検証する。

- VPSのdiskにはDB/uploadsだけでなくimage layerが蓄積する。稼働image、直前rollback image、永続volume、backupを保護したimage lifecycleとdisk使用率監視をstable移行の前提とする。容量逼迫を理由とする自動pruneは行わない。

## Consequences

- Expo Go利用者はVPNとExpo Goを端末に導入する必要があり、Expo SDK更新時には各端末との互換性を確認する。Expo Goを家族外へ配布しない。

- 基底Composeは最小公開境界を維持し、overlayを指定しない限りExpo Goを起動しない。2GiB VPSでも、通常サービスと家族限定Metroを含む実測を行える。

- iOS/Androidの正式release後は、native appがbundleを内包してCloud VPS APIへ接続するため、日常利用にExpo development serverを必要としない。

## Verification and rollback

- 実資源作成前に`bash scripts/security/test-production-compose-contract.sh`と`bash scripts/security/test-vps-expo-vpn-compose-contract.sh`を通す。

- 実機検証は新規test-only data、新規検証credential、VPN以外のhost port非公開で行う。build、migration、health、Web/Expo Goログイン、画像登録、Gemini疎通、backup/restore、disk使用量を確認する。
