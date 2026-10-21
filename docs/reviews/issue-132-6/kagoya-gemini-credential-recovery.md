# Issue #132-6: KAGOYA Gemini認証の再発行と解析受入

## 目的

KAGOYA検証環境で確認されたGemini認証エラーを、認証情報の値を露出させずに是正し、Android Development Buildでレシート撮影から解析結果確認、保存までを受入する。

KAGOYAは環境専用の認証情報を用いる。T320 dev/stable、MacBook、GitHub、会話、Issue、PRから認証情報を複写・参照・出力しない。

## 変更境界

- 対象はKAGOYAの`backend_gemini_api_key`だけである。
- DB、uploads、TOTP、JWT、R2の保持期間、公開ポート、T320の設定は変更しない。
- helperは認証情報ファイルを原子的に置換するだけで、Compose再作成、外部API呼出し、旧認証情報の失効は行わない。
- `seed.ts`は実行しない。必要な世帯別設定と標準分類マスタはIssue #118-2-2のbaseline済みである。

## 実施順序

1. 管理者がGemini提供者側でKAGOYA専用の新しい認証情報を作成する。値はパスワードマネージャーだけへ保存し、会話、端末履歴、Gitへ入力しない。
2. 本IssueのPRがmainへマージされた後、KAGOYAでroot経由のhelperを実行する。helperは引数を受け取らず、値を非表示で2回入力させ、root所有・mode `0600` のファイルを原子的に置換する。
3. backendだけを再作成する。認証情報の値を環境変数、docker引数、ログへ渡さない。
4. 値を含まないアプリ診断でGemini認証エラーが解消していることを確認する。
5. Android Development Buildで、撮影、アップロード、解析結果表示、確認保存を連続して確認する。Expo Goは同じ経路の補助確認とする。
6. 新しい経路の成功後に限り、提供者側で旧認証情報を無効化する。失効操作は人間が実施する。

## 停止条件

次のいずれかでは後続へ進まない。

- 新しい認証情報を安全に保管できない、または値露出の疑いがある。
- helperの確認入力が不一致、root所有・modeの検査失敗、backend再作成失敗。
- 値を含まない診断でGemini認証エラーが継続する。
- Android Development Buildで解析または保存が失敗する。

失敗時は新旧の認証情報を同時に無効化せず、記録には日時・環境・`pass`/`fail`・失敗分類だけを残す。認証情報、画像、レシート内容、接続先は残さない。

## 受入記録

| 項目 | 記録する内容 |
| --- | --- |
| 新規認証情報の作成 | 実施日時、`pass` / `fail` のみ |
| root helper | 実施日時、`pass` / `fail` のみ |
| backend再作成 | 実施日時、`pass` / `fail` のみ |
| 値を含まない診断 | 失敗分類なし、または固定分類のみ |
| Android Development Build | 撮影、解析表示、保存の各 `pass` / `fail` |
| Expo Go補助確認 | 解析表示、保存の各 `pass` / `fail` |
| 旧認証情報の失効 | 成功確認後に実施した日時、`pass` / `fail` のみ |
