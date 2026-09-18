import { loadSecretFiles } from '../src/config/secretFiles';
import { parseTotpReencryptionArgs, totpReencryptionConfirmation } from '../src/services/totpReencryptionInput';

const usage = `Usage: npm run totp:reencrypt -- --operator OPERATOR --reason REASON --confirm ${totpReencryptionConfirmation}`;

async function main() {
  const input = parseTotpReencryptionArgs(process.argv.slice(2));
  loadSecretFiles();
  const [{ reencryptLegacyTotpSecrets }, { globalPrisma }] = await Promise.all([
    import('../src/services/totpReencryptionService.js'),
    import('../src/utils/prismaClient.js'),
  ]);
  try {
    console.log(JSON.stringify(await reencryptLegacyTotpSecrets(input)));
  } finally {
    await globalPrisma.$disconnect();
  }
}

main().catch(() => {
  console.error('TOTP re-encryption failed. Check the values-free audit record and runtime diagnostics.');
  console.error(usage);
  process.exitCode = 1;
});
