# Issue #131-8 Secret scan検出候補の値なし診断

GitHub Issue: [#708](https://github.com/yama180sx/receipt-ai-app/issues/708)

内部管理番号: Issue #131-8

## 1. 診断方針

検出値、行内容、URL、token断片、実credentialは表示・保存しない。公式checksumを検証したGitleaks `8.24.3` を一時領域で実行し、カスタムreport templateで次のmetadataだけを取得した。

- commit
- file
- rule ID
- line number

Gitleaksの通常ログとreportは一時領域に限定し、値を出力せず診断終了時に削除した。

## 2. 診断結果

履歴全体の検査では、2026-09-13のTOTP鍵バージョン導入コミットに `generic-api-key` の検出が5件あった。対象はTOTP鍵バージョンを扱うmigration、暗号化ユーティリティ、および再暗号化テストである。

対象箇所は、runtimeのTOTP暗号鍵ではなく、鍵バージョンまたはテストfixtureを扱うコードである。実際のTOTP鍵はroot管理encrypted credentialからruntimeでのみ読取り、当該コミット・ファイル・テストコードには保存しない。

Issue #131-4でdev/stableのTOTP専用鍵を導入・再暗号化・確認済みであり、現行runtimeに移行用旧鍵の読取り経路はない。

## 3. 是正

`.gitleaksignore` に5件のGitleaks fingerprintを追加する。各行は`commit:file:rule:line`だけであり、秘密値、値のhash、URL、token断片を含まない。

この方式は、確認済みの過去コミットにある5つの誤検知だけを対象とする。新しいcommit、別ファイル、別rule、行番号変更後の検出は抑止しない。

Secret scanのGitleaks versionを`8.24.3`へ固定し、ローカルのpre-commit設定と検証環境を一致させる。version更新時は、PR・push・履歴全体の再検査を行う。

## 4. 検証条件

- `.gitleaksignore`適用後、Gitleaks `8.24.3` の履歴全体検査が成功する。
- PRとdevelopへのpushでSecret scanが成功する。
- 手動実行で履歴全体のSecret scanが成功する。
- 実credential、実データ、実値をIssue・PR・ログ・report artifactへ出力しない。

## 5. 判定

本件は、値を含まないTOTP鍵バージョン／テストfixtureへの `generic-api-key` 誤検知として扱う。実運用credentialの漏えいを示す証拠は本診断では確認されなかった。

実credentialのローテーションはIssue #131-4で完了済みである。本Issueの残作業は、PR・push・履歴検査でのSecret scan成功確認だけである。
