import { loadSecretFiles } from '../src/config/secretFiles';
import {
  parseTotpReencryptionArgs,
  totpReencryptionConfirmation,
} from '../src/services/totpReencryptionInput';

const usage = `Usage: npm run totp:reencrypt -- --operator OPERATOR --reason REASON --confirm ${totpReencryptionConfirmation}`;

async function main() {
  const input = parseTotpReencryptionArgs(process.argv.slice(2));
  // root管理runtimeでは秘密値を *_FILE で受け取る。Prisma・暗号処理より先に解決する。
  loadSecretFiles();
  const [{ reencryptLegacyTotpSecrets }, { globalPrisma }] = await Promise.all([
    import('../src/services/totpReencryptionService.js'),
    import('../src/utils/prismaClient.js'),
  ]);
  try {
    const result = await reencryptLegacyTotpSecrets(input);
    console.log(JSON.stringify(result));
  } finally {
    await globalPrisma.$disconnect();
  }
}

main().catch(() => {
  // DB／暗号化ライブラリの例外にも接続文字列等が含まれ得るため、生の本文は出さない。
  console.error('TOTP re-encryption failed. Check the values-free audit record and runtime diagnostics.');
  console.error(usage);
  process.exitCode = 1;
});
