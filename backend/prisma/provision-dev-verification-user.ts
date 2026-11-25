import bcrypt from 'bcrypt';
import fs from 'node:fs';
import { loadSecretFiles } from '../src/config/secretFiles';
import { ensureVerificationUserPrompts } from './verificationUserPrompts';

function readInput(): { inviteCode: string; password: string } {
  const [inviteCode, password, ...rest] = fs.readFileSync(0, 'utf8').split('\n');
  if (rest.length > 0 || inviteCode === undefined || password === undefined) {
    throw new Error('Verification-user provision input is invalid.');
  }
  return { inviteCode, password };
}

async function main() {
  loadSecretFiles();
  // root管理runtimeではDATABASE_URLを*_FILEから解決した後にだけPrismaを読み込む。
  const [{ devVerificationUserProvisionRepository }, { provisionDevVerificationUser }, { prisma }] = await Promise.all([
    import('../src/repositories/devVerificationUserProvisionRepository.js'),
    import('../src/services/devVerificationUserProvision.js'),
    import('../src/utils/prismaClient.js'),
  ]);
  try {
    const result = await provisionDevVerificationUser(
      readInput(),
      devVerificationUserProvisionRepository,
      (password) => bcrypt.hash(password, 12)
    );
    const member = await prisma.familyMember.findUniqueOrThrow({ where: { id: result.memberId }, select: { familyGroupId: true } });
    await prisma.$transaction((tx) => ensureVerificationUserPrompts(tx, member.familyGroupId));
    // memberIdは秘密値ではなく、緊急password再設定時の対象指定にだけ使う。
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('Verification-user provision failed without exposing credential values.');
  process.exitCode = 1;
});
