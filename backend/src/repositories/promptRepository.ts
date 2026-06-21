import { prisma } from '../utils/prismaClient';

export async function findPromptTemplatesByFamilyGroup(familyGroupId: number) {
  return prisma.promptTemplate.findMany({
    where: { familyGroupId },
    orderBy: [{ key: 'asc' }, { isActive: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function findAllPromptTemplatesForSync(familyGroupId: number) {
  return prisma.promptTemplate.findMany({
    where: { familyGroupId },
    orderBy: { id: 'asc' },
  });
}

export async function findActivePromptTemplateByKey(key: string) {
  return prisma.promptTemplate.findFirst({
    where: { key, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function deactivatePromptTemplatesByKey(familyGroupId: number, key: string) {
  return prisma.promptTemplate.updateMany({
    where: { key, familyGroupId },
    data: { isActive: false },
  });
}

export async function createPromptTemplateRecord(data: {
  key: string;
  name?: string;
  description?: string;
  systemPrompt: string;
  domainHints?: unknown;
  isActive?: boolean;
  version: number;
  familyGroupId: number;
}) {
  return prisma.promptTemplate.create({ data });
}

export async function findPromptTemplateById(familyGroupId: number, id: number) {
  return prisma.promptTemplate.findFirst({
    where: { id, familyGroupId },
  });
}

export async function updatePromptTemplateRecord(
  id: number,
  data: {
    name?: string;
    description?: string;
    systemPrompt?: string;
    domainHints?: unknown;
    version?: { increment: number };
  }
) {
  return prisma.promptTemplate.update({ where: { id }, data });
}

export async function activatePromptTemplateInTransaction(
  familyGroupId: number,
  targetId: number,
  key: string
) {
  return prisma.$transaction([
    prisma.promptTemplate.updateMany({
      where: { key, familyGroupId },
      data: { isActive: false },
    }),
    prisma.promptTemplate.update({
      where: { id: targetId },
      data: { isActive: true },
    }),
  ]);
}

export async function deletePromptTemplateById(id: number) {
  return prisma.promptTemplate.delete({ where: { id } });
}
