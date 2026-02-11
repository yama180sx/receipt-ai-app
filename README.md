# Receipt AI Classifier (Tentative)

レシート画像から購入データを抽出し、家庭間での経費分類を行うアプリ。

## 技術スタック
- **Frontend**: React Native (Expo)
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Infrastructure**: Docker
- **AI**: OpenAI API (GPT-4o / GPT-4o-mini)

## 開発環境の構築（Docker使用）
... (手順は後述)

## 開発用アセットの配置
本プロジェクトでは、プライバシー保護およびリポジトリの軽量化のため、実際のレシート画像等は Git の管理対象から除外しています。動作確認を行う場合は、以下の手順でアセットを配置してください。

1. プロジェクトルートに `test-assets/` ディレクトリを作成
   ```bash
   mkdir test-assets