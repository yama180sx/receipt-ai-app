import { prisma } from '../utils/prismaClient';
import { getCleanText, normalizeStoreName } from '../utils/normalizer';
import type { ReceiptDuplicateCheckInput } from '../types/receipt';

export type DuplicateCheckResult = {
  duplicateSuspected: boolean;
  existingReceiptId?: number;
};

/** Gemini / フロントと同じ日付パース（saveParsedReceipt と整合） */
export function parseReceiptDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();

  const match = dateStr.match(/(\d{4})[-\/\.](\d{2})[-\/\.](\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const hh = match[4] ? parseInt(match[4], 10) : 0;
    const mm = match[5] ? parseInt(match[5], 10) : 0;
    const date = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (!isNaN(date.getTime())) return date;
  }

  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

/**
 * commit 前の read-only 重複候補判定（店名・日付・金額）。
 * saveParsedReceipt と同一ロジック。
 */
export async function checkDuplicateReceipt(
  familyGroupId: number,
  parsedData: ReceiptDuplicateCheckInput,
  imagePath?: string | null
): Promise<DuplicateCheckResult> {
  const normalizedImage = imagePath?.replace(/\\/g, '/');

  if (normalizedImage) {
    const existingByImage = await prisma.receipt.findFirst({
      where: { familyGroupId, imagePath: normalizedImage },
      select: { id: true },
    });
    if (existingByImage) {
      return { duplicateSuspected: false, existingReceiptId: existingByImage.id };
    }
  }

  const officialStoreName = await normalizeStoreName(parsedData.storeName || '', familyGroupId);
  const cleanStore = getCleanText(officialStoreName);
  const jstDate = parseReceiptDate(parsedData.purchaseDate || parsedData.date);
  const totalAmount = Math.round(Number(parsedData.totalAmount || 0));

  const duplicateWhere: {
    familyGroupId: number;
    totalAmount: number;
    date: { gte: Date; lte: Date };
  } = {
    familyGroupId,
    totalAmount,
    date: { gte: new Date(), lte: new Date() },
  };

  if (jstDate.getHours() === 0 && jstDate.getMinutes() === 0) {
    const startOfDay = new Date(jstDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(jstDate);
    endOfDay.setHours(23, 59, 59, 999);
    duplicateWhere.date = { gte: startOfDay, lte: endOfDay };
  } else {
    const margin = 1 * 60 * 1000;
    duplicateWhere.date = {
      gte: new Date(jstDate.getTime() - margin),
      lte: new Date(jstDate.getTime() + margin),
    };
  }

  const existing = await prisma.receipt.findFirst({
    where: duplicateWhere,
    select: { id: true, storeName: true },
  });

  if (existing && getCleanText(existing.storeName) === cleanStore) {
    return { duplicateSuspected: true, existingReceiptId: existing.id };
  }

  return { duplicateSuspected: false };
}
