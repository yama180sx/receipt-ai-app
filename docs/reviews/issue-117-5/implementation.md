# Issue #117-5 実施手順

`prisma:reset-test-data` は手動専用である。CI、deploy、`prisma:update`から呼び出してはならない。

1. 実装PRを`develop`へマージし、devでバックアップ、dry-run、本実行、復元、回帰確認を行う。
2. `main`へマージし、stable CDの完了後にbackend/frontend/frontend-devを停止する。
3. `scripts/backup.sh stable`でDBとuploadsを同一識別子で取得し、`gzip -t`と`tar -tzf`を確認する。`/mnt/raid_1t/backups/receipt-app/manual-reset/<識別子>/`へ複製する。
4. 人間がバックアップ、dry-run結果、削除対象を承認後に単発backendコンテナで実行する。

```bash
RESET_TEST_DATA_CONFIRM=RESET_TEST_DATA \
RESET_TEST_DATA_ENV=stable \
RESET_TEST_DATA_BACKUP_REFERENCE=<識別子> \
npm run prisma:reset-test-data -- --dry-run
```

本実行は末尾の`--dry-run`を外す。失敗時は自動復旧しない。サービスを停止したまま、同じ識別子のDBとuploadsを[復旧手順](../../restore-manual.md)で復元し、`receipt-analysis`キューは空で再開する。

## dev リハーサル記録（2026-08-13）

- バックアップ識別子: `20260813_172647`
- DB: `gzip -t` 成功、uploads: `tar -tzf` 成功
- dry-run: 世帯招待コード集合が一致。削除予定はReceipt 22件、Item 95件、運用生成画像63件。
- 本実行: 成功。共通マスタはCategory 18件、ProductType 22件、Rule 40件、世帯別設定はCategory 21件、Store 8件、PromptTemplate 4件として再投入された。
- 初期化直後: FamilyGroup 2件、FamilyMember 5件を保持。Receipt / Itemは各0件、uploadsは保持fixture 3件のみ。
- 復元: 同じバックアップセットからDB・uploadsを復元し、サービス再起動後にReceipt 22件、Item 95件、FamilyGroup 2件、FamilyMember 5件を確認。
