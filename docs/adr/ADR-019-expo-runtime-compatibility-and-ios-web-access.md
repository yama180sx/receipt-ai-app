# ADR-019: Expoランタイム互換性とiPhoneのモバイルWeb入口

Status: Accepted

関連: Issue #158、[ADR-015](./ADR-015-vps-public-entry-and-expo-go-boundary.md)、[ADR-016](./ADR-016-android-development-build-distribution.md)

## 背景

RecAIptはExpo SDK 58を使用する。Expo Goはプロジェクトと同じSDKを含むランタイムでなければJavaScript bundleを起動できない。SDK不一致ではRecAIptのコードそのものが動かないため、アプリ内の更新通知や端末情報送信で回復させることはできない。

2026-11時点で、Apple App Store版Expo GoはSDK 54までに留まり、SDK 55以降のプロジェクトを実機iPhoneで開けない。iPhoneのExpo Go利用を維持するためにSDK 54へ戻すと、Web、Android development build、全Expo依存、React Nativeを含むプロジェクト全体を複数世代戻すことになる。これはiPhoneだけの互換性対応としては採用しない。

## 決定

- iPhoneの日常利用と通常の受入確認の正規入口はモバイルWebとする。Expo SDK 58は維持し、iPhoneのApp Store版Expo Goをサポート対象にしない。
- Androidのネイティブ実機検証はADR-016どおりdevelopment buildを標準とする。Android Expo Goは、対応SDK版を明示的に導入でき、かつ個別Issueの補助検証として承認した場合だけ使用する。
- Expo SDKの更新は自動化しない。管理担当者は月次の保守確認、Expoの新SDK公開、SDK不一致の報告、native依存またはapp設定を変更する予定のいずれかを契機に対応Issueを起票し、更新要否を判断する。更新する場合はSDK更新専用PRで1メジャーずつ行う。
- SDK更新専用PRでは、依存整合、最新expo-doctor、型・API・Web書き出しの検査、Android development buildの再buildと実機受入を行う。SDK、native依存、app設定を変更した場合はdevelopment buildを再配布する。
- 互換性の正本は`docs/mobile-access.md`のマトリクスとする。端末ID、Expoアカウント、VPN接続先、利用者データを収集・保存しない。JavaScriptが起動した後にも互換性テレメトリは送信しない。
- iPhoneでExpo GoのSDK不一致が表示された場合は、利用者はExpo Goを閉じてモバイルWebを開く。管理担当者はIssueに接続先・QR・端末識別子を記録せず、必要ならSDK更新Issueを起票する。
- iPhoneのネイティブ経路が将来必要になった場合は、EAS Go/TestFlightまたはdevelopment buildを別Issueで比較・承認する。Apple Developer Program、署名、配布、失効時の再配布をこの決定では導入しない。

## 結果

- iPhoneは無料かつSDK更新に左右されないモバイルWebを継続利用できる。
- Androidのネイティブ検証は、プロジェクト管理下のdevelopment buildで再現性を確保する。
- Expo GoのSDK不一致を、利用者データや端末識別子の収集で補おうとせず、起動前に回復可能なモバイルWeb経路で扱える。
- iPhoneネイティブ配布が必要になった時だけ、費用・署名・配布責任を含めた別の意思決定を行う。
