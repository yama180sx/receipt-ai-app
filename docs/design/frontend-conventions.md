# フロントエンド実装規約 & AI プロンプトテンプレート

Epic: [#459 Issue #101](https://github.com/yama180sx/receipt-ai-app/issues/459) / [#468 Issue #102](https://github.com/yama180sx/receipt-ai-app/issues/468) / [#502 Issue #104](https://github.com/yama180sx/receipt-ai-app/issues/502)  
子 Issue: [#461 Issue #101-7](https://github.com/yama180sx/receipt-ai-app/issues/461) / [#474 Issue #102-4](https://github.com/yama180sx/receipt-ai-app/issues/474) / [#506 Issue #104-3](https://github.com/yama180sx/receipt-ai-app/issues/506)  
計画: [plan.md](../refactor/plan.md) §8 / §11

本ドキュメントは **新規実装・AI 駆動開発・コードレビュー** の正本とする。層の全体像は [architecture.md](./architecture.md) §6、画面一覧は [frontend-screens.md](./frontend-screens.md) を参照。

| 資料 | 内容 |
|------|------|
| [architecture.md](./architecture.md) §6 | フロントエンド概要・features/ 一覧 |
| [frontend-screens.md](./frontend-screens.md) | ルート・画面遷移 |
| [plan.md](../refactor/plan.md) §8 | Epic #101 計画 |
| [ChatGPT レビュー 20260622](../specs/chatgpt/ChatGPT_レビュー_20260622.txt) | 本規約の根拠（79/100点） |

---

## 1. ディレクトリ構成

```
frontend/
├── app/                    # Expo Router（ルート定義のみ。ロジック禁止）
├── src/
│   ├── screens/            # 画面の薄型ラッパー（hook + JSX）
│   ├── features/<domain>/  # ドメイン単位の Application 層
│   │   ├── hooks/          # useXxx.ts（API・state・イベント）
│   │   ├── components/     # 画面専用 UI 部品
│   │   ├── styles/         # feature 固有スタイル（任意）
│   │   ├── utils/          # feature 固有の純関数（任意）
│   │   └── index.ts        # バレル export
│   ├── components/         # 横断 UI（ui/, モーダル等）
│   ├── api/                # HTTP ラッパー（Hook から呼ぶ）
│   ├── mappers/            # API DTO → ViewModel
│   ├── domain/<area>/    # 業務ルール純関数（React import 禁止）— #104-3
│   ├── types/              # ViewModel・画面固有型（DTO は generated）
│   ├── utils/              # 横断ユーティリティ
│   ├── hooks/              # 横断 hook（レイアウト等）
│   └── contexts/           # 既存 Context のみ（新規は原則禁止）
```

**成功パターン（参照実装）**

| Epic | Issue | 成果 |
|------|-------|------|
| #99 | [#387](https://github.com/yama180sx/receipt-ai-app/issues/387) | `SplitEditorScreen` 588→146行、hook + 子コンポーネント |
| #100 | [#431](https://github.com/yama180sx/receipt-ai-app/issues/431) | `LoginScreen` + `useLoginFlow` + step コンポーネント |

---

## 2. 責務と行数ガイドライン

| 対象 | 上限（目安） | 責務 | 禁止 |
|------|-------------|------|------|
| `screens/*.tsx` | **150 行** | レイアウト・hook 呼び出し・子コンポーネント配置 | API 直 import、`useState` による複雑なフォーム/API 管理 |
| `features/*/hooks/useXxx.ts` | **250 行** | 取得・保存・フィルタ・画面 state | JSX、StyleSheet |
| `features/*/components/*.tsx` | **120 行** | 表示・ユーザー入力の委譲 | 直接 `api/*` 呼び出し（hook 経由） |
| `utils/*.ts`（純関数） | — | 計算・変換 | React import、副作用 |

200 行を超えた時点で **分割 Issue を検討** する（後追いリファクタを避ける）。

### 2.1 Screen の標準形

```tsx
// screens/ExampleScreen.tsx
export const ExampleScreen = (props: Props) => {
  const example = useExample(props);

  if (example.loading) return <LoadingView />;

  return (
    <ScreenLayout>
      <ExampleHeader onBack={props.onBack} />
      <ExampleList items={example.items} onSelect={example.handleSelect} />
    </ScreenLayout>
  );
};
```

### 2.2 feature 新設時のチェックリスト

- [ ] `features/<domain>/hooks/useXxx.ts` にロジックを集約した
- [ ] `features/<domain>/components/` に UI を分割した
- [ ] `features/<domain>/index.ts` から export した
- [ ] Screen は 150 行以内
- [ ] 計算ロジックは `domain/` または feature `utils/` の純関数に抽出（必要ならテスト追加）

### 1.1 feature 間依存ルール（#104-3）

| 依存元 | 依存先 | ルール |
|--------|--------|--------|
| `screens/` | `features/<domain>/index.ts` | **バレル経由のみ**。`features/*/hooks/useXxx.ts` 等の内部パス直 import 禁止 |
| `features/<A>/` | `features/<B>/` | **原則禁止**。共通処理は `domain/`・`types/`・`utils/`・`api/` へ昇格 |
| `features/*/hooks` | `domain/` | 業務ルール（按分計算等）は domain 純関数を呼ぶ。hook 内に直書きしない |
| `domain/` | `features/`・`screens/` | **禁止**（下位層から上位層へ依存しない） |
| `screens/` | `screens/` | **禁止** |

**Context**: ロジックは `hooks/useXxxController.ts` に抽出し、Context は Provider + `useContext` の配布のみ（`ReceiptTrayProvider` 参照 #104-3）。

---

## 3. 状態管理

| 用途 | 採用 | 例 |
|------|------|-----|
| 画面ローカル（取得・編集・保存） | `features/*/hooks` + `useState` / `useCallback` | `useReceiptScan`, `useSplitEditor` |
| アプリセッション（ログイン・カテゴリ一覧） | `AppSessionProvider`（`features/app`） | 全画面共通の認証・マスタ |
| レシート受付トレイ | `ReceiptTrayProvider` | `/tray`, ホーム連携 |
| グローバルストア | **未使用** | Redux / Zustand は導入しない |

### 3.1 Context 方針

- **既存 Context のみ使用**: `AppSessionProvider`, `ReceiptTrayProvider`
- **新規 Context は原則禁止**。必要な場合は Issue に justification（対象画面・prop drilling 回避理由・代替案の検討結果）を記載する
- 画面間のデータ受け渡しは **Expo Router の params / query** または **API 再取得** を優先する

---

## 4. API・エラー・型

### 4.1 API 呼び出し

| 層 | ルール |
|----|--------|
| Screen | `src/api/*` を import **しない**（#100-14） |
| Hook | `receiptApi` / `categoryApi` 等を呼ぶ。複数 API の編成は Hook の責務 |
| API Client | `apiClient.ts` — 認証ヘッダ・401 / 403 の共通処理 |

### 4.2 エラーハンドリング

```typescript
import { getApiErrorMessage, showApiErrorAlert } from '../utils/apiError';

try {
  await someApi.call();
} catch (err: unknown) {
  showApiErrorAlert('エラー', err, '操作に失敗しました。');
}
```

| 用途 | 関数 |
|------|------|
| メッセージ抽出 | `getApiErrorMessage(error, fallback?)` |
| ユーザー通知 | `showApiErrorAlert(title, error, fallback?)`（#101-6 で横断適用） |
| 確認ダイアログ | `showConfirmDialog` |
| 通知 | `showAlert` |

**禁止**: `catch` 内の `console.error` のみ、`setError('固定文言')` の直書き（一覧取得失敗などユーザーに見せるべき箇所）

### 4.3 型

| 種別 | 正本 | 場所 |
|------|------|------|
| API 契約（DTO） | OpenAPI | `frontend/src/api/generated`（[openapi.yaml](../openapi/openapi.yaml)） |
| ViewModel | 手動定義 | `frontend/src/types/`（generated の再 export + 画面拡張） |
| 変換 | Mapper | `frontend/src/mappers/` |

**データフロー図（DTO → UI）**: [architecture.md](./architecture.md) **§6.3** — mermaid 図と統計 / 精算の具体例（#105-4）

**Mapper 利用方針（#104-3）**

- DTO と ViewModel が **同一 shape** の場合: Hook が `api/generated` 型を直接利用してよい
- 表示用に **フィールド追加・正規化・集計** が必要な場合: `mappers/` に純関数を置き、Hook は Mapper 経由で ViewModel を得る
- 新規・変更 API で表示変換が発生したら、まず Mapper 追加を検討する（全 API 一括 Adapter 化は不要）

**新 API 追加時（#102-4）**

1. `docs/openapi/openapi.yaml` を **先に** 更新する（契約 SSOT）
2. `npm run generate:api` で `api/generated/schema.ts` を再生成する
3. 必要なら `api/generated/index.ts` にエイリアスを追加する
4. Hook は generated 型または `types/` の re-export を使う。**API レスポンスと同形の interface を `types/` に新規定義しない**
5. 画面固有の入力中 state・表示用型のみ `types/` に置く（例: `ParsedReceiptData`, `ReceiptForSplitEditor`）
6. PR 前に `npm run check:api`（generated diff）をパスする

手順の正本: [api-spec.md](./api-spec.md) §9。

- `any` / `as any` **禁止**。`unknown` + 型ガードまたは Zod 等で絞る
- React Hook Form は **導入しない**（hook + `useState` で十分。Epic #101 Won't fix）

---

## 5. UI・スタイル

- レイアウト: `screenLayout` / `cardStyles`（[frontend-screens.md](./frontend-screens.md) §7.1）
- ボタンラベル: `constants/buttonLabels.ts`
- 通知: `showAlert` / `showConfirmDialog`（`Alert.alert` 直叩き禁止 #100-13）
- Platform 分岐（Web / iOS / Android）が複雑な場合は **hook または `utils/` に閉じる**（`ReceiptImageCropModal` 参照 #101-2）

---

## 6. AI プロンプトテンプレート

以下をそのままコピーし、`{...}` を埋めて使用する。

### 6.1 新機能・新画面の実装依頼

```markdown
## タスク
{機能の概要を1〜3文}

## 実装規約（必須・[frontend-conventions.md](docs/design/frontend-conventions.md) 準拠）
- Screen は `frontend/src/screens/` に置き、**150行以内**。ロジックは `features/{domain}/hooks/useXxx.ts`
- UI 部品は `features/{domain}/components/` に分割（Form / List / Actions 等）
- Screen から `src/api/*` を直接 import しない
- API エラーは `getApiErrorMessage` / `showApiErrorAlert` を使用
- `any` / `as any` 禁止。DTO は `api/generated`、ViewModel は `types/`
- 既存の `features/settlement/`（#387）または `features/auth/`（#431）と同じ構成に合わせる
- React Hook Form は使わない。Context は新設しない

## 完了条件
- [ ] Screen < 150行、各コンポーネント < 120行、hook < 250行
- [ ] `features/{domain}/index.ts` から export
- [ ] 計算ロジックがある場合は `utils/` 純関数 + テスト
- [ ] `npm test`（frontend）がパス

## スコープ外
{明示的にやらないこと}
```

### 6.2 既存画面のリファクタ依頼

```markdown
## タスク
`{Screen名}.tsx` を [frontend-conventions.md](docs/design/frontend-conventions.md) に準拠するよう分割する。

## 参考実装
- SplitEditorScreen: Epic #99 #387（588→146行）
- LoginScreen: Epic #100 #431（useLoginFlow + step コンポーネント）

## 分割案（実装前に提示すること）
- hook 名と責務
- 子コンポーネント一覧
- 移動後のおおよその行数

## 完了条件
- [ ] Screen は hook 呼び出し + JSX のみ
- [ ] 既存の画面挙動・テストが維持される
```

### 6.3 コードレビュー依頼（減点方式）

```markdown
対象: {ブランチ名 / PR / ファイルパス}

以下の4観点で **100点満点の減点方式** でレビューしてください。
各指摘に Must（マージ前必須）/ Should（別 Issue 可）/ Later を付与してください。

1. DRY（25点）— 重複ロジック、散在する try/catch / フォーム state
2. 責務分割（25点）— Screen 150行超、hook 250行超、UI とロジック混在
3. 型（25点）— any / as any、DTO と ViewModel の混同
4. 保守性（25点）— Context 増殖、結合度、Platform 分岐の散在

行数上限（[frontend-conventions.md](docs/design/frontend-conventions.md)）:
- Screen 150 / コンポーネント 120 / hook 250

分割が必要な場合は具体的なファイル名案を提示してください。
```

### 6.4 新 API 追加の実装依頼

```markdown
## タスク
{新エンドポイント / 既存 API 拡張の概要}

## 契約（OpenAPI first — [api-spec.md](docs/design/api-spec.md) §9 準拠）
- [ ] docs/openapi/openapi.yaml を先に更新
- [ ] npm run generate:api で FE 型を再生成
- [ ] DTO は api/generated のみ。ViewModel は types/（API レスポンスの手動二重定義禁止）
- [ ] BE レスポンス envelope（success + data）は OpenAPI schema と一致

## 実装規約
- backend: routes → controller → service
- frontend: api/* ラッパー → features/*/hooks（Screen から api 直 import 禁止）
- エラー: showApiErrorAlert / getApiErrorMessage
- any / as any 禁止

## 完了条件
- [ ] npm run check:api && npm run check:openapi がパス
- [ ] npm test（frontend / backend）がパス
- [ ] api-spec.md に as-built 追記
```

---

## 7. Epic #101 との対応

| 規約項目 | 実装 Issue |
|----------|------------|
| Screen 分割（PromptEditor 等） | #101-1 [#465](https://github.com/yama180sx/receipt-ai-app/issues/465) |
| 画像操作 hook 分離 | #101-2 [#466](https://github.com/yama180sx/receipt-ai-app/issues/466) |
| `showApiErrorAlert` 横断適用 | #101-6 [#464](https://github.com/yama180sx/receipt-ai-app/issues/464) |
| 本ドキュメント | #101-7 [#461](https://github.com/yama180sx/receipt-ai-app/issues/461) |

Phase 5（API 契約 SSOT / BE Mapper）は Epic [#102](https://github.com/yama180sx/receipt-ai-app/issues/468) / [#103](https://github.com/yama180sx/receipt-ai-app/issues/469) で対応する。新 API 手順は [#474 #102-4](https://github.com/yama180sx/receipt-ai-app/issues/474) → [api-spec.md](./api-spec.md) §9。
