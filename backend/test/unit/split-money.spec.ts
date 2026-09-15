import { splitAmountEvenly } from '../../src/modules/expense/split-money';

const cents = (amount: number): number => Math.round(amount * 100);
const sumCents = (parts: number[]): number => parts.reduce((acc, part) => acc + cents(part), 0);

describe('splitAmountEvenly 均分单笔支出', () => {
  it('可整除时人均完全相等', () => {
    expect(splitAmountEvenly(100, 4)).toEqual([25, 25, 25, 25]);
    expect(splitAmountEvenly(0.1, 2)).toEqual([0.05, 0.05]);
  });

  it('不可整除时余数按每人一分补齐，分摊之和严格等于原金额', () => {
    const parts = splitAmountEvenly(100, 3);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
    expect(sumCents(parts)).toBe(10000);
  });

  it('余数分布在前若干名成员且每人最多差一分', () => {
    const parts = splitAmountEvenly(10.01, 6);
    expect(sumCents(parts)).toBe(1001);
    const centParts = parts.map(cents);
    expect(Math.max(...centParts) - Math.min(...centParts)).toBe(1);
    expect(parts.filter(p => p === 1.67).length).toBe(5);
    expect(parts.filter(p => p === 1.66).length).toBe(1);
  });

  it('最小货币单位金额也能正确分摊', () => {
    expect(splitAmountEvenly(0.01, 1)).toEqual([0.01]);
    const parts = splitAmountEvenly(0.03, 2);
    expect(sumCents(parts)).toBe(3);
  });

  it('零、负数、非有限数在算法层即被拒绝', () => {
    expect(() => splitAmountEvenly(0, 2)).toThrow('金额必须大于零');
    expect(() => splitAmountEvenly(-10, 2)).toThrow('金额必须大于零');
    expect(() => splitAmountEvenly(Infinity, 2)).toThrow();
    expect(() => splitAmountEvenly(NaN, 2)).toThrow();
  });

  it('亚分金额在算法层按分取整为零（真正的亚分拒绝由服务层 validateAmount 保证）', () => {
    // 0.001 元四舍五入为 0 分；服务层在调用前即以“不小于 0.01 元”拒绝，见 e2e 边界用例。
    expect(splitAmountEvenly(0.001, 1)).toEqual([0]);
  });

  it('参与人数为零、负数或非整数时被拒绝', () => {
    expect(() => splitAmountEvenly(100, 0)).toThrow('参与分摊成员不能为空');
    expect(() => splitAmountEvenly(100, -1)).toThrow('参与分摊成员不能为空');
    expect(() => splitAmountEvenly(100, 2.5)).toThrow('参与分摊成员不能为空');
  });
});
