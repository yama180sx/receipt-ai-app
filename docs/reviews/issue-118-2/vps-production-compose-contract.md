# Issue #118-2 / #118-2-1: VPS production Compose契約

作成日: 2026-09-29
対象: `docker-compose.production.yml`

## 1. 目的と境界

この契約は、特定のCloud事業者に依存しないLinux VPSで、RecAIptのstableを安全に検証・公開するための最小Compose境界を定義する。初期の実機検証候補はKAGOYA CLOUD VPS 2GBであり、家族限定Expo GoはVPN overlayで提供する。資源作成、DNS、TLS、本番データ・Secretの移送は対象外である。

対象はbackend、frontend、PostgreSQL、Valkeyだけである。T320のdev/stable runtime、MacBookの開発環境、Cloudflare R2上のobjectを変更しない。

## 2. 公開面

```text
Internet
  -> HTTPS reverse proxy:443
      -> frontend:80 (loopback only)
          -> backend:3000 (/api)
              -> PostgreSQL / Valkey (private network)
```

- Compose単体ではfrontendを`127.0.0.1:${WEB_PORT}:80`へだけbindする。backend、PostgreSQL、Valkeyにhost portを定義しない。
- TLS終端後に外部公開できるのは443だけとする。80はHTTPS redirectに限る。
- 基底Composeへfrontend-dev、Expo/Metro port、source bind mount、TTYを追加しない。
- TRUST_PROXY_HOPSはreverse proxyとbackend間のhop数・header上書き防御を実機で確認してから設定する。確認前は既定値0を維持する。

## 3. 家族限定Expo Go VPN overlay

`docker-compose.vps-expo-vpn.yml`は、基底ComposeとSecrets Composeの後にだけ重ねる任意overlayである。これを指定しない限り、VPS上のExpo Go用Metroは起動しない。

- `EXPO_VPN_BIND_IP`には、Tailscale等のVPN interfaceに割り当てられた単一IPだけを設定する。`0.0.0.0`、public IP、loopbackへのbindは認めない。
- frontendとMetroはこのVPN IPにだけbindし、Expo Goは`exp://<VPN host>:<Expo port>`でbundleを取得する。backend、PostgreSQL、Valkey、SSHはhost portを持たない。
- Expo serviceにはSecret、`env_file`、永続volume、source bind mount、TTYを渡さない。`EXPO_PUBLIC_*`とAPI URLは公開設定であり、VPN内frontendの`/api`だけを指定する。
- 家族端末はVPNへ参加し、Expo GoのSDK互換性を確認する。VPN未参加端末および家族外へMetroを提供しない。

モバイルWebとExpo Goのデータ正本は同じCloud VPS PostgreSQLであり、T320/MacBookに業務データの別系統を作らない。

## 4. KAGOYA 2GiB / 200GB検証の受入

1. production Composeのbuild、Prisma migration、db/Valkey healthcheck、backend healthが成功する。
2. VPN参加済みの家族相当4〜5端末で、WebまたはExpo Goのログイン、TOTP、レシート画像登録、Gemini解析、画像表示をtest-only dataで確認する。
3. DB/uploads backup、R2 readback、隔離restore手順をtest-only dataで確認する。
4. 通常時と画像処理・backup・migration後のmemory、swap、disk使用量を記録する。
5. 稼働中imageと直前rollback imageを保護した状態で、diskに十分な空きが残ることを確認する。

memory pressure、swap常用、disk逼迫、安定性低下が確認された場合は、本番データを移送せず4GiBへ増強して再検証する。

## 5. image lifecycle

- image build/pull、rollback imageの保持数、disk監視しきい値、cleanup担当を事前に決める。
- cleanupは明示承認を必要とし、稼働中container、永続volume、DB/uploads backup、直前rollback imageを対象にしない。
- docker system prune、volume削除、R2世代削除を通常運用の自動処理へ含めない。

## 6. 実行前の静的確認

```bash
bash scripts/security/test-production-compose-contract.sh
bash scripts/security/test-vps-expo-vpn-compose-contract.sh
```
