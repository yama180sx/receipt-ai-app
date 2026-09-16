# MacBook: 最新 develop 取り込み・ローカル適用 引継ぎ

更新日: 2026-09-16

## 目的

MacBook上のRecAIptを、MacBook固有の制約を保ったまま最新`develop`相当へ更新する。対象ブランチは`wip/issue-128-macbook-server-setup`であり、T320には適用しない。

## 現在位置

| 項目 | 値 |
| --- | --- |
| 作業ブランチ | `wip/issue-128-macbook-server-setup` |
| 作業ブランチの基点 | `aceb46c` |
| 作業ブランチの先頭（確認時） | `194e5ff` |
| 取得済みdevelopの先頭（確認時） | `origin/develop` = `7f95c4c` |
| 作業ツリー | 変更なし |

最新状態は作業開始前に必ず取得する。

```bash
git fetch origin develop
git status --short
git log --oneline HEAD..origin/develop
```

## このブランチが必要な理由

このブランチには、通常のT320向け`develop`にそのまま適用できないMacBook固有の対応がある。

- 古いCPUでSharpのx64ネイティブバイナリが起動できないため、WebAssemblyフォールバックを使う
  - `backend/scripts/install-sharp-wasm.sh`
  - `backend/package.json` の `install:sharp-wasm`
- MacBook固有のLAN設定・バックアップ保存先・ポート非公開化
- MacBook構築・復旧・Expo Go実機確認の手順
  - `docs/macbook-linux-server-setup.md`

Sharpのフォールバックは、`npm ci`で`node_modules`を作り直した後に再実行が必要である。

```bash
docker compose run --rm --no-deps backend npm run install:sharp-wasm
docker compose run --rm --no-deps backend npx prisma generate
```

## 最新 develop を取り込む際の重要事項

`develop`には多数の機能追加、DB migration、RedisからValkeyへの移行、root管理のデプロイ・秘密情報管理が含まれる。

直接のマージシミュレーションでは、以下が競合する。

| ファイル | 理由 | 方針 |
| --- | --- | --- |
| `scripts/backup.sh` | developはroot管理バックアップへ移行、MacBookブランチはローカル保存先を持つ | MacBookの実際のバックアップ方式を決めてから解消する。T320用root前提を無検証で採用しない。 |
| `setup-env.sh` | developは旧ユーザー所有設定を廃止、MacBookブランチはLAN IPを持つ | Git管理の固定IPへ戻さず、MacBook専用のGit管理外設定へ分離する。 |

自動マージできるが意味上の確認が必要な重複ファイルは次のとおり。

- `backend/package.json`（Sharpフォールバックを維持する）
- `docker-compose.yml`（Valkey移行とMacBookのポート公開方針を両立する）
- `docs/design/operations.md`

マージ開始例:

```bash
git merge origin/develop
```

競合解消後は、MacBook固有設定に秘密値・IPアドレス・バックアップ先をGitへ記録しないこと。

## 適用前の必須確認

1. DBとuploadsの復元可能なバックアップを取得・確認する。
2. 未処理のレシート解析ジョブがないこと、または復旧手順を確認する。
   - developはRedisからValkeyへ移行し、旧`redisdata`をそのまま引き継がない構成である。
3. DB migrationの一覧と影響を確認する。
4. MacBook上で新しいNode.jsイメージ、Valkeyイメージを取得・ビルドできることを確認する。
5. 適用時間中はWeb版を停止する可能性があることを利用者へ周知する。

## Expo Go / iPhone 6s の扱い

developにはIssue #133のExpo SDK 57更新が含まれる。現状のiPhone 6sに導入済みのExpo Go SDK 54では、SDK 57プロジェクトを開けない。

- 最新developを完全に適用する場合、iPhone 6sではExpo Goを使わずWeb版を利用する。
- Expo Go SDK 54を維持する必要がある場合、Expo SDK 57の更新を除外する別構成が必要になる。これは「最新develop相当」ではない。

## 適用後の確認

1. `docker compose ps`でbackend、frontend、db、redis（Valkey）が稼働・healthyであることを確認する。
2. Web版でログイン、既存レシート閲覧、レシート画像登録、解析、管理画面を確認する。
3. DB migration状態を確認する。
4. MacBookのSharpフォールバックを確認する。
5. バックアップを一度実行し、DBとuploadsの成果物が保存先に存在することを確認する。

## T320への影響

このブランチをMacBook上でマージ・再起動・検証してもT320には影響しない。T320への反映は、T320側のroot管理stableデプロイ手順で別途承認して実行する。
