# Issue #118-2: VPS production Compose契約

作成日: 2026-09-29
対象: `docker-compose.production.yml`

## 1. 目的と境界

この契約は、特定のCloud事業者に依存しないLinux VPSで、RecAIptのstableを安全に検証・公開するための最小Compose境界を定義する。初期の実機検証候補はWebARENA Indigo Linux 2GBだが、資源作成、DNS、TLS、本番データ・Secretの移送は対象外である。

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
- frontend-dev、Expo/Metro port、source bind mount、TTYをVPSのstable Composeへ追加しない。
- TRUST_PROXY_HOPSはreverse proxyとbackend間のhop数・header上書き防御を実機で確認してから設定する。確認前は既定値0を維持する。

## 3. Expo Goとデータ境界

Expo Go用のdevelopment serverはT320またはMacBookで起動する。iPhone/Androidが自宅LANまたはVPNからserverへ接続してbundleを受け取ることは許可する。

bundleのEXPO_PUBLIC_API_URLはCloud VPSの正規HTTPS API URLだけを指定する。これは公開値であり、Secretではない。DB、uploads、backend credential、R2 credentialはCloud VPSだけに置き、Expo development serverへ渡さない。

モバイルWebとExpo Goのデータ正本は同じCloud VPS PostgreSQLであり、T320/MacBookに業務データの別系統を作らない。

## 4. 2GiB / 40GB検証の受入

1. production Composeのbuild、Prisma migration、db/Valkey healthcheck、backend healthが成功する。
2. Webログイン、TOTP、レシート画像登録、Gemini解析、画像表示をtest-only dataで確認する。
3. DB/uploads backup、R2 readback、隔離restore手順をtest-only dataで確認する。
4. 通常時と画像処理・backup・migration後のmemory、swap、disk使用量を記録する。
5. 稼働中imageと直前rollback imageを保護した状態で、diskに十分な空きが残ることを確認する。

memory pressure、swap常用、disk逼迫、安定性低下が確認された場合は、本番データを移送せず4GiB以上のplanで再検証する。

## 5. image lifecycle

- image build/pull、rollback imageの保持数、disk監視しきい値、cleanup担当を事前に決める。
- cleanupは明示承認を必要とし、稼働中container、永続volume、DB/uploads backup、直前rollback imageを対象にしない。
- docker system prune、volume削除、R2世代削除を通常運用の自動処理へ含めない。

## 6. 実行前の静的確認

```bash
bash scripts/security/test-production-compose-contract.sh
```
