import { INestApplication } from '@nestjs/common';
import { createTestApp, resetDatabase } from '../helpers/app-factory';
import { buildTripScenario } from '../helpers/scenario';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

describe('共同支出：正常记账、回读与结算', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('成员新增支出后可在列表与单笔明细中回读', async () => {
    const { harness, tripId, members } = await buildTripScenario(app);

    const created = await harness.addExpense(members[0].token, tripId, {
      payerId: members[0].id,
      participantIds: members.map(m => m.id),
      amount: 100,
      description: '晚餐'
    });
    expect(created.status).toBe(201);
    expect(created.body.tripId).toBe(tripId);
    expect(created.body.description).toBe('晚餐');

    const list = await harness.listExpenses(members[1].token, tripId);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].amount).toBe(100);

    const detail = await harness.expenseDetail(members[2].token, tripId, created.body.id);
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(created.body.id);
    expect(detail.body.participants.map((p: { userId: number }) => p.userId).sort()).toEqual(
      members.map(m => m.id).sort((a, b) => a - b)
    );
  });

  it('多人分摊不可整除时余数按分补齐，分摊之和严格等于金额', async () => {
    const { harness, tripId, members } = await buildTripScenario(app);

    const created = await harness.addExpense(members[0].token, tripId, {
      payerId: members[0].id,
      participantIds: members.map(m => m.id),
      amount: 100
    });
    const shares = created.body.participants.map((p: { shareAmount: number }) => p.shareAmount);
    expect(shares).toEqual([33.34, 33.33, 33.33]);
    expect(round2(shares.reduce((a: number, b: number) => a + b, 0))).toBe(100);
  });

  it('结算正确汇总每人已付、应付、净额，并给出最简收付款建议', async () => {
    const { harness, tripId, members } = await buildTripScenario(app);
    const [a, b, c] = members;

    // A 垫付 100 三人分；B 垫付 30 由 B、C 两人分
    await harness.addExpense(a.token, tripId, { payerId: a.id, participantIds: [a.id, b.id, c.id], amount: 100, description: '晚餐' });
    await harness.addExpense(b.token, tripId, { payerId: b.id, participantIds: [b.id, c.id], amount: 30, description: '打车' });

    const result = await harness.settlement(a.token, tripId);
    expect(result.status).toBe(200);
    expect(result.body.currency).toBe('CNY');
    expect(round2(result.body.totalAmount)).toBe(130);

    const byId = new Map<number, any>(result.body.perMember.map((m: any) => [m.userId, m]));
    expect(round2(byId.get(a.id).paid)).toBe(100);
    expect(round2(byId.get(a.id).owed)).toBe(33.34);
    expect(round2(byId.get(a.id).net)).toBe(66.66);

    expect(round2(byId.get(b.id).paid)).toBe(30);
    expect(round2(byId.get(b.id).owed)).toBe(48.33);
    expect(round2(byId.get(b.id).net)).toBe(-18.33);

    expect(round2(byId.get(c.id).paid)).toBe(0);
    expect(round2(byId.get(c.id).owed)).toBe(48.33);
    expect(round2(byId.get(c.id).net)).toBe(-48.33);

    // 全员净额之和恒为零
    expect(round2(result.body.perMember.reduce((s: number, m: any) => s + m.net, 0))).toBe(0);

    // 最简收付款：共两笔，A 是唯一收款方且共收 66.66
    expect(result.body.transfers).toHaveLength(2);
    const aReceives = round2(
      result.body.transfers.filter((t: any) => t.toUserId === a.id).reduce((s: number, t: any) => s + t.amount, 0)
    );
    expect(aReceives).toBe(66.66);
  });

  it('没有任何支出时结算为空且不产生收付款', async () => {
    const { harness, tripId, members } = await buildTripScenario(app);
    const result = await harness.settlement(members[0].token, tripId);
    expect(result.body.totalAmount).toBe(0);
    expect(result.body.transfers).toEqual([]);
  });

  it('可连续记账多笔并全部回读', async () => {
    const { harness, tripId, members } = await buildTripScenario(app);
    for (const amount of [12.5, 30, 0.01]) {
      await harness.addExpense(members[0].token, tripId, {
        payerId: members[0].id,
        participantIds: [members[0].id],
        amount
      });
    }
    const list = await harness.listExpenses(members[0].token, tripId);
    expect(list.body.map((e: any) => e.amount)).toEqual([12.5, 30, 0.01]);
  });
});
