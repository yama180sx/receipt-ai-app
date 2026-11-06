# Issue #132-4: KAGOYA緊急password再設定

KAGOYAでpasswordを失念した場合は、rootがTTYから`receipt-emergency-password-reset-kagoya`を直接実行する。DB直接更新、seed、通常ユーザーのDocker操作は使わない。

- helperは引数を受け取らず、固定backendとKAGOYA backup unitだけを使う。
- 対象のFamilyMember IDと確認語を端末で入力する。利用者名、password、hash、招待コードは表示・記録しない。
- 事前backup成功後だけ、15〜128文字のpasswordを非表示入力で2回受け取り、stdinでbackendへ渡す。
- transaction内でpassword hashを更新し、`authVersion`を増加させる。既存sessionは無効になる。
- TOTP secret・有効状態は変更しない。再設定後は既存の認証アプリでTOTPを入力する。
- 成功後は値を含まないreset IDだけを監査記録へ残す。失敗時は再実行やDB直接操作をせず停止する。

このhelperの設置・実行はmain反映後にだけ行う。通常時にpasswordを変更する手段ではない。
