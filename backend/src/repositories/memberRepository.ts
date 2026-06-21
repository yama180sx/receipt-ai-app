import { prisma } from '../utils/prismaClient';

export async function findFamilyGroupByInviteCode(inviteCode: string) {
  return prisma.familyGroup.findUnique({
    where: { inviteCode },
    select: { id: true, name: true },
  });
}

export async function findFamilyGroupByIdAndInviteCode(familyGroupId: number, inviteCode: string) {
  return prisma.familyGroup.findFirst({
    where: { id: familyGroupId, inviteCode },
    select: { id: true },
  });
}

export async function findMembersByFamilyGroupId(familyGroupId: number) {
  return prisma.familyMember.findMany({
    where: { familyGroupId },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
}

export async function findMemberByIdWithFamily(memberId: number) {
  return prisma.familyMember.findUnique({
    where: { id: memberId },
    include: { familyGroup: true },
  });
}

export async function findMemberById(memberId: number) {
  return prisma.familyMember.findUnique({ where: { id: memberId } });
}

export async function saveMemberTotpSetup(memberId: number, encryptedSecret: string) {
  return prisma.familyMember.update({
    where: { id: memberId },
    data: {
      totpSecret: encryptedSecret,
      totpEnabled: false,
      totpVerifiedAt: null,
    },
  });
}

export async function enableMemberTotp(memberId: number) {
  return prisma.familyMember.update({
    where: { id: memberId },
    data: {
      totpEnabled: true,
      totpVerifiedAt: new Date(),
    },
  });
}

export async function disableMemberTotp(memberId: number) {
  return prisma.familyMember.update({
    where: { id: memberId },
    data: {
      totpSecret: null,
      totpEnabled: false,
      totpVerifiedAt: null,
    },
  });
}
