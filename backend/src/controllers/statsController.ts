import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { getFamilyGroupId } from '../utils/context';

/**
 * [Issue #78] 月間精算ステータスの取得（暗黙的デフォルト対応）
 * 対象月の「各メンバーの立替額」「各メンバーの負担額」を算出し、その差額（精算額）を返します。
 */
export const getSettlementStatus = async (req: Request, res: Response, next: NextFunction) => {
  const familyGroupId = getFamilyGroupId();
  
  // 対象月 (YYYY-MM形式)。指定がなければ今月。
  const targetMonth = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  try {
    const startDate = new Date(`${targetMonth}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);

    // 1. 対象グループの全メンバーを取得して初期化
    const members = await prisma.familyMember.findMany({
      where: { familyGroupId },
      select: { id: true, name: true },
    });

    const stats: Record<number, { name: string; totalPaid: number; totalOwed: number; balance: number }> = {};
    members.forEach(m => {
      stats[m.id] = { name: m.name, totalPaid: 0, totalOwed: 0, balance: 0 };
    });

    // 2. 指定月・世帯のレシートを、明細とSplitを含めて取得
    const receipts = await prisma.receipt.findMany({
      where: {
        familyGroupId,
        date: { gte: startDate, lt: endDate },
      },
      include: {
        items: {
          include: { splits: true }
        }
      }
    });

    // 3. 集計ロジック（暗黙的デフォルト処理）
    receipts.forEach(receipt => {
      let receiptTotalPaid = 0; // そのレシートで立替えた総額

      receipt.items.forEach(item => {
        // 金額は整数（Int）丸めで計算
        const itemPriceInt = Math.round((item.price || 0) * (item.quantity || 1));
        receiptTotalPaid += itemPriceInt;

        if (item.splits.length > 0) {
          // パターン1: Splitが明示されている場合
          item.splits.forEach(split => {
            if (stats[split.familyMemberId]) {
              stats[split.familyMemberId].totalOwed += split.amount; // Split側の金額（Int）を足す
            }
          });
        } else {
          // パターン2: 暗黙的デフォルト (Splitがない＝レシート支払者が全額負担)
          if (stats[receipt.memberId]) {
            stats[receipt.memberId].totalOwed += itemPriceInt;
          }
        }
      });

      // 立替額（実際にレジで支払った額）をレシートのmemberIdに加算
      if (stats[receipt.memberId]) {
        stats[receipt.memberId].totalPaid += receiptTotalPaid;
      }
    });

    // 4. 最終的な精算額（balance）の計算
    // balance > 0: 払いすぎている（他者から受け取るべき）
    // balance < 0: 払いが足りない（他者に支払うべき）
    const result = Object.entries(stats).map(([id, s]) => {
      const balance = s.totalPaid - s.totalOwed;
      return {
        memberId: Number(id),
        name: s.name,
        totalPaid: s.totalPaid,
        totalOwed: s.totalOwed,
        balance: balance,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        members: result
      }
    });

  } catch (error) {
    next(error);
  }
};