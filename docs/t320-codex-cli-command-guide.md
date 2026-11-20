# T320 での Codex CLI・tmux コマンド集

最終更新: 2026-11-13

T320 上の RecAIpt を、このPCまたはMacBookの VS Code Remote SSH から開発するときの個人向け手順である。

> この資料の「開発用ユーザー」は、T320 上で RecAIpt のファイル編集・Git 操作を行う Linux ユーザーを指す。Codex の認証情報・設定・会話履歴はユーザーごとの `~/.codex` に保存されるため、管理用ユーザーと開発用ユーザーを混在させない。

## 1. まず覚える日常操作

### T320 の作業場所へ入る

VS Code で T320 に Remote SSH 接続し、**統合ターミナル**を開く。次を1行ずつ実行する。

```bash
cd ~/dev/receipt-ai-app
tmux new -A -s recai
```

`tmux new -A -s recai` は、`recai` セッションがなければ作成し、あれば同じ場所へ再接続する。

画面を確認してから次を判断する。

| 画面 | 次にすること |
|---|---|
| `OpenAI Codex` や `›` が見える | すでにCodex内。`codex` と入力せず、日本語の依頼を書く。 |
| `ユーザー名@ホスト名:...$` が見える | 通常のシェル。次を実行する。 |

```bash
codex
```

Codex CLI は、起動したディレクトリを作業対象プロジェクトとして扱う。このため、必ず `~/dev/receipt-ai-app` で起動する。

### VS Code を閉じるだけの場合

Codex が応答・コマンド実行中でないことを確認し、Codex画面で次を順番に押す。

```text
Ctrl+B, 続けて D
```

これは tmux からの切り離しである。T320上のCodexとtmuxは動作を継続する。VS Codeはそのまま閉じてよい。

次回は「T320 の作業場所へ入る」の2コマンドで同じ画面へ戻れる。

### T320 の電源を落とす場合

1. VS Codeで未保存のファイルがないことを確認する。
2. Codexが応答・テスト実行中でないことを確認する。
3. Codex内で次を実行する。

```text
/exit
```

4. 通常のシェルに戻ったら、tmuxを終了してから電源を落とす。

```bash
exit
sudo systemctl poweroff
```

`/exit` はCodexを終了するだけで、会話を削除しない。電源を入れ直した後は、以下で保存済み会話を選び直せる。

```bash
cd ~/dev/receipt-ai-app
tmux new -A -s recai
codex resume
```

直前の会話を開く場合は、次を使う。

```bash
codex resume --last
```

## 2. Codex内で使うコマンド

以下は、`›` が表示される **Codex内** で入力する。通常のBashシェルでは実行しない。

| コマンド | 用途 |
|---|---|
| `/status` | モデル、権限、作業ディレクトリ、コンテキスト使用量を確認する。 |
| `/permissions` | ファイル変更・コマンド実行の承認方法を確認・変更する。迷ったら厳しめの設定を維持する。 |
| `/diff` | Codexが変更したファイルの差分を確認する。コミット前に使う。 |
| `/recap` | 現在の会話を要約する。長い会話の状況確認に使う。 |
| `/new` | 新しい会話を開始する。以前の会話は消えない。 |
| `/rename` | 現在の会話に分かりやすい名前を付ける。 |
| `/resume` | 保存済み会話の一覧から再開する。`Cwd`、`Repo`、`All` の範囲を選べる。 |
| `/fork` | 現在の会話を元に別の会話を分岐する。元の会話は残る。 |
| `/export /tmp/recai-codex-session.md` | 会話全体をT320上のMarkdownファイルとして保存する。 |
| `/tui` | terminal scrollback 表示と全画面表示を選ぶ。設定後はCodexを再起動する。 |
| `/raw` | コピーや選択をしやすい表示に切り替える。 |
| `/exit` または `/quit` | Codexを終了して通常のシェルに戻る。会話は削除しない。 |

### 会話を読み返す・保存する

SSH先のT320にはGUIクリップボードがないため、`/export` の **Copy to clipboard** は失敗することがある。会話は次のようにファイル保存する。

```text
/export /tmp/recai-codex-session.md
```

VS Codeで `Ctrl+P` を押し、次のパスを入力すると開ける。

```text
/tmp/recai-codex-session.md
```

表示が流れて読み返しにくい場合は、Codex内で `/tui` を実行して **scrollback** を選ぶ。その後、`/exit` で終了してから `codex resume --last` で再開する。

## 3. 通常のターミナルで使う補助コマンド

以下は、`ユーザー名@ホスト名:...$` が表示される通常のシェルで実行する。

| コマンド | 用途 |
|---|---|
| `pwd` | 現在のディレクトリを確認する。 |
| `whoami` | 開発用ユーザーでログインしているか確認する。 |
| `tmux ls` | tmuxセッションの一覧を確認する。 |
| `tmux new -A -s recai` | `recai` に新規作成または再接続する。普段使うコマンド。 |
| `git status --short` | 未コミット・未追跡の変更を確認する。 |
| `git diff --check` | 末尾空白など、Git差分の基本的な問題を確認する。 |
| `git diff` | 未ステージの変更内容を確認する。 |
| `codex --version` | Codex CLIが利用可能か確認する。 |
| `codex resume` | Codexを起動せず、保存済み会話の選択画面を開く。 |
| `codex login status` | Codexのログイン状態を確認する。 |

## 4. 最初の依頼例

Codexには日本語で依頼できる。最初は変更を禁止して調査だけを頼むと安全である。

```text
このリポジトリの構成と開発時の注意点を調査してください。
変更は加えず、日本語で要点を説明してください。
```

実装前に方針確認をしたい場合:

```text
商品一覧画面の検索機能について現状実装を調査してください。
まず変更案と影響範囲を日本語で説明し、私が承認するまでファイルは変更しないでください。
```

実装まで依頼する場合:

```text
商品一覧画面に商品名の部分一致検索を追加してください。
既存の設計規約とテスト方針を確認し、変更前に実装方針を短く説明してください。
実装後は関係するテストを実行し、変更内容と結果を日本語で報告してください。
```

## 5. 初回導入・ログイン

開発用ユーザーでのみ実行する。Codex CLIが見つからない場合は、公式インストーラーを使う。

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
exec "$SHELL" -l
codex --version
```

初回ログインは、T320上で次を実行する。

```bash
codex login --device-auth
```

表示されるURLと一時コードを、手元PCまたはMacBookのブラウザで使って認証する。`~/.codex/auth.json` には認証トークンが含まれるため、Git・チャット・Issueへコピーしない。

## 6. 注意事項

- `~/.codex` を複数PCや別ユーザー間で同期・共有しない。認証情報を含み、同時アクセスでは会話データベースを壊すおそれがある。
- `tmux kill-session -t recai` は、作業中のCodexも終了するため、通常は実行しない。
- T320の電源を強制断しない。応答中・テスト中の処理や最後の会話記録が失われる可能性がある。
- Codexが行った変更も自動コミットはされない。`/diff`、`git status --short`、テストで確認してから、通常のGit手順でコミットする。
- APIキー、パスワード、`.env` の秘密値、`~/.codex/auth.json` の内容は会話やGitへ貼り付けない。

## 公式資料

- [Codex CLI](https://learn.chatgpt.com/docs/cli)
- [Developer commands（`/resume`、`/export`、`/tui`など）](https://learn.chatgpt.com/docs/developer-commands)
- [Codex authentication](https://learn.chatgpt.com/docs/auth)
