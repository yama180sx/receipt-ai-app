# Issue #118-2-1: KAGOYA 2GB 家族限定Expo Go実機検証runbook

## 目的と境界

KAGOYA CLOUD VPS 2GBで、RecAIpt stableのWeb/API/DB/Valkeyと、家族4〜5名だけがVPN経由で使うExpo Go用Metroを検証する。これは**実機作成前の正本手順**であり、VM作成・DNS/TLS公開・本番データ／秘密値移送を自動化しない。

本手順の実行には、対象アカウント、対象VM、実施時間、影響範囲を確認したうえでの明示承認が必要である。T320の通常稼働環境、local backup、R2 object、既存stableのDB/uploadsは変更しない。

## KAGOYAアカウント登録（VMを作らない段階）

アカウント登録は無料であり、KAGOYA公式ではインスタンスを作成するまで利用料金は発生しないとしている。登録だけを先に完了してよい。インスタンス作成画面の確定操作は、本runbookの明示承認後まで行わない。

公式の申込み導線: <https://www.kagoya.jp/vps/flow/>

### KAGOYA会員とCloud VPSアカウントを区別する

KAGOYA会員サイトの「アカウント一覧」→「アカウントを一覧に追加（登録）」は、**すでに発行済みのサービス用アカウントを会員サイトへ紐づける**機能である。Cloud VPSの新規アカウントやVMを作成する操作ではない。既存アカウント名・コントロールパネルのパスワードを入力し、連絡先情報を同期する手順のため、初回のCloud VPS申込みでは選ばない。

初回は上記のCloud VPS公式申込み導線からオンライン申込みを行い、「アカウント登録完了のお知らせ」を受信してCloud VPSのコントロールパネルへログインする。Cloud VPSアカウントがすでに発行済みで、会員サイトに表示されない場合だけ、本人がこの紐づけ機能を使う。

### クレジットカードで登録する場合

1. 公式申込みページで「オンラインで申し込む」を選ぶ。
2. 本人が必要情報とクレジットカード情報を入力して申し込む。デビットカードは利用できない。
3. 受信したメールのURLから本登録を行う。初回はSMSまたは音声電話の認証コードで認証する。
4. 「アカウント登録完了のお知らせ」を受信後、コントロールパネルへ本人がログインする。
5. コントロールパネルの二段階認証を設定する。認証コード、パスワード、カード番号、アカウント名、登録メールアドレス、電話番号をGit・Issue・PR・チャットへ送らない。
6. **「インスタンス作成」または作成確定は押さずに止める。**

### 口座振替で登録する場合

口座振替は申込み後に預金口座依頼書を送付する方式であり、公式案内ではアカウント発行まで時間を要する。早期のtest-only検証を希望する場合は、利用可能ならクレジットカードのオンライン申込みを選ぶ。支払い方法の選択と個人・決済情報の入力は本人だけで行う。

### 登録完了後に共有してよい情報

次の非秘密情報だけで、次の案内に進める。

- コントロールパネルへログインできたか
- 2GB / 2コア / 200GB NVMe、Ubuntu 24.04 LTS、SSH公開鍵、security groupの選択肢が表示されるか
- 二段階認証を設定できたか

画面共有が必要な場合も、個人情報、アカウント名、メールアドレス、電話番号、請求情報、IPアドレス、認証コード、QRコード、SSH秘密鍵が写らないよう伏せる。

## 事前準備（クラウド資源を作らない段階）

1. 管理者はKAGOYA管理画面で、2GB / 2コア / 200GB NVMe、Ubuntu 24.04 LTS、SSH公開鍵、security groupの選択可否を確認する。アカウント情報、決済情報、公開鍵以外の鍵素材、IPアドレスをGit・Issue・チャットへ記録しない。
2. `docker-compose.production.yml`、`docker-compose.secrets.yml`、`docker-compose.vps-expo-vpn.yml`の3ファイルを使う。T320向け`receipt-deploy`や開発Composeを流用しない。
3. 次を実行し、基底とVPN overlayの静的境界を確認する。

   ```bash
   bash scripts/security/test-production-compose-contract.sh
   bash scripts/security/test-vps-expo-vpn-compose-contract.sh
   ```

4. VPSへ置くcredentialは新規の検証用だけとする。値、復旧鍵、R2 endpoint・bucket名、DB接続文字列はrunbook、Git、Issue、チャット、ログへ出さない。

## 承認後に作る最小環境

| 項目 | 値・境界 |
|---|---|
| VM | KAGOYA 2GB / 2コア / 200GB NVMe、test-only |
| OS | Ubuntu 24.04 LTS |
| 通常サービス | frontend、backend、PostgreSQL、Valkey |
| Expo | `frontend-dev`はVPN overlayを指定した場合だけ起動 |
| 公開port | 初期検証ではインターネット向けに開かない |
| VPN port | frontendとMetroをVPN interface IPへだけbind |
| DB / backend / Valkey | host portなし |
| data | 新規test-only DB・uploadsだけ |

`EXPO_VPN_BIND_IP`と`EXPO_VPN_HOST`はVPNの到達先だけを表す非Secret設定である。ただし実値は作業ログ、Issue、PR、チャットへ転記しない。`EXPO_PUBLIC_API_URL`はVPN内frontendの`/api`へ向け、backendやDBへ直接接続しない。

## 家族端末の接続

1. 管理者がVPN上で家族端末を個別に許可する。共有アカウント、共有VPN鍵、共有SSH鍵を使わない。
2. 各端末はVPN接続後にExpo Goを起動し、VPN内のQRまたは`exp://` URLで接続する。
3. Expo SDKを更新する前後は、家族のiPhone/AndroidでExpo Go互換性を確認する。互換性がない端末にはモバイルWebを案内し、SDK更新または4GB化とは切り分ける。
4. 端末の紛失・利用終了時は、VPNの当該端末だけを失効させる。VPS、DB、R2 credentialを端末へ配布しない。

## 受入と観測

- Web、Expo Goの双方で、ログイン、TOTP、画像登録、解析結果・画像表示をtest-only dataで確認する。
- 4〜5端末の接続は、実端末または段階的な接続で確認する。Expo/Metro、SSH、backend、DB、Valkeyがpublic interfaceでlistenしていないことを確認する。
- 通常時、画像処理中、migration後、backup後、image build後にmemory、swap、disk、backend healthを記録する。
- OOM、swap常用、画像処理の継続的な応答悪化、稼働imageと直前rollback imageを残せないdisk逼迫のいずれかがあれば、データ移送を行わずKAGOYA 4GBへの増強を提案する。

## 運用とrollback

- image buildは初回検証と計画的な更新時だけ行う。稼働image、直前rollback image、永続volume、R2 backupを自動cleanup対象にしない。
- cleanup、snapshot削除、R2 lifecycle変更は明示承認を要する。provider snapshotはR2暗号化backupの代替ではない。
- VM停止・削除、DNS/TLS公開、本番データ移送は別承認とする。検証失敗時はVPS上のtest-only dataだけを対象に、承認済みの手順で停止・隔離し、T320とR2へ変更を加えない。
