import { generateToken } from '../src/utils/auth';

async function runTest() {
  try {
    // 1. テスト用トークンの生成 (anyで型エラーを回避しつつ必須項目を網羅)
    const token = generateToken({
      id: 1,              // isAdmin ミドルウェアで参照するID
      memberId: 1,        // 既存の互換性用
      name: 'Admin User',
      familyGroupId: 1    // エラーになっていた必須プロパティ
    } as any);

    console.log('🔑 トークン生成成功');

    // 2. Node.js標準の fetch を使ってコンテナ内部からAPIを実行
    const response = await fetch('http://localhost:3000/api/admin/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    console.log(`\n📡 APIステータス: ${response.status}`);
    console.log('📦 レスポンスデータ:');
    console.dir(data, { depth: null });

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

runTest();