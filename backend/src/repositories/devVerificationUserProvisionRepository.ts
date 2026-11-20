import { globalPrisma } from '../utils/prismaClient';
import {
  devVerificationFamilyName,
  devVerificationMemberName,
  type DevVerificationFamily,
  type DevVerificationMember,
  type DevVerificationUserProvisionRepository,
} from '../services/devVerificationUserProvision';

export const devVerificationUserProvisionRepository: DevVerificationUserProvisionRepository = {
  async findVerificationFamilies(): Promise<DevVerificationFamily[]> {
    return globalPrisma.familyGroup.findMany({
      where: { name: devVerificationFamilyName },
      select: {
        id: true,
        name: true,
        members: { select: { id: true, name: true, role: true } },
      },
    });
  },

  async findFamilyByInviteCode(inviteCode): Promise<DevVerificationFamily | null> {
    return globalPrisma.familyGroup.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        name: true,
        members: { select: { id: true, name: true, role: true } },
      },
    });
  },

  async createFamilyWithUser({ inviteCode, passwordHash }): Promise<DevVerificationMember> {
    const family = await globalPrisma.familyGroup.create({
      data: {
        name: devVerificationFamilyName,
        inviteCode,
        members: {
          create: {
            name: devVerificationMemberName,
            role: 'USER',
            password_hash: passwordHash,
          },
        },
      },
      select: {
        members: { select: { id: true, name: true, role: true } },
      },
    });
    const member = family.members[0];
    if (!member) throw new Error('Verification-user provision did not create a member.');
    return member;
  },
};
