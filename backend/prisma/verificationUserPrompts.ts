import { Prisma } from '#prisma';
import { loadInitialData } from './initialData';

type PromptClient = { promptTemplate: {
  findFirst(args: { where: { familyGroupId: number; key: string }; select: { id: true } }): PromiseLike<{ id: number } | null>;
  create(args: { data: { familyGroupId: number; key: string; name?: string; description?: string; systemPrompt: string; domainHints: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput; isActive: boolean; version: number } }): PromiseLike<unknown>;
} };

export async function ensureVerificationUserPrompts(tx: PromptClient, familyGroupId: number): Promise<void> {
  for (const prompt of loadInitialData().households.promptTemplates) {
    const existing = await tx.promptTemplate.findFirst({ where: { familyGroupId, key: prompt.key }, select: { id: true } });
    if (!existing) {
      await tx.promptTemplate.create({ data: { ...prompt, domainHints: prompt.domainHints ?? Prisma.JsonNull, familyGroupId } });
    }
  }
}
