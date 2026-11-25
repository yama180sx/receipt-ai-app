import { getCleanText, normalizeStoreNames } from '../utils/normalizer';
import type { ReceiptDuplicateCheckInput } from '../types/receipt';
import { findDuplicateReceiptCandidates, findReceiptForDuplicate } from '../repositories/receiptRepository';

export type DuplicateCheckResult = {
  duplicateSuspected: boolean;
  existingReceiptId?: number;
};

/** 店舗マスタに未登録の場合も、確認済みのチェーン表記だけを統一する。支店名は残す。 */
export function comparableStoreName(value: string): string {
  return getCleanText(value).replace(/^ダイソー(?=\s|$)/, 'daiso');
}

export function unreviewedDuplicateId(candidates: Array<{ id: number }>, reviewedIds: number[]): number | null {
  const reviewed = new Set(reviewedIds);
  return candidates.find((candidate) => !reviewed.has(candidate.id))?.id ?? null;
}

/** 同じ金額・日時に加え、世帯別店舗マスタで正規化した店名も一致する候補を返す。 */
export async function findDuplicateCandidates(familyGroupId: number, parsedData: ReceiptDuplicateCheckInput, lookup = findDuplicateReceiptCandidates, normalize = normalizeStoreNames) {
  const rawDate = parsedData.purchaseDate || parsedData.date;
  const date = parseReceiptDate(rawDate);
  if (!date || !parsedData.storeName?.trim() || parsedData.totalAmount == null || !Number.isFinite(Number(parsedData.totalAmount))) return [];
  const dateOnly = !/\d{2}:\d{2}$/.test(rawDate!.trim());
  const start = new Date(date);
  const end = new Date(date);
  if (dateOnly) {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setTime(start.getTime() - 60_000);
    end.setTime(end.getTime() + 60_000);
  }
  const candidates = await lookup({ familyGroupId, totalAmount: Math.round(Number(parsedData.totalAmount)), date: { gte: start, lte: end } });
  if (candidates.length === 0) return [];
  const names = await normalize([parsedData.storeName, ...candidates.map((candidate) => candidate.storeName)], familyGroupId, true);
  const storeName = comparableStoreName(names[0]);
  if (!storeName) return [];
  const matches = candidates.map((candidate, index) => ({ candidate, store: comparableStoreName(names[index + 1]) }));
  return matches.filter((item) => item.store === storeName).slice(0, 51).map((item) => item.candidate);
}

/** Gemini / フロントと同じ日付パース（saveParsedReceipt と整合） */
export function parseReceiptDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  const match = dateStr.trim().match(/^(\d{4})[-\/\.](\d{2})[-\/\.](\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const hh = match[4] ? parseInt(match[4], 10) : 0;
    const mm = match[5] ? parseInt(match[5], 10) : 0;
    const date = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && date.getHours() === hh && date.getMinutes() === mm) return date;
  }

  return null;
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
    const existingByImage = await findReceiptForDuplicate(
      { familyGroupId, imagePath: normalizedImage },
      { id: true }
    );
    if (existingByImage) {
      return { duplicateSuspected: false, existingReceiptId: existingByImage.id };
    }
  }

  const [existing] = await findDuplicateCandidates(familyGroupId, parsedData);
  return existing ? { duplicateSuspected: true, existingReceiptId: existing.id } : { duplicateSuspected: false };
}
