Receipt AI Classifier (Tentative)
AI-Driven Expense Orchestration for Family Finance

30年超のエンタープライズ開発（Java/RDB）で培った堅牢な設計思想をベースに、最新の React Native × Google Gemini (LLM) を活用して「いかに爆速で実用的なプロダクトを構築できるか」を検証するプロトタイピング・プロジェクトです。

🚀 Concept & Philosophy

本プロジェクトは、単なる家計簿アプリではなく、以下の 「AIネイティブな開発戦略」 を具現化することを目的としています。
    Prompt Engineering over Manual Coding: Google Gemini を「ペアプログラマ」としてフル活用し、実装速度を極限まで高める。
    Senior Insight: AIが生成するコードに対し、長年の経験に基づいた「データ整合性」や「保守性」の観点から検収（Code Review）を行う。
    Rapid Prototyping: 手書きのコメント整備よりも、AIによる高速なイテレーションと、Supabase を活用したサーバーレス・アーキテクチャの検証を優先。

🛠 Technical Stack
Category	Technology
Frontend	React Native (Expo), TypeScript
Backend	Supabase (Postgres, Auth, Storage, Edge Functions)
Infrastructure	Docker (Home Server: Dell PowerEdge T320 / Ubuntu)
AI / OCR	Google Gemini API (Gemini 1.5 Pro / Flash)

💡 Key Features
    AI Receipt Parsing: レシート画像から品目・金額・日付を Gemini で高精度に抽出。
    Multi-Family Classification: 「自分の家族」と「娘の家族」の経費を AI が自動判定・分類。
    Hybrid Deployment: 自宅サーバー上の Docker 環境とクラウド（Supabase）を組み合わせたハイブリッド構成。

🛠 Development Setup

本プロジェクトは、開発効率を最大化するために Docker 環境での構築を前提としています。

1. 開発用アセットの配置
プライバシー保護およびリポジトリ軽量化のため、サンプル画像は Git 管理対象外としています。
Bash
# プロジェクトルートに test-assets/ ディレクトリを作成
mkdir test-assets
※ test-assets/ 内にテスト用のレシート画像を配置して動作確認を行います。

2. 環境構築（Docker）
(※ここに後述の手順を記載してください)

📝 Developer's Note
    「30年前のJava開発とは、開発の『手触り』が劇的に変わりました。今は、Geminiのような強力なAIエンジンを、長年の経験というハンドルでどう制御するかがエンジニアの介在価値だと考えています。コードの見栄え以上に、アーキテクチャの妥当性と価値提供の速度にフォーカスしています。」
