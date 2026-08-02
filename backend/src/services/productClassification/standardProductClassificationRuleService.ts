import { AppError } from '../../utils/appError';
import { getCleanText } from '../../utils/normalizer';
import { runInTransaction } from '../../utils/prismaTransaction';
import {
  createStandardProductClassificationRuleInTx,
  deactivateStandardProductClassificationRuleInTx,
  findStandardProductClassificationRules,
  findStandardRulePreviewItems,
  updateStandardProductClassificationRuleInTx,
} from '../../repositories/productClassificationRepository';

const unsafeKeywords = new Set(['茶', '水', '炭酸', '飲料', 'ポテト']);

export type StandardRuleInput = { keyword: string; productTypeId: number; priority: number; reason: string };

function normalizeRuleInput(input: StandardRuleInput) {
  const normalizedKeyword = getCleanText(input.keyword);
  if (normalizedKeyword.length < 2 || unsafeKeywords.has(normalizedKeyword)) {
    throw new AppError('UnsafeStandardClassificationKeyword', 400);
  }
  return { ...input, normalizedKeyword };
}

export async function listStandardProductClassificationRules(includeInactive: boolean) {
  return findStandardProductClassificationRules(includeInactive);
}

export async function previewStandardProductClassificationRule(familyGroupId: number, keyword: string) {
  const normalizedKeyword = normalizeRuleInput({ keyword, productTypeId: 1, priority: 1, reason: 'preview' }).normalizedKeyword;
  const { matchedCount, items } = await findStandardRulePreviewItems(familyGroupId, normalizedKeyword);
  return { normalizedKeyword, matchedCount, items };
}

export async function createStandardProductClassificationRule(actorMemberId: number, input: StandardRuleInput) {
  const normalized = normalizeRuleInput(input);
  const rule = await runInTransaction((tx) => createStandardProductClassificationRuleInTx(tx, { ...normalized, actorMemberId }));
  if (!rule) throw new AppError('ProductTypeNotFound', 404);
  return rule;
}

export async function updateStandardProductClassificationRule(id: number, actorMemberId: number, input: StandardRuleInput) {
  const normalized = normalizeRuleInput(input);
  const rule = await runInTransaction((tx) => updateStandardProductClassificationRuleInTx(tx, id, { ...normalized, actorMemberId }));
  if (!rule) throw new AppError('StandardClassificationRuleNotFound', 404);
  return rule;
}

export async function deactivateStandardProductClassificationRule(id: number, actorMemberId: number, reason: string) {
  const rule = await runInTransaction((tx) => deactivateStandardProductClassificationRuleInTx(tx, id, actorMemberId, reason));
  if (!rule) throw new AppError('StandardClassificationRuleNotFound', 404);
  return rule;
}
