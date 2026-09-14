/** 单个成员在某次结算中的净额：正数为应收，负数为应付。 */
export interface MemberBalance {
  userId: number;
  nickname: string;
  /** 已垫付合计。 */
  paid: number;
  /** 应承担合计。 */
  owed: number;
  /** 净额 = 已付 - 应付，>0 应收，<0 应付。 */
  net: number;
}

/** 一条最终收付款建议：from 向 to 支付 amount 元。 */
export interface Transfer {
  fromUserId: number;
  fromNickname: string;
  toUserId: number;
  toNickname: string;
  amount: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * 根据每人的净额结算出最简收付款路径（贪心配对：应付最多的人付给应收最多的人）。
 * 入参净额 net = 已付 - 应付。返回的转账列表执行后所有人净额归零。
 */
export function settleTransfers(balances: MemberBalance[]): Transfer[] {
  const debtors = balances
    .filter(item => round2(item.net) < 0)
    .map(item => ({ userId: item.userId, nickname: item.nickname, amount: -round2(item.net) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter(item => round2(item.net) > 0)
    .map(item => ({ userId: item.userId, nickname: item.nickname, amount: round2(item.net) }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > 0) {
      transfers.push({
        fromUserId: debtors[i].userId,
        fromNickname: debtors[i].nickname,
        toUserId: creditors[j].userId,
        toNickname: creditors[j].nickname,
        amount
      });
    }
    debtors[i].amount = round2(debtors[i].amount - amount);
    creditors[j].amount = round2(creditors[j].amount - amount);
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }
  return transfers;
}
