# Issue #132-2 緊急password再設定とsession無効化

内部管理番号: Issue #132-2

## 境界

- passwordは復元・表示しない。bcrypt hashだけを保存する。
- A5M2、seed、DB直接更新を復旧手段にしない。
- rootがTTYから固定環境を指定して起動する`receipt-emergency-password-reset {dev|stable}`だけを緊急復旧に使う。
- 対象`FamilyMember` ID、明示確認語、成功済みroot管理backupを必要とする。
- 新passwordは15〜128文字、非表示入力と確認入力だけで受け取り、stdinでbackendへ渡す。平文・hashをargv、環境変数、journal、監査へ出さない。

## session無効化

`FamilyMember.authVersion`をJWTのaccess／pending tokenへ含める。認証middlewareはDBの現行versionと比較し、不一致ならtokenを拒否する。緊急再設定はpassword hash更新と同一transactionでversionを増加させるため、対象メンバーの既存sessionと途中のTOTP sessionは直ちに無効になる。

## TOTPと監査

TOTP secretと有効状態は変更しない。再設定後は新passwordと既存の認証アプリのコードでログインする。

`EmergencyPasswordResetAudit`にはreset ID、対象ID、世帯ID、更新後version、時刻だけを残す。password、hash、氏名、招待コード、TOTP secretは保存しない。
