import { globalPrisma } from '../utils/prismaClient';
import {
  devVerificationFamilyName,
  devVerificationMemberName,
  type DevVerificationFamily,
  type DevVerificationUserProvisionRepository,
} from '../services/devVerificationUserProvision';

export const devVerificationUserProvisionRepository: DevVerificationUserProvisionRepository = {
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

  async createFamilyWithUser({ inviteCode, passwordHash }): Promise<void> {
    await globalPrisma.familyGroup.create({
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
    });
  },
};
