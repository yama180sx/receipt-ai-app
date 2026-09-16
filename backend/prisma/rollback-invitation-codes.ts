import { readFile } from 'node:fs/promises';
import { loadSecretFiles } from '../src/config/secretFiles';
import { parseInvitationCodeRollbackManifest } from '../src/services/invitationCodeRotation';

const confirmation = 'restore-invitation-codes';
const usage = `Usage: npm run invitation-codes:rollback -- --rollback-input-file ABSOLUTE_PATH --confirm ${confirmation}`;

function parseArgs(args: string[]) {
  if (args.length !== 4 || args[0] !== '--rollback-input-file' || args[2] !== '--confirm' || args[3] !== confirmation || !args[1]?.startsWith('/')) {
    throw new Error('Rollback input is invalid.');
  }
  return { rollbackInputFile: args[1] };
}

async function main() {
  const input = parseArgs(process.argv.slice(2));
  loadSecretFiles();
  const [{ executeInvitationCodeRollback }, { prisma }] = await Promise.all([
    import('../src/services/invitationCodeRotationService.js'),
    import('../src/utils/prismaClient.js'),
  ]);
  try {
    const manifest = parseInvitationCodeRollbackManifest(JSON.parse(await readFile(input.rollbackInputFile, 'utf8')));
    const result = await executeInvitationCodeRollback(manifest);
    console.log(JSON.stringify({ rotationId: manifest.rotationId, status: 'SUCCEEDED', ...result }));
  } catch {
    console.error('Invitation-code rollback failed without exposing invitation-code values.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('Invitation-code rollback failed without exposing invitation-code values.');
  console.error(usage);
  process.exitCode = 1;
});
