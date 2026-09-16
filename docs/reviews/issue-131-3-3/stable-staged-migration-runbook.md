# Issue #131-3-3 stable段階移行 実施計画

GitHub Issue: [#675](https://github.com/yama180sx/receipt-ai-app/issues/675)<br>
内部管理番号: Issue #131-3-3<br>
先行: [dev段階移行 実施計画](./dev-staged-migration-runbook.md)

## 1. 目的と適用条件

この手順はstableだけをroot管理のencrypted credential・固定systemd unitへ移すためのものである。devの成功をもって自動実行してはならない。main、stableの利用者データ、通知先、復旧可能性に影響するため、人間が承認したメンテナンス時間にだけ実施する。

stableの切替後の信頼境界はdevと同じだが、投入対象はroot所有設定に登録した承認済みmainコミットの完全長SHAに固定する。`main`の後続更新を自動取得してはならない。

```text
利用者／GitHub Actions runner（Docker非所属・Secret非保持）
  → 限定sudoで receipt-deploy-stable.service の開始だけを要求
    → root所有の固定helper
      → /srv/receipt-ai-app/stable（承認済み固定SHA）
      → /run/receipt-ai-app-stable の一時Secret
      → receipt-stable Compose project
```

## 2. 開始ゲート

次をすべて人間が確認・記録しない限り、stableを停止・切替しない。

- [ ] devの受入確認、root管理backup、Docker group除去後の権限確認がすべて成功している。
- [ ] devからstableへ進むことを管理者が明示承認した。
- [ ] 利用者へ停止時間、影響、連絡先を通知した。
- [ ] 作業担当者と復旧担当者が、メンテナンス時間中に対応可能である。
- [ ] stableの直近バックアップ（DB・uploads）の成功と作成時刻だけを確認した。
- [ ] stableのログイン、TOTP、既存レシート閲覧、解析、Discord／メール通知、backupが切替前に正常である。
- [ ] 対象mainコミットSHAが承認済みリリース内容であり、`/etc/receipt-ai-app/stable.env`の`STABLE_RELEASE_SHA`と一致する。値はGitHub workflowの入力に置かない。
- [ ] GitHub `stable` Environmentでrequired reviewerが設定され、承認済みの手動workflowだけがstable deploy unitを開始できる。
- [ ] stable専用の非機密設定とencrypted credentialを用意している。devのcredentialを複写・共有しない。
- [ ] 問題発生時はstableの旧経路に復旧し、追加調査・main変更は別途判断することを合意した。

Secret値、URL、パスワード、認証コードをIssue、PR、端末ログ、スクリーンショット、作業記録へ転記してはならない。

## 3. フェーズA: root構成の検査

root管理者が、root所有の固定作業ツリーから以下を確認する。この時点ではstableの旧Compose、旧cron、既存コンテナを変更しない。

- [ ] `/etc/receipt-ai-app/stable.env`はroot所有・0600であり、許可された非機密キーだけを含む。
- [ ] `/etc/receipt-ai-app/credentials/stable/`のencrypted credential論理名が揃っている。値は表示しない。
- [ ] deploy／backup helper、stable unit、timer、sudoersがroot所有・想定modeである。
- [ ] `visudo -cf`、`systemctl daemon-reload`、unit構文検査が成功する。
- [ ] 合成credentialによる読取り確認は、既存`receipt-stable`のコンテナ名・ポートと衝突しない一時unitで実施する。

stable deploy unitを合成値で起動してはならない。実行はstableの現行コンテナを置換し得るため、次フェーズの承認済み時間だけに限定する。

## 4. フェーズB: stableデータ移行と切替

1. stableの既存backupを1回成功させ、DB・uploadsアーカイブの作成時刻だけを記録する。
2. stableだけのコンテナ名、health、バックアップ時刻を値なしで記録する。devのCompose projectには触れない。
3. stable Composeだけを停止する。
4. root管理者が旧stableの`pgdata`、`redisdata`、`backend/uploads`を、`/var/lib/receipt-ai-app/stable/`配下へ属性を保持してコピーする。旧データは削除・上書きしない。
5. required reviewer承認後の手動workflowから`receipt-deploy-stable.service`を1回だけ実行する。helperは承認済み固定SHA、runtime image build、DB／Redis healthcheck、Prisma migration、Compose起動を行う。
6. stableのhealth、ログイン、管理者TOTP、既存レシート・画像、新規レシート解析、Discord試験通知、メール試験通知を確認する。
7. `receipt-backup-stable.service`を1回実行し、DB・uploadsバックアップと通知を確認する。
8. 成功後にだけstable backup timerを有効化し、旧stable cronを無効化する。devのunit、timer、cron、データは変更しない。

## 5. 受入・廃止判断

- [ ] frontend、runner、通常ユーザー、Git作業ツリーからstable Secretを読めない。
- [ ] stableのログイン、TOTP、既存データ、新規解析、Discord、メール、backupが成功する。
- [ ] stable deployはroot unitの承認済み固定SHAで成功し、ログ記録したSHA、root設定、リリース記録が一致する。DB migrationも同じ経路で完了する。
- [ ] GitHub Actions runnerはDocker socketを直接読めず、固定stable unitの開始以外を要求できない。
- [ ] 旧stableデータ、旧cron、旧`.env`複写経路はロールバック期限中は保持する。

## 5.1 2026-09-12 実施記録（値を含まない）

- [x] stableをroot管理の承認済み固定SHAでdeployし、DB migration 39件、backend health、DB／Redis healthを確認した。
- [x] 管理者ログイン、TOTP、AI予算通知のメール・Discord試験送信、root管理backup（DB・uploads）を確認した。
- [x] `receipt-backup-stable.timer`と`receipt-deploy-stable.service`を有効化し、再起動後のroot管理deployと起動後backupを確認した。
- [x] 旧stable backup cronを無効化し、root専用のロールバック控えを保持した。
- [x] 旧stableデータ、旧`.env`、旧cron控えはロールバック期限中に削除しないことを確認した。

後続コード修正（UI文言、root管理credential環境での初期登録CLI、backupの秘密値をプロセス引数へ渡さない対応）は、移行結果を変更せずdevelopでレビュー・検証してから次の承認済みstableリリースに含める。

上記が全て成功し、人間がロールバック期限の終了を承認するまで、旧経路を削除しない。削除対象と実施日時は値なしでIssueに記録する。devとstableの旧経路を一括で削除してはならない。

## 6. ロールバックと停止条件

Docker group除去前に失敗した場合は、root管理の新しい永続領域を利用せず、旧stable Composeと旧stableデータへ戻す。Docker group除去後の復旧はroot管理者だけが実施し、必要最小限・一時的なDocker group復帰、runner再起動、新しいログインセッションへの切替を行う。

次のいずれかを検知した時点で、stableの追加変更・旧経路の廃止・Issue完了を停止する。

- Secret露出または露出の疑い
- DB接続、ログイン、TOTP、既存データ、uploads、解析、通知、backupの失敗
- migration失敗またはデータ整合性への懸念
- 予定外の停止時間超過
- root helperが固定ref・固定unit以外を実行しようとする兆候

停止時は利用者への状況連絡を優先し、値を含まない記録だけを残す。Secret露出の疑いはADR-010の漏洩時対応に従い、当該credentialを失効・再発行するまで復旧完了としない。
