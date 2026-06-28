# RecAIpt

AIによるレシート解析と世帯単位の家計管理を実現する個人開発アプリです。

レシートの撮影から支出管理、明細単位の按分、月次精算までを一貫してサポートします。

---

## プロジェクト概要

RecAIptは、家族や同居人との共有支出管理を効率化するために開発したアプリです。

従来の家計簿アプリでは対応が難しい、

* 家族間での支出共有
* 明細単位での按分
* 月次精算
* レシート入力の自動化

を重視して設計しています。

---

## 画面サンプル（Screenshots）

### レシート各種画面（Android/iPhone/web）

<img width="135" height="315" alt="Screenshot (2026_06_26 6_26_31)" src="https://github.com/user-attachments/assets/43bff239-7cdb-4acf-9444-736a025facae" />
<img width="135" height="315" alt="Screenshot (2026_06_26 6_30_51)" src="https://github.com/user-attachments/assets/c550a9a7-1685-4f00-ab9e-9f602171a905" />
<img width="135" height="315" alt="Screenshot (2026_06_26 6_32_39)" src="https://github.com/user-attachments/assets/7552f7c3-b6fa-4da5-bcf0-fbaa3c28e4a0" />
<img width="135" height="315" alt="Screenshot (2026_06_29 7_57_35)" src="https://github.com/user-attachments/assets/fc3d04e8-1837-40d5-b121-172addf7f564" />
<img width="135" height="315" alt="Screenshot (2026_06_29 7_58_13)" src="https://github.com/user-attachments/assets/6a9f422c-609b-405d-9217-deee32d5d671" />

### レシート各種画面（web）

<img width="420" height="315" alt="スクリーンショット02" src="https://github.com/user-attachments/assets/c3a84c39-d80d-4a21-a10c-c2afd245b3fb" />
<img width="420" height="315" alt="スクリーンショット06" src="https://github.com/user-attachments/assets/745b8961-52a8-4875-af95-e0eb781c0966" />

### 管理画面（Android/iPhone/web）

<img width="135" height="315" alt="Screenshot (2026_06_26 6_29_26)" src="https://github.com/user-attachments/assets/5ac35c22-4e67-451b-bf4e-2171fd585907" />
<img width="135" height="315" alt="Screenshot (2026_06_26 6_30_06)" src="https://github.com/user-attachments/assets/82440cd6-bb3c-4d08-ac83-363de7545e61" />
<img width="135" height="315" alt="Screenshot (2026_06_26 6_30_18)" src="https://github.com/user-attachments/assets/419bed48-e0a2-4f1e-8b03-464147e28ffa" />

### ログイン（Android/iPhone/web）

<img width="135" height="315" alt="Screenshot (2026_06_26 6_23_37)" src="https://github.com/user-attachments/assets/92b6ed2d-5247-4e81-b20a-0daff6a74639" />

---

## 主な機能

### AIレシート解析

Google Gemini APIを利用し、レシート画像から以下を自動抽出します。

* 購入日
* 店舗名
* 商品明細
* 金額

### 世帯単位の管理

* FamilyGroup単位でデータを管理
* 招待コードによるメンバー参加
* 世帯ごとのデータ分離

### 按分・精算

* 明細単位での負担割合設定
* 月次精算サマリー生成
* 世帯メンバー間の精算管理

### マスタ学習

* 店舗マスタ管理
* 商品マスタ管理
* AI解析結果の品質向上

---

## 技術スタック

| レイヤー             | 技術                                    |
| ---------------- | ------------------------------------- |
| Frontend         | Expo, React, React Native, TypeScript |
| Backend          | Node.js, Express, TypeScript          |
| Database         | PostgreSQL                            |
| ORM              | Prisma                                |
| Queue            | BullMQ, Redis                         |
| AI               | Google Gemini API                     |
| Authentication   | JWT, bcrypt, TOTP                     |
| Image Processing | sharp, multer                         |
| Infrastructure   | Docker Compose                        |
| CI/CD            | GitHub Actions                        |

---

## アーキテクチャ

```text
React Native (Expo)
        │
        ▼
 Express API
        │
 ┌──────┴──────┐
 ▼             ▼
PostgreSQL   BullMQ
                 │
                 ▼
            Gemini API
```

---

## 品質への取り組み

* TypeScriptによる型安全な実装
* PrismaによるDBスキーマ管理
* 単体テスト
* API結合テスト
* GitHub ActionsによるCI
* 設計書と実装の同期管理

---

## ドキュメント

プロジェクトには以下の設計資料を整備しています。

* アーキテクチャ設計
* ドメインモデル
* DB設計
* API仕様
* AIパイプライン設計
* テスト戦略
* 運用設計

詳細は `docs/` 配下を参照してください。

---

## リポジトリ構成

```text
receipt-ai-app/
├── backend/
├── frontend/
├── docs/
├── scripts/
├── docker-compose.yml
└── setup-env.sh
```

---

## 開発状況

現在も継続開発中です。

機能追加だけでなく、

* 保守性向上
* テスト強化
* ドキュメント整備
* 運用品質向上

を重視して開発を進めています。
