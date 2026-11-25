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
): Promise<string> => (await normalizeStoreNames([rawName], familyGroupId))[0];

/** 同一世帯の複数店名を一度のマスタ取得で照合する。 */
type StoreLookup = (familyGroupId: number) => PromiseLike<Array<{ officialName: string; aliases: unknown }>>;

export const normalizeStoreNames = async (rawNames: string[], familyGroupId: number, failClosed = false, lookup: StoreLookup = (id) => prisma.store.findMany({ where: { familyGroupId: id } })): Promise<string[]> => {
  try {
    const stores = await lookup(familyGroupId);
    return rawNames.map((rawName) => {
    const cleanRawName = sanitize(rawName);
    if (!cleanRawName) return '';
    for (const store of stores) {
      const officialName = sanitize(store.officialName);
      const aliases = ((store.aliases as string[]) || []).map((a) => sanitize(a));

      if (aliases.some((alias) => alias && cleanRawName.includes(alias)) || (officialName && cleanRawName.includes(officialName))) {
        return store.officialName;
      }
    }
    return rawName;
    });
  } catch (error) {
    logger.error(`[NORMALIZE_STORE_ERROR] ${error}`);
    if (failClosed) throw error;
    return rawNames;
  }
};

export const getCleanText = (text: string | null | undefined): string => sanitize(text);
