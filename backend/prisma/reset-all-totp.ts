import { loadSecretFiles } from '../src/config/secretFiles';

const confirmation = 'reset-all-totp';
const usage = `Usage: npm run totp:reset-all -- --confirm ${confirmation}`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--confirm' || args[1] !== confirmation) {
    throw new Error('confirmation is invalid');
  }

  loadSecretFiles();
  const { globalPrisma } = await import('../src/utils/prismaClient.js');
  try {
    const result = await globalPrisma.familyMember.updateMany({
      where: { OR: [{ totpSecret: { not: null } }, { totpEnabled: true }, { totpKeyVersion: { not: null } }] },
      data: { totpSecret: null, totpKeyVersion: null, totpEnabled: false, totpVerifiedAt: null },
    });
    console.log(JSON.stringify({ status: 'SUCCEEDED', resetCount: result.count }));
  } finally {
    await globalPrisma.$disconnect();
  }
}

main().catch(() => {
  console.error('TOTP reset failed without exposing member or secret values.');
  console.error(usage);
  process.exitCode = 1;
});
