# screens/ thin wrapper ルール

`frontend/src/screens/` は **UI レイヤーの薄いラッパー** として扱う。

## 方針

- Screen は JSX 構成とルーティング接続に集中する
- データ取得、保存、変換、複雑な状態遷移は `features/*/hooks` に集約する
- Screen から `src/api/*` を直接 import しない（Hook 経由）
- 再利用 UI は `features/*/components` または `components/ui` に配置する

## 期待する責務分離

- `screens/`: 画面レイアウト、props 接続、ナビゲーション
- `features/*/hooks`: 主要画面操作（1 画面主要操作 = 1 Hook）
- `features/*/components`: ドメイン単位の表示部品
- `mappers/`: API レスポンスから ViewModel への変換
