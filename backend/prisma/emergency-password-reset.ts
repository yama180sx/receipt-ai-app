import bcrypt from 'bcrypt';
import fs from 'node:fs';
import { createPrismaClient } from '../src/utils/prismaFactory';

const [memberIdRaw, resetId] = process.argv.slice(2);
const memberId = Number(memberIdRaw);
const password = fs.readFileSync(0, 'utf8');
if (!Number.isSafeInteger(memberId) || memberId < 1 || !/^reset-[0-9]{14}-[0-9a-f]{16}$/.test(resetId)) process.exit(20);
if (password.length < 15 || password.length > 128) process.exit(21);

const prisma = createPrismaClient();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const member = await tx.familyMember.findUnique({ where: { id: memberId }, select: { familyGroupId: true, authVersion: true } });
    if (!member) return null;
    const authVersion = member.authVersion + 1;
    await tx.familyMember.update({ where: { id: memberId }, data: { password_hash: passwordHash, authVersion } });
    await tx.emergencyPasswordResetAudit.create({ data: { resetId, memberId, familyGroupId: member.familyGroupId, authVersion } });
    return true;
  });
  if (!result) process.exitCode = 23;
} catch {
  process.exitCode = 24;
} finally {
  await prisma.$disconnect();
}
