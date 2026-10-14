# Issue #118-2-2: KAGOYA設定ベースラインと受入

## 対象と境界

`prisma:kagoya-baseline` は、既存の全 `FamilyGroup` に対して、初期設定JSONから次の**不足レコードだけ**を追加する。

- 世帯別: Category、Store、PromptTemplate（`RECEIPT_ANALYSIS`、`PRODUCT_CLASSIFICATION`）
- 共通: StandardCategory、ProductType、StandardProductClassificationRule

このコマンドは `seed.ts` を呼ばず、削除・更新をしない。既存の同名Category、同名Store、同keyのPromptTemplateは、有効・無効を問わず明示的なカスタマイズとして保持する。既存のレシート、画像、認証情報、TOTP、解析・精算・学習データは読み書きしない。

`RECEIPT_ANALYSIS` が既存だが無効である場合も、同期は再有効化しない。この状態は `prisma:kagoya-baseline:check` が失敗として検知するため、管理者が意図を確認して管理画面から対処する。

標準分類マスタは既存の `prisma:update` と同じく、コードをキーに同期する。世帯別baselineを含める必要がある時は、本Issueのコマンドを使う。

## 実行後の非秘密検証

検証コマンドはレコードの値、世帯ID、招待コード、秘密値を表示せず、件数と `pass` / `fail` だけを出力する。`pass` には少なくとも次が必要である。

- 1件以上の世帯がある
- 必要な共通標準マスタが有効である
- 各世帯に基準Category、Store、PromptTemplateが存在する
- 各世帯に有効な `RECEIPT_ANALYSIS` がある

実環境での安全なコピペ実行手順は、developからmainへのPRがマージされた後にだけ案内する。

## 本番昇格前の受入記録

main反映後、値・URL・IP・利用者情報・画像を記録せず、次を実施日時と `pass` / `fail` だけで記録する。

1. baseline同期と検証が成功すること。再実行後も追加数が0であること。
2. Web、Android Development Build、Expo GoのそれぞれでログインとTOTPを確認すること。
3. 各モバイル経路でVPN経由Metro接続を確認すること。
4. Android Development Buildで、撮影、アップロード、解析結果表示、確認保存までを連続して確認すること。
5. 解析失敗時はbackendコンテナ内のアプリログを、秘密値・実データを出力せず失敗分類だけで確認すること。
6. 2GB構成について、通常時と解析時のメモリ、ディスク、サービスhealthを値を伏せて `pass` / `warn` / `fail` で記録すること。

T320 stableのDB／uploads移行、TOTP秘密値の扱い、秘密値ローテーション、切替・ロールバック、T320停止後のDRはIssue #118-2-3の対象であり、本Issueでは変更しない。
