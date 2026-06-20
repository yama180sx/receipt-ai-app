import { prisma } from './prismaClient';
import logger from './logger';

const sanitize = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * 店舗名の正規化（世帯スコープ — Issue #93-4）
 */
export const normalizeStoreName = async (
  rawName: string,
  familyGroupId: number
): Promise<string> => {
  try {
    const cleanRawName = sanitize(rawName);
    if (!cleanRawName) return '';

    const stores = await prisma.store.findMany({ where: { familyGroupId } });

    for (const store of stores) {
      const officialName = sanitize(store.officialName);
      const aliases = ((store.aliases as string[]) || []).map((a) => sanitize(a));

      if (aliases.some((alias) => cleanRawName.includes(alias)) || cleanRawName.includes(officialName)) {
        return store.officialName;
      }
    }
    return rawName;
  } catch (error) {
    logger.error(`[NORMALIZE_STORE_ERROR] ${error}`);
    return rawName;
  }
};

export const getCleanText = (text: string | null | undefined): string => sanitize(text);
