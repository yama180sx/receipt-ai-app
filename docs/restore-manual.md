# 復旧手順書（root管理環境）

> [!WARNING]
> DB・uploadsの復旧は破壊的な緊急作業である。対象環境、バックアップ時刻、停止時間、作業担当者、復旧担当者を人間が明示承認したメンテナンス時間だけに実施する。旧Git履歴のユーザー所有作業ディレクトリ、平文`.env`、直接Docker Composeを使う手順は廃止済みであり、現在のdev／stableで実行してはならない。

## 1. 対象と前提

この手順はroot管理の`/var/lib/receipt-ai-app/{dev,stable}`、root管理backup、encrypted credentialだけを対象にする。helperはDBとuploadsを同じバックアップ時刻から戻す。片方だけを復元する用途には使わない。

開始前に、次を人間が確認・記録する。秘密値、実環境値、レシート内容は記録しない。

- [ ] 対象は`dev`または`stable`の一方だけである
- [ ] 復元候補のDB archiveとuploads archiveが同じ時刻で存在する
- [ ] 利用者への停止連絡、停止時間、作業担当者、復旧担当者を承認した
- [ ] 現在の障害状況と、復旧後に確認するログイン・画像表示・解析・通知の担当者を決めた
- [ ] `/usr/local/libexec/receipt-restore`がroot:root・0750で設置済みである

バックアップ一覧は対象環境の保存先で**ファイル名と時刻だけ**を確認する。DB password、Webhook、`.env`を読んだり表示したりしない。

```bash
# dev
sudo find /mnt/raid_1t/backups/receipt-app-dev/db -maxdepth 1 -type f -name 'db_backup_*.sql.gz' -printf '%f\n' | sort
sudo find /mnt/raid_1t/backups/receipt-app-dev/uploads -maxdepth 1 -type f -name 'uploads_backup_*.tar.gz' -printf '%f\n' | sort

# stable
sudo find /mnt/raid_1t/backups/receipt-app/db -maxdepth 1 -type f -name 'db_backup_*.sql.gz' -printf '%f\n' | sort
sudo find /mnt/raid_1t/backups/receipt-app/uploads -maxdepth 1 -type f -name 'uploads_backup_*.tar.gz' -printf '%f\n' | sort
```

`db_backup_YYYYMMDD_HHMMSS.sql.gz`と`uploads_backup_YYYYMMDD_HHMMSS.tar.gz`の共通する`YYYYMMDD_HHMMSS`だけを対象にする。

## 2. 実行

helperは、まず新しいroot管理backupを実行して成功を確認する。次にapplication containersを停止し、DB・uploadsを復元する。Valkeyは意図的に空にし、再デプロイ時にPostgreSQLの台帳から未完了解析だけを復旧する。Valkeyの旧RDBを戻してはいけない。

次の`YYYYMMDD_HHMMSS`は承認済みの時刻へローカルで置き換える。値をIssueやGitへ転記しない。

```bash
# dev
sudo /usr/local/libexec/receipt-restore dev YYYYMMDD_HHMMSS \
  --confirm restore-root-managed-backup

# stable
sudo /usr/local/libexec/receipt-restore stable YYYYMMDD_HHMMSS \
  --confirm restore-root-managed-backup
```

成功時はroot管理deployが再実行される。失敗時は**自動ロールバックも自動再開もしない**。追加コマンドを試さず、復旧担当者がjournal、直前backup、`/var/lib/receipt-ai-app/{env}/.uploads-pre-restore-*`を確認して判断する。

## 3. 復旧後の受入確認

- [ ] `receipt-deploy-{env}.service`の結果が`success`
- [ ] DB・Valkey・backend・frontendが起動し、backend healthが成功
- [ ] 利用者がログインできる
- [ ] 履歴・明細・レシート画像が復元時点として整合する
- [ ] 未完了解析がある場合だけ、台帳から同じjobIdで再投入される
- [ ] 通知とroot管理backupを確認する

`uploads`の復元前データは`.uploads-pre-restore-<時刻>`として残る。削除・上書き・再復元は、原因とロールバック可否を確認した上で人間が別途承認する。
