// backend/scripts/generate-token.ts
import * as dotenv from 'dotenv';
dotenv.config();
import { generateToken } from '../src/utils/auth';

const testPayload = {
  memberId: 1, // あなた（管理者） [cite: 67]
  name: 'Hidenori Yamamoto'
};

const token = generateToken(testPayload);

console.log('--- 🔑 Test Token Generated ---');
console.log(token);
console.log('-------------------------------');
console.log('このトークンを Postman や Expo の Authorization ヘッダーで使用してください。');