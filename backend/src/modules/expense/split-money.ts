/**
 * 共同支出均分算法（单一职责：只负责把一笔金额按人数等分并处理余数）。
 * 金额统一按分（整数）计算，规避浮点误差；无法整除时，余数按每人 1 分
 * 依次补给靠前的成员，保证各人分摊之和严格等于原金额。
 */
export function splitAmountEvenly(amount: number, participantCount: number): number[] {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('金额必须大于零');
  }
  if (!Number.isInteger(participantCount) || participantCount <= 0) {
    throw new Error('参与分摊成员不能为空');
  }
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / participantCount);
  let remainder = totalCents - base * participantCount;
  return Array.from({ length: participantCount }, () => {
    const cents = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return cents / 100;
  });
}
