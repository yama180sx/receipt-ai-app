import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { getFamilyGroupId } from '../utils/context';
import {
  getCurrentYearMonthLocal,
  getLocalMonthDateRange,
  normalizeYearMonth,
} from '../utils/yearMonth';

/**
 * [Issue #78 / #81] 月間精算ステータスの取得（暗黙的デフォルト対応 ＆ 送金実績の反映）
 * 対象月の「各メンバーの立替額」「各メンバーの負担額」を算出し、
 * さらに同月の送金実績（SettlementTransfer）を加味した最終的な「精算残額」を返します。
 */
export const getSettlementStatus = async (req: Request, res: Response, next: NextFunction) => {
  const familyGroupId = getFamilyGroupId();
  
  const queryMonth = normalizeYearMonth(req.query.month as string);
  const targetMonth = queryMonth ?? getCurrentYearMonthLocal();
  const { start: startDate, end: endDate } = getLocalMonthDateRange(targetMonth);

  try {

    // 1. 対象グループの全メンバーを取得して初期化
    const members = await prisma.familyMember.findMany({
      where: { familyGroupId },
      select: { id: true, name: true },
    });

    const stats: Record<number, { 
      name: string; 
      totalPaid: number; 
      totalOwed: number; 
      baseBalance: number; // レシートベースの本来の差額
      transferredOut: number; // 他者へ送金した額
      transferredIn: number; // 他者から受け取った額
      balance: number; // 最終的な残額（baseBalance + transferredOut - transferredIn）
    }> = {};
    
    members.forEach(m => {
      stats[m.id] = { name: m.name, totalPaid: 0, totalOwed: 0, baseBalance: 0, transferredOut: 0, transferredIn: 0, balance: 0 };
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

    // 3. レシートと明細に基づく基本集計（暗黙的デフォルト処理）
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

    // ★ [Issue #81] 4. 送金実績（SettlementTransfer）の取得と集計
    // 対象月の全送金履歴（familyGroupIdに属するメンバー間の送金）
    const transfers = await prisma.settlementTransfer.findMany({
      where: {
        month: targetMonth,
        sender: { familyGroupId }, // テナント検証
      },
      select: {
        id: true,
        fromMemberId: true,
        toMemberId: true,
        amount: true,
        settledAt: true,
      }
    });

    transfers.forEach(t => {
      if (stats[t.fromMemberId]) stats[t.fromMemberId].transferredOut += t.amount;
      if (stats[t.toMemberId]) stats[t.toMemberId].transferredIn += t.amount;
    });

    // 5. 最終的な精算額（balance）の計算
    const result = Object.entries(stats).map(([id, s]) => {
      // 本来のレシート差額 (立替額 - 負担額)
      // > 0: 払いすぎ (受け取る権利)
      // < 0: 払いが足りない (支払う義務)
      s.baseBalance = s.totalPaid - s.totalOwed;

      // 最終残額の計算
      // 支払う義務(<0)がある人は、送金(transferredOut)すると義務が減る(+方向へ)
      // 受け取る権利(>0)がある人は、受領(transferredIn)すると権利が減る(-方向へ)
      s.balance = s.baseBalance + s.transferredOut - s.transferredIn;

      return {
        memberId: Number(id),
        name: s.name,
        totalPaid: s.totalPaid,
        totalOwed: s.totalOwed,
        baseBalance: s.baseBalance,
        transferredOut: s.transferredOut,
        transferredIn: s.transferredIn,
        balance: s.balance,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        members: result,
        transfers // 履歴表示用に生の送金データも返す
      }
    });

  } catch (error) {
    next(error);
  }
};


/**
 * ★ [Issue #81] 送金記録（締め処理の実績）の登録
 * POST /api/stats/settlement/transfers
 */
export const addSettlementTransfer = async (req: Request, res: Response, next: NextFunction) => {
  const familyGroupId = getFamilyGroupId();
  
  const { month, fromMemberId, toMemberId, amount } = req.body;
  const normalizedMonth = normalizeYearMonth(month);
  const fromId = Number(fromMemberId);
  const toId = Number(toMemberId);
  const transferAmount = Math.round(Number(amount));

  if (!normalizedMonth || !fromMemberId || !toMemberId || !Number.isFinite(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ success: false, message: '必要なパラメータが不足しているか、金額が不正です。' });
  }

  if (fromId === toId) {
    return res.status(400).json({ success: false, message: '自分自身への送金は登録できません。' });
  }

  try {
    // 送信者・受信者が同一世帯に属しているか（テナント検証）
    const validMembers = await prisma.familyMember.findMany({
      where: {
        id: { in: [fromId, toId] },
        familyGroupId
      }
    });

    if (validMembers.length !== 2) {
      return res.status(403).json({ success: false, message: '無効なユーザー指定、または権限がありません。' });
    }

    // 送金記録の作成
    const newTransfer = await prisma.settlementTransfer.create({
      data: {
        month: normalizedMonth,
        fromMemberId: fromId,
        toMemberId: toId,
        amount: transferAmount,
        // settledAt は default(now()) で自動採番
      }
    });

    res.status(201).json({
      success: true,
      data: newTransfer
    });

  } catch (error) {
    next(error);
  }
};