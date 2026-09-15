# Issue #131-7 招待コード再発行 runbook

## 目的と禁止事項

招待コードはログイン前の世帯解決に使う認証情報として扱う。実値、世帯名、利用者情報、配布先をIssue、PR、Git、shell履歴、journal、チャットへ記録・貼り付けしてはならない。

再発行は環境内の全世帯を同時に置換する。既存コードは直ちに拒否されるため、各世帯の管理者が新コードを受け取れることを事前に確認する。管理者不在、バックアップ失敗、または安全な別経路で配布できない場合は開始しない。

## 実装契約

- `receipt-rotate-invitation-codes-{dev,stable}.service` はrootだけが開始できるoneshot unitである。
- helperは対象環境のroot管理backupを先に成功させる。失敗時はDBを変更しない。
- backend内のCLIは暗号学的乱数で重複しないコードを生成し、DB更新を単一transactionで行う。
- stdoutと監査DBにはrotation ID、対象件数、更新件数、失敗件数だけを出す。招待コード・世帯名・利用者情報は出さない。
- root helperは配布用（新コードのみ）とrollback用（旧新対応表）のartifactを別々にhost鍵で暗号化し、`/var/lib/receipt-ai-app/{env}/invitation-code-rotations/`へroot:root / 0600で置く。
- `InvitationCodeRotationAudit`には成否と件数だけを追記する。

## rootへの設置

対象PRをレビュー・マージしてから、人間のroot管理者が次を設置する。通常利用者とActions runnerへDocker操作やこのunitのNOPASSWD権限を与えない。

```bash
sudo install -o root -g root -m 0750 \
  ops/systemd/libexec/receipt-rotate-invitation-codes \
  /usr/local/libexec/receipt-rotate-invitation-codes
sudo install -o root -g root -m 0750 \
  ops/systemd/libexec/receipt-rollback-invitation-codes \
  /usr/local/libexec/receipt-rollback-invitation-codes
sudo install -o root -g root -m 0644 \
  ops/systemd/units/receipt-rotate-invitation-codes-dev.service \
  /etc/systemd/system/receipt-rotate-invitation-codes-dev.service
sudo install -o root -g root -m 0644 \
  ops/systemd/units/receipt-rotate-invitation-codes-stable.service \
  /etc/systemd/system/receipt-rotate-invitation-codes-stable.service
sudo systemctl daemon-reload
sudo systemd-analyze verify \
  /etc/systemd/system/receipt-rotate-invitation-codes-dev.service \
  /etc/systemd/system/receipt-rotate-invitation-codes-stable.service
```

設置後、実値を読まずにhelper／unitの所有者・modeと構文だけを確認する。

```bash
sudo stat -c '%U:%G %a %n' \
  /usr/local/libexec/receipt-rotate-invitation-codes \
  /usr/local/libexec/receipt-rollback-invitation-codes \
  /etc/systemd/system/receipt-rotate-invitation-codes-dev.service \
  /etc/systemd/system/receipt-rotate-invitation-codes-stable.service
sudo systemd-analyze verify \
  /etc/systemd/system/receipt-rotate-invitation-codes-dev.service \
  /etc/systemd/system/receipt-rotate-invitation-codes-stable.service
```

## 再発行

1. 対象環境の利用者へ、次回ログインには新コードが必要になることを事前に案内する。新コード自体は送らない。
2. root管理backupの直近成功を確認する。serviceは開始時にも同じbackupを実行し、失敗なら停止する。
3. devから実行し、結果は値なしのservice状態と件数だけ確認する。

```bash
sudo systemctl start receipt-rotate-invitation-codes-dev.service
sudo systemctl show receipt-rotate-invitation-codes-dev.service \
  -p Result -p ExecMainStatus -p ActiveState -p SubState
sudo docker exec receipt-dev-db psql -U cntadm -d receipt_db -c '
SELECT status, "targetCount", "rotatedCount", "failedCount"
FROM "InvitationCodeRotationAudit"
ORDER BY "createdAt" DESC
LIMIT 1;'
```

成功条件は `Result=success`、`targetCount = rotatedCount`、`failedCount = 0` である。件数が一致しない、またはartifact作成失敗の疑いがある場合、配布もstable作業もせず停止する。

4. root管理者だけが配布用artifactをローカルのrootセッションで復号する。serviceの**値なし**出力にあるrotation IDを使う。下記の変数名は例であり、出力内容をこの会話へ貼り付けない。復号時は標準出力へ直接出さず、root専用一時ファイルを使用し、配布後に確実に削除する。

```bash
rotation_id=<SERVICE_OUTPUT_ROTATION_ID>
credential="/var/lib/receipt-ai-app/dev/invitation-code-rotations/${rotation_id}.delivery.cred"
temporary_file="$(sudo mktemp /run/receipt-invitation-code-delivery.XXXXXX)"
sudo systemd-creds decrypt "$credential" "$temporary_file"
sudo chown root:root "$temporary_file"
sudo chmod 0600 "$temporary_file"
sudo less "$temporary_file"
sudo rm -f "$temporary_file"
```

復号結果は**この会話・GitHub・メール本文・共有端末へ転記せず**、各世帯の管理者へ既に合意した別経路（対面、信頼済みのパスワードマネージャ共有など）で渡す。
5. 旧コード拒否・新コードでのログイン、TOTPログイン、backend health、root管理backupを確認する。確認結果には実値・世帯名を含めない。
6. dev受入後にdevelop→mainのリリースPRをレビュー・マージし、stableの固定SHAを更新して承認済みworkflowでdeployする。stableで同じ再発行・配布・受入を行う。

## 対象限定ロールバック

次のすべてを満たす場合だけ、全DB復元ではなく当該rotationだけを戻せる。

- 同じrotationのrollback artifactがroot:root / 0600で存在する。
- 再発行後に別の招待コード再発行をしていない。
- 現在の全世帯コードがartifactの「再発行後」側と一致する。
- ロールバック前backupが成功している。
- 新コードを利用者へ配布していない、または全管理者への再案内を承認済みである。

root管理者がrotation IDをartifactの**ファイル名だけ**から選び、値を復号・表示せずに実行する。

```bash
sudo /usr/local/libexec/receipt-rollback-invitation-codes dev <ROTATION_ID>
```

helperはrollback前backupを実行し、artifactをroot専用runtimeへだけ復号して、現在値との全件一致を確認してからtransactionで戻す。前提不一致ならDBを変更せず停止する。実行後は旧コード拒否／復元後コードでのログイン、TOTP、backend health、backupを確認する。

対象限定rollbackの条件を満たさない場合は、作業を停止して復旧担当者がroot管理backupからの環境全体復元を判断する。実値を確認するためにDB queryやログ出力を行ってはならない。

配布用・rollback用artifactは、少なくとも当該環境のbackup保持期間と受入確認の完了までroot専用で保持する。削除は別の人間承認・退避確認・削除記録を伴う作業として扱い、この再発行手順に含めない。
