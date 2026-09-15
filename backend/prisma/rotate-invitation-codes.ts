import { open, rm } from 'node:fs/promises';
import { loadSecretFiles } from '../src/config/secretFiles';
import { invitationCodeDeliveryManifest, invitationCodeRollbackManifest } from '../src/services/invitationCodeRotation';
import { parseInvitationCodeRotationArgs, invitationCodeRotationConfirmation } from '../src/services/invitationCodeRotationInput';

const usage = `Usage: npm run invitation-codes:rotate -- --rotation-id ROTATION_ID --delivery-output-file ABSOLUTE_PATH --rollback-output-file ABSOLUTE_PATH --confirm ${invitationCodeRotationConfirmation}`;

async function writeManifest(path: string, manifest: unknown) {
  const file = await open(path, 'wx', 0o600);
  try {
    await file.writeFile(`${JSON.stringify(manifest)}\n`, { encoding: 'utf8' });
  } finally {
    await file.close();
  }
}

async function main() {
  const input = parseInvitationCodeRotationArgs(process.argv.slice(2));
  loadSecretFiles();
  const [{ prepareInvitationCodeRotation, executeInvitationCodeRotation, recordInvitationCodeRotationFailure }, { prisma }] = await Promise.all([
    import('../src/services/invitationCodeRotationService.js'),
    import('../src/utils/prismaClient.js'),
  ]);

  let targetCount = 0;
  try {
    const plan = await prepareInvitationCodeRotation(input.rotationId);
    targetCount = plan.records.length;
    // DB更新前にroot helper回収用ファイルを作る。失敗時は更新せず、finallyで削除する。
    await writeManifest(input.deliveryOutputFile, invitationCodeDeliveryManifest(plan));
    await writeManifest(input.rollbackOutputFile, invitationCodeRollbackManifest(plan));
    const result = await executeInvitationCodeRotation(plan);
    console.log(JSON.stringify({ rotationId: input.rotationId, status: 'SUCCEEDED', ...result }));
  } catch {
    await recordInvitationCodeRotationFailure(input.rotationId, targetCount);
    await Promise.allSettled([rm(input.deliveryOutputFile, { force: true }), rm(input.rollbackOutputFile, { force: true })]);
    console.error('Invitation-code rotation failed without exposing invitation-code values.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('Invitation-code rotation failed without exposing invitation-code values.');
  console.error(usage);
  process.exitCode = 1;
});
