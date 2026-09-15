import { MemberBalance, settleTransfers } from '../../src/modules/expense/transfer';

const make = (id: number, nickname: string, paid: number, owed: number): MemberBalance => ({
  userId: id,
  nickname,
  paid,
  owed,
  net: Math.round((paid - owed) * 100) / 100
});

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

describe('settleTransfers 最终收付建议', () => {
  it('一人垫付、多人应付时给出最简转账路径，执行后全部结清', () => {
    // A 垫付 120，A/B/C/D 各摊 30：A 净 +90，其余各 -30
    const balances = [make(1, 'A', 120, 30), make(2, 'B', 0, 30), make(3, 'C', 0, 30), make(4, 'D', 0, 30)];
    const transfers = settleTransfers(balances);

    expect(transfers).toHaveLength(3);
    expect(transfers.every(t => t.toUserId === 1)).toBe(true);
    expect(round2(transfers.reduce((sum, t) => sum + t.amount, 0))).toBe(90);
    expect(transfers.map(t => t.amount).sort((a, b) => a - b)).toEqual([30, 30, 30]);
  });

  it('存在中间净额时通过配对实现多角债务的最简清偿', () => {
    // A 净 +60，B 净 -40，C 净 -20
    const balances = [make(1, 'A', 60, 0), make(2, 'B', 0, 40), make(3, 'C', 0, 20)];
    const transfers = settleTransfers(balances);
    expect(round2(transfers.reduce((s, t) => s + t.amount, 0))).toBe(60);
    // 每位债务人付出恰好等于其净负债
    const byDebtor = new Map<number, number>();
    transfers.forEach(t => byDebtor.set(t.fromUserId, round2((byDebtor.get(t.fromUserId) ?? 0) + t.amount)));
    expect(byDebtor.get(2)).toBe(40);
    expect(byDebtor.get(3)).toBe(20);
  });

  it('所有人净额为零时返回空转账列表', () => {
    const balances = [make(1, 'A', 10, 10), make(2, 'B', 20, 20)];
    expect(settleTransfers(balances)).toEqual([]);
  });

  it('分摊余数导致的 0.01 级差额也能被完全清偿', () => {
    // 100 元三人分：A 垫付，分摊 33.34/33.33/33.33；A 净 66.66，B/C 各 -33.33
    const balances = [make(1, 'A', 100, 33.34), make(2, 'B', 0, 33.33), make(3, 'C', 0, 33.33)];
    const transfers = settleTransfers(balances);
    expect(round2(transfers.reduce((s, t) => s + t.amount, 0))).toBe(66.66);
    const aReceives = round2(transfers.filter(t => t.toUserId === 1).reduce((s, t) => s + t.amount, 0));
    expect(aReceives).toBe(66.66);
  });
});
