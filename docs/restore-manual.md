# 復旧手順書（リストアマニュアル）

万が一の障害発生時に、データベースとアップロード画像を15分以内に復旧するためのコマンド手順書。
作業対象の環境（開発環境 または 本番環境）のセクションを選択し、記載されているコマンドを上から順に実行すること。

---

## 1. 事前準備：最新バックアップのタイムスタンプ確認

リストアを実行する前に、まずは復元に使用するバックアップファイルの「タイムスタンプ（日時情報）」を確認する。

### Step 1: 対象環境のバックアップ一覧を表示

```bash
# 【開発環境 (dev)】のファイルを確認する場合
ls -l /mnt/raid_1t/backups/receipt-app-dev/db/

# 【本番環境 (stable)】のファイルを確認する場合
ls -l /mnt/raid_1t/backups/receipt-app/db/
```

### Step 2: タイムスタンプの特定

出力されたファイル名から、復元したい日時の文字列（例: `20260519_061210`）を確認し、以降の手順の `TARGET_TS=` の右側に差し替えて使用する。

---

## 2. A. 【開発環境 (dev)】一撃リストア手順

開発環境（dev）のデータを復旧する場合は、以下のコマンドブロックを順に実行する。

### Step 1: 環境変数の定義

```bash
cd ~/dev/receipt-ai-app
DB_PASS=$(grep '^DB_PASSWORD=' .env | cut -d '=' -f 2-)
# ★確認したタイムスタンプ（例: 20260519_061210）を以下に設定
TARGET_TS="【ここにタイムスタンプを入力】"
```

### Step 2: データベースの物理削除と再作成（初期化）

```bash
# 既存の接続を強制切断
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-dev-db psql -U cntadm -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'receipt_db' AND pid <> pg_backend_pid();"

# データベースをクリーンに再作成
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-dev-db dropdb -U cntadm --if-exists receipt_db
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-dev-db createdb -U cntadm receipt_db
```

### Step 3: DBデータの流し込み

```bash
zcat /mnt/raid_1t/backups/receipt-app-dev/db/db_backup_${TARGET_TS}.sql.gz | \
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-dev-db psql -U cntadm -d receipt_db
```

### Step 4: アップロード画像の展開

```bash
# 既存の物理ディレクトリを退避
if [ -d "backend/uploads" ]; then
    mv backend/uploads backend/uploads_bak_$(date +%Y%m%d_%H%M%S)
fi

# アーカイブを展開
tar -xzvf /mnt/raid_1t/backups/receipt-app-dev/uploads/uploads_backup_${TARGET_TS}.tar.gz -C backend/
```

### Step 5: 全コンテナの起動と確認

```bash
docker compose up -d
docker compose ps
```

---

## 3. B. 【本番・安定環境 (stable)】一撃リストア手順

本番環境（stable）のデータを復旧する場合は、以下のコマンドブロックを順に実行する。

### Step 1: 環境変数の定義

```bash
cd ~/dev/receipt-ai-app
DB_PASS=$(grep '^DB_PASSWORD=' .env | cut -d '=' -f 2-)
# ★確認したタイムスタンプ（例: 20260519_061210）を以下に設定
TARGET_TS="【ここにタイムスタンプを入力】"
```

### Step 2: データベースの物理削除と再作成（初期化）

```bash
# 既存の接続を強制切断
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-stable-db psql -U cntadm -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'receipt_db' AND pid <> pg_backend_pid();"

# データベースをクリーンに再作成
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-stable-db dropdb -U cntadm --if-exists receipt_db
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-stable-db createdb -U cntadm receipt_db
```

### Step 3: DBデータの流し込み

```bash
zcat /mnt/raid_1t/backups/receipt-app/db/db_backup_${TARGET_TS}.sql.gz | \
docker exec -i -e PGPASSWORD="${DB_PASS}" receipt-stable-db psql -U cntadm -d receipt_db
```

### Step 4: アップロード画像の展開

```bash
# 既存の物理ディレクトリを退避
if [ -d "backend/uploads" ]; then
    mv backend/uploads backend/uploads_bak_$(date +%Y%m%d_%H%M%S)
fi

# アーカイブを展開
tar -xzvf /mnt/raid_1t/backups/receipt-app/uploads/uploads_backup_${TARGET_TS}.tar.gz -C backend/
```

### Step 5: 全コンテナの起動と確認

```bash
docker compose up -d
docker compose ps
```

---

## 4. 復旧後の動作確認チェックリスト

- [ ] アプリケーションへ正常にログインできるか。
- [ ] レシート履歴画面を開き、明細データが欠損なく表示されているか。
- [ ] 履歴に紐づくレシート画像（WebP等）が正しく描画されているか。
- [ ] 統計画面等の集計ロジックが正常に動作しているか。