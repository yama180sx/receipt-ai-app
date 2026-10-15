# Issue #132-1 DB接続credentialローテーションとA5M2安全接続

内部管理番号: Issue #132-1

## 方針

- `cntadm` はRecAIpt backendとbackup専用であり、A5M2へ配布しない。
- `receipt_a5m_ro` はA5M2専用の`LOGIN`可能な参照専用ロールとする。`CONNECT`、`public` schemaの`USAGE`、既存・将来テーブルとsequenceの`SELECT`だけを付与する。
- T320のPostgreSQLはroot管理runtimeで`127.0.0.1:${DB_PORT}`へだけbindする。自宅LANのA5M2はSSHローカルポートフォワードを通す。DBポートをLAN／インターネットへ直接公開しない。
- KAGOYAは対象外。主系昇格後のA5M2接続は別途Tailscale経由SSHで設計する。

## DB接続credentialのローテーション

`receipt-rotate-db-credentials {dev|stable}`は、環境を固定して次を行う。

1. 現在のroot管理backupを成功させる。
2. backendが実際に使うDB接続URLでTCP認証できることを、値を出さずに確認する。
3. `cntadm`のDB password、`backend_database_url`、`postgres_password`、`db_password`を新しい乱数へ同期更新する。
4. 固定deployと更新後backupの成功を確認する。

password、接続URL、credentialファイル内容を標準出力、journal、Git、Issue、PR、argvへ出してはならない。失敗時は再実行せず、値なしのservice状態だけを確認して判断する。

## A5M2参照専用ロール

`receipt-provision-a5m-readonly {dev|stable}`は、変更前backup後に`receipt_a5m_ro`を作成または再発行する。新しいpasswordはroot専用暗号化artifactだけに保存する。root管理者がローカル一時ファイルへ復号してパスワードマネージャーに保存し、A5M2へ手入力する。artifactと値を通常ユーザー、共有端末、Git、チャットへ転記しない。

A5M2接続は参照専用とし、接続先はクライアント側の`127.0.0.1`とSSHローカル転送ポートを使う。T320では既存の自宅LAN内SSHを使い、Tailscaleを前提にしない。
